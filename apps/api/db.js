const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL;
const memoryStore = new Map();

let pool;

async function getPool() {
  if (!DATABASE_URL) return null;
  if (pool) return pool;
  if (DB_TYPE === 'mysql') {
    const mysql = require('mysql2/promise');
    pool = mysql.createPool(DATABASE_URL);
    await pool.query(`CREATE TABLE IF NOT EXISTS sync_state (data_key VARCHAR(64) PRIMARY KEY, data_value JSON NOT NULL)`);
  } else {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });
    await pool.query(`CREATE TABLE IF NOT EXISTS sync_state (data_key TEXT PRIMARY KEY, data_value JSONB NOT NULL)`);
  }
  return pool;
}

async function getValue(key, fallback) {
  if (!DATABASE_URL) return memoryStore.has(key) ? memoryStore.get(key) : fallback;
  const database = await getPool();
  if (DB_TYPE === 'mysql') {
    const [rows] = await database.query('SELECT data_value FROM sync_state WHERE data_key = ?', [key]);
    return rows[0] ? rows[0].data_value : fallback;
  }
  const result = await database.query('SELECT data_value FROM sync_state WHERE data_key = $1', [key]);
  return result.rows[0] ? result.rows[0].data_value : fallback;
}

async function setValue(key, value) {
  if (!DATABASE_URL) {
    memoryStore.set(key, value);
    return;
  }
  const database = await getPool();
  if (DB_TYPE === 'mysql') {
    await database.query('INSERT INTO sync_state (data_key, data_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)', [key, JSON.stringify(value)]);
    return;
  }
  await database.query('INSERT INTO sync_state (data_key, data_value) VALUES ($1, $2::jsonb) ON CONFLICT (data_key) DO UPDATE SET data_value = EXCLUDED.data_value', [key, JSON.stringify(value)]);
}

module.exports = { getPool, getValue, setValue };
