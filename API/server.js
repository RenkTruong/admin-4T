require('dotenv').config();
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { getPool, getValue, setValue } = require('./db');

const DEFAULT_PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_KEYS = new Set(['users', 'orders_v2', 'websiteVisitsCount', 'websiteVisitsLog', 'adminChats', '4t_local_chat']);
const STATIC_FILES = new Set(['customer.html', 'admin.html', '4T.jpg', 'favicon.svg']);
const FALLBACKS = { users: [], orders_v2: [], websiteVisitsCount: 0, websiteVisitsLog: [], adminChats: {}, '4t_local_chat': [] };

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

const DEFAULT_ADMIN = {
  id: 1,
  username: 'admin4T',
  full_name: 'Quản trị hệ thống',
  fullname: 'Quản trị hệ thống',
  title: 'Super Admin',
  is_locked: false,
  permissions: ['manage_admins','orders','create_order','view_order_history','customer_chat','customer_new_password','customer_lock','customer_delete','footer_stats','export']
};
const VALID_ADMIN_PASSWORDS = new Set(['123', 'admin123']);

function formatCurrency(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString('vi-VN')} VNĐ`;
}

function buildInvoiceHtml(order = {}) {
  const safeOrder = {
    id: order.id || '4T-UNKNOWN',
    customerName: order.customerName || order.name || 'Khách vãng lai',
    phone: order.phone || 'Chưa cập nhật',
    service: order.service || 'Giặt sấy',
    weight: Number(order.weight || 0),
    address: order.address || 'Chưa cập nhật địa chỉ',
    paymentMethod: order.paymentMethod || 'Tiền mặt',
    deliveryService: order.deliveryService || 'Nhận tại cửa hàng',
    status: order.status || 'Chờ tiếp nhận',
    time: order.time || new Date().toLocaleString('vi-VN'),
    total: Number(order.total || 0),
  };

  const baseAmount = Math.max(safeOrder.weight * 15000, 0);
  const deliveryFee = (safeOrder.deliveryService || '').toLowerCase().includes('giao') && !(safeOrder.deliveryService || '').toLowerCase().includes('tại cửa hàng') ? 20000 : 0;
  const discount = 0;
  const totalAmount = Math.max(safeOrder.total || (baseAmount + deliveryFee - discount), 0);

  return `
    <div style="max-width: 760px; margin: 0 auto; background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%); border:1px solid #dbeafe; border-radius:18px; box-shadow:0 10px 22px rgba(37,99,235,0.08); padding:26px; color:#111827; font-family:Arial, sans-serif; text-align:left;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:18px; border-bottom:2px solid #0f172a; padding-bottom:14px;">
        <div>
          <div style="font-size: 2rem; font-weight:900; letter-spacing:0.08em; color:#0f172a;">4T</div>
          <div style="font-size: 0.82rem; color:#475569; font-weight:700;">LAUNDRY & HOME CARE</div>
          <div style="font-size: 0.75rem; color:#64748b; margin-top: 4px;">123 Liên Khu 4-5, Phường Bình Tân, TP.HCM</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size: 0.75rem; color:#64748b; text-transform:uppercase; letter-spacing:0.08em;">Invoice No.</div>
          <div style="font-weight:800; font-size:1.4rem; color:#0f172a;">${safeOrder.id}</div>
          <div style="font-size:0.74rem; color:#64748b; margin-top:4px;">${safeOrder.time}</div>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%); color:white; border-radius:12px; padding:12px 16px; margin-bottom:18px;">
        <div style="font-size:0.8rem; letter-spacing:0.08em; text-transform:uppercase; opacity:0.9;">Hóa đơn thanh toán</div>
        <div style="font-size:1rem; font-weight:800;">${safeOrder.status}</div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 18px; margin-bottom: 18px; font-size:0.9rem; color:#1f2937;">
        <div><strong>Khách hàng:</strong> ${safeOrder.customerName}</div>
        <div><strong>Số điện thoại:</strong> ${safeOrder.phone}</div>
        <div><strong>Dịch vụ:</strong> ${safeOrder.service}</div>
        <div><strong>Khối lượng:</strong> ${safeOrder.weight.toLocaleString()} kg</div>
        <div style="grid-column: 1 / -1;"><strong>Địa chỉ:</strong> ${safeOrder.address}</div>
        <div><strong>Thanh toán:</strong> ${safeOrder.paymentMethod}</div>
        <div><strong>Giao nhận:</strong> ${safeOrder.deliveryService}</div>
        <div><strong>Trạng thái:</strong> ${safeOrder.status}</div>
        <div><strong>Nhân viên:</strong> Admin</div>
      </div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:0.92rem;">
        <thead>
          <tr>
            <th style="padding:12px 10px; text-align:left; border:1px solid #e2e8f0; background:#f8fafc;">Mô tả</th>
            <th style="padding:12px 10px; text-align:right; border:1px solid #e2e8f0; background:#f8fafc;">Đơn giá</th>
            <th style="padding:12px 10px; text-align:right; border:1px solid #e2e8f0; background:#f8fafc;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:12px 10px; border:1px solid #e2e8f0;">${safeOrder.service}</td>
            <td style="padding:12px 10px; border:1px solid #e2e8f0; text-align:right;">${formatCurrency(baseAmount)}</td>
            <td style="padding:12px 10px; border:1px solid #e2e8f0; text-align:right;">${formatCurrency(baseAmount)}</td>
          </tr>
          <tr>
            <td style="padding:12px 10px; border:1px solid #e2e8f0;">Phí giao nhận</td>
            <td style="padding:12px 10px; border:1px solid #e2e8f0; text-align:right;">${formatCurrency(deliveryFee)}</td>
            <td style="padding:12px 10px; border:1px solid #e2e8f0; text-align:right;">${formatCurrency(deliveryFee)}</td>
          </tr>
        </tbody>
      </table>
      <div style="border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc; padding:14px 16px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; color:#334155; margin-bottom:8px; font-size:0.9rem;">
          <span>Tạm tính</span>
          <strong>${formatCurrency(baseAmount)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; color:#334155; margin-bottom:8px; font-size:0.9rem;">
          <span>Phí giao nhận</span>
          <strong>${formatCurrency(deliveryFee)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; color:#334155; margin-bottom:8px; font-size:0.9rem;">
          <span>Giảm giá</span>
          <strong>-${formatCurrency(discount)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; border-top:1px solid #cbd5e1; padding-top:12px;">
          <span style="font-size:1rem; font-weight:800; color:#0f172a;">Tổng thanh toán</span>
          <span style="font-size:1.6rem; font-weight:900; color:#2563eb;">${formatCurrency(totalAmount)}</span>
        </div>
      </div>
      <div style="margin-top:20px; text-align:center; font-size:0.8rem; color:#64748b;">Cảm ơn quý khách đã sử dụng dịch vụ của 4T Laundry.</div>
    </div>
  `;
}

function serveStatic(response, pathname) {
  const filename = pathname === '/' ? 'customer.html' : pathname.slice(1);
  if (!STATIC_FILES.has(filename)) return sendJson(response, 404, { error: 'Not found' });
  const file = path.join(__dirname, filename);
  const contentType = filename.endsWith('.html') ? 'text/html; charset=utf-8' : filename.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
  response.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(file).pipe(response);
}

function startServer(port) {
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

      if (url.pathname === '/api/admin/login' && request.method === 'POST') {
        const payload = await readBody(request).catch(() => ({}));
        const { username, password } = payload;
        if (!username || !password) return sendJson(response, 400, { message: 'Thiếu username hoặc password' });
        if (username !== DEFAULT_ADMIN.username || !VALID_ADMIN_PASSWORDS.has(String(password))) {
          return sendJson(response, 401, { message: 'Sai username hoặc password' });
        }
        return sendJson(response, 200, {
          id: DEFAULT_ADMIN.id,
          username: DEFAULT_ADMIN.username,
          full_name: DEFAULT_ADMIN.full_name,
          fullname: DEFAULT_ADMIN.full_name,
          title: DEFAULT_ADMIN.title,
          permissions: DEFAULT_ADMIN.permissions,
        });
      }

      if (url.pathname === '/api/admins' && request.method === 'GET') {
        return sendJson(response, 200, [DEFAULT_ADMIN]);
      }

      if (url.pathname === '/api/admins' && request.method === 'POST') {
        const payload = await readBody(request).catch(() => ({}));
        const username = String(payload.username || '').trim();
        const password = String(payload.password || '').trim();
        const full_name = String(payload.full_name || payload.fullname || '').trim();
        if (!username || !password || !full_name) return sendJson(response, 400, { message: 'Thiếu thông tin admin' });
        const created = { ...DEFAULT_ADMIN, id: Date.now(), username, full_name, fullname: full_name, title: payload.title || 'Nhân viên', permissions: Array.isArray(payload.permissions) ? payload.permissions : [] };
        return sendJson(response, 201, created);
      }

      if (url.pathname.startsWith('/api/admins/') && request.method === 'PATCH') {
        const payload = await readBody(request).catch(() => ({}));
        const username = String(payload.username || '').trim();
        const full_name = String(payload.full_name || payload.fullname || '').trim();
        const updated = {
          ...DEFAULT_ADMIN,
          id: Number(url.pathname.split('/').pop()) || DEFAULT_ADMIN.id,
          username: username || DEFAULT_ADMIN.username,
          full_name: full_name || DEFAULT_ADMIN.full_name,
          fullname: full_name || DEFAULT_ADMIN.full_name,
          title: payload.title || DEFAULT_ADMIN.title,
          permissions: Array.isArray(payload.permissions) ? payload.permissions : DEFAULT_ADMIN.permissions,
        };
        return sendJson(response, 200, updated);
      }

      if (url.pathname === '/api/invoice/preview' && (request.method === 'GET' || request.method === 'POST')) {
        let payload = {};
        if (request.method === 'POST') payload = await readBody(request).catch(() => ({}));
        else payload = Object.fromEntries(url.searchParams.entries());

        const order = payload.order || payload.data || {};
        const explicitOrderId = payload.orderId || url.searchParams.get('orderId');
        const finalOrder = explicitOrderId && !order.id ? { ...order, id: explicitOrderId } : order;
        const html = buildInvoiceHtml(finalOrder);
        return sendJson(response, 200, {
          ok: true,
          html,
          orderId: finalOrder.id || '4T-UNKNOWN',
          template: 'backend-default',
        });
      }

      return serveStatic(response, url.pathname);
    } catch (error) {
      console.error(error);
      return sendJson(response, 500, { error: 'Database unavailable' });
    }
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      if (nextPort <= DEFAULT_PORT + 10) {
        console.warn(`Port ${port} is busy, retrying on ${nextPort}...`);
        startServer(nextPort);
        return;
      }
      console.error(`No free port available starting from ${DEFAULT_PORT}.`);
      process.exit(1);
      return;
    }
    console.error('Server error:', error);
    process.exit(1);
  });

  server.listen(port, HOST, () => {
    console.log(`4T database sync server running at http://localhost:${port}`);
  });
}

startServer(DEFAULT_PORT);
