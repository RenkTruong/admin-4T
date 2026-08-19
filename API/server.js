require('dotenv').config();
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { getPool, getValue, setValue } = require('./db');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_KEYS = new Set(['users', 'orders_v2', 'websiteVisitsCount', 'websiteVisitsLog']);
const STATIC_FILES = new Set(['customer.html', 'admin.html', '4T.jpg', 'favicon.svg']);
const FALLBACKS = { users: [], orders_v2: [], websiteVisitsCount: 0, websiteVisitsLog: [] };

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Token',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  });
  response.end(JSON.stringify(body));
}

function isAuthorized(request) {
  const expected = process.env.SYNC_TOKEN;
  return !expected || request.headers['x-sync-token'] === expected;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) request.destroy(new Error('Payload too large'));
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); }
    });
    request.on('error', reject);
  });
}

async function readKeys(keys) {
  const result = {};
  for (const key of keys) result[key] = await getValue(key, FALLBACKS[key]);
  return result;
}

function serveStatic(response, pathname) {
  const filename = pathname === '/' ? 'customer.html' : pathname.slice(1);
  if (!STATIC_FILES.has(filename)) return sendJson(response, 404, { error: 'Not found' });
  const file = path.join(__dirname, filename);
  const contentType = filename.endsWith('.html') ? 'text/html; charset=utf-8' : filename.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
  response.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(file).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});

  try {
    if (url.pathname === '/api/health' && request.method === 'GET') {
      await getPool();
      return sendJson(response, 200, { ok: true, database: process.env.DB_TYPE || 'postgres' });
    }

    if (url.pathname === '/api/sync' && request.method === 'GET') {
      const requestedKeys = (url.searchParams.get('keys') || '').split(',').filter(key => PUBLIC_KEYS.has(key));
      return sendJson(response, 200, await readKeys(requestedKeys.length ? requestedKeys : [...PUBLIC_KEYS]));
    }

    if (url.pathname === '/api/sync' && request.method === 'PUT') {
      if (!isAuthorized(request)) return sendJson(response, 401, { error: 'Invalid sync token' });
      const payload = await readBody(request);
      for (const [key, value] of Object.entries(payload)) if (PUBLIC_KEYS.has(key)) await setValue(key, value);
      return sendJson(response, 200, { ok: true });
    }

    return serveStatic(response, url.pathname);
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, { error: 'Database unavailable' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`4T database sync server running at http://localhost:${PORT}`);
});
