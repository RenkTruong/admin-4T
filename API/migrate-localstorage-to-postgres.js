require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function upsertAdmin(client, admin) {
  const username = admin.username || admin.userName || 'admin';
  const fullName = admin.fullname || admin.full_name || admin.name || username;
  const title = admin.title || 'Nhân viên';
  const password = admin.password || '123456';
  const hash = await bcrypt.hash(password, 10);

  const existing = await client.query('SELECT id FROM admins WHERE username = $1', [username]);

  if (existing.rows[0]) {
    const adminId = existing.rows[0].id;
    await client.query(
      `UPDATE admins
       SET password_hash = $1,
           full_name = $2,
           title = $3,
           is_locked = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [hash, fullName, title, !!admin.isLocked, adminId]
    );

    await client.query('DELETE FROM admin_permissions WHERE admin_id = $1', [adminId]);

    for (const permission of admin.permissions || []) {
      await client.query(
        `INSERT INTO admin_permissions (admin_id, permission_code)
         VALUES ($1, $2)
         ON CONFLICT (admin_id, permission_code) DO NOTHING`,
        [adminId, permission]
      );
    }

    return adminId;
  }

  const result = await client.query(
    `INSERT INTO admins (username, password_hash, full_name, title, is_locked)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [username, hash, fullName, title, !!admin.isLocked]
  );

  const adminId = result.rows[0].id;
  for (const permission of admin.permissions || []) {
    await client.query(
      `INSERT INTO admin_permissions (admin_id, permission_code)
       VALUES ($1, $2)
       ON CONFLICT (admin_id, permission_code) DO NOTHING`,
      [adminId, permission]
    );
  }

  return adminId;
}

async function upsertCustomer(client, user) {
  const phone = normalizePhone(user.phone);
  if (!phone) return null;

  const existing = await client.query('SELECT id FROM customers WHERE phone = $1', [phone]);

  if (existing.rows[0]) {
    const customerId = existing.rows[0].id;
    await client.query(
      `UPDATE customers
       SET name = $1,
           address = $2,
           gps = $3,
           points = $4,
           last_access_at = $5,
           status = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [
        user.name || user.fullname || 'Khách hàng',
        user.address || null,
        user.gps || null,
        Number(user.points || 0),
        user.lastAccess || null,
        user.isLocked ? 'blocked' : 'active',
        customerId
      ]
    );

    const username = user.username || `customer_${customerId.slice(0, 8)}`;
    const passwordHash = await bcrypt.hash(user.password || '123456', 10);
    const account = await client.query('SELECT id FROM customer_accounts WHERE customer_id = $1', [customerId]);

    if (account.rows[0]) {
      await client.query(
        `UPDATE customer_accounts
         SET username = $1, password_hash = $2, updated_at = NOW()
         WHERE customer_id = $3`,
        [username, passwordHash, customerId]
      );
    } else {
      await client.query(
        `INSERT INTO customer_accounts (customer_id, username, password_hash)
         VALUES ($1, $2, $3)`,
        [customerId, username, passwordHash]
      );
    }

    return customerId;
  }

  const customerRes = await client.query(
    `INSERT INTO customers (name, phone, address, gps, points, last_access_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      user.name || user.fullname || 'Khách hàng',
      phone,
      user.address || null,
      user.gps || null,
      Number(user.points || 0),
      user.lastAccess || null,
      user.isLocked ? 'blocked' : 'active'
    ]
  );

  const customerId = customerRes.rows[0].id;
  const username = user.username || `customer_${customerId.slice(0, 8)}`;
  const passwordHash = await bcrypt.hash(user.password || '123456', 10);

  await client.query(
    `INSERT INTO customer_accounts (customer_id, username, password_hash)
     VALUES ($1, $2, $3)`,
    [customerId, username, passwordHash]
  );

  return customerId;
}

async function upsertOrder(client, order) {
  const orderCode = order.id || `4T-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const currentStatus = order.status || 'Chờ tiếp nhận';
  const revenueStatus = order.revenueStatus || 'Chờ thu';

  const existing = await client.query('SELECT id FROM orders WHERE order_code = $1', [orderCode]);

  if (existing.rows[0]) {
    const orderId = existing.rows[0].id;
    await client.query(
      `UPDATE orders
       SET customer_name = $1,
           phone = $2,
           service_name = $3,
           weight = $4,
           address = $5,
           delivery_service = $6,
           payment_method = $7,
           total_amount = $8,
           status = $9,
           revenue_status = $10,
           updated_at = NOW()
       WHERE id = $11`,
      [
        order.customerName || order.name || null,
        normalizePhone(order.phone) || null,
        order.service || null,
        Number(order.weight || 0),
        order.address || null,
        order.deliveryService || null,
        order.paymentMethod || 'Tiền mặt',
        Number(order.total || 0),
        currentStatus,
        revenueStatus,
        orderId
      ]
    );
    return orderId;
  }

  const result = await client.query(
    `INSERT INTO orders (
      order_code,
      customer_name,
      phone,
      service_name,
      weight,
      address,
      delivery_service,
      payment_method,
      total_amount,
      status,
      revenue_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      orderCode,
      order.customerName || order.name || null,
      normalizePhone(order.phone) || null,
      order.service || null,
      Number(order.weight || 0),
      order.address || null,
      order.deliveryService || null,
      order.paymentMethod || 'Tiền mặt',
      Number(order.total || 0),
      currentStatus,
      revenueStatus
    ]
  );

  return result.rows[0].id;
}

async function insertOrderLogs(client, orderId, logs) {
  if (!Array.isArray(logs)) return;

  for (const log of logs) {
    if (!log || !log.action) continue;
    await client.query(
      `INSERT INTO order_action_logs (order_id, action, actor_name, created_at)
       VALUES ($1, $2, $3, $4)`,
      [orderId, log.action, log.performer || 'System', log.time || new Date().toISOString()]
    );
  }
}

async function insertWebsiteVisits(client, visits) {
  if (!Array.isArray(visits)) return;

  for (const visit of visits) {
    await client.query(
      `INSERT INTO website_visits (session_id, ip, user_agent, page_path, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        visit.sessionId || null,
        visit.ip || null,
        visit.userAgent || null,
        visit.path || null,
        visit.time || new Date().toISOString()
      ]
    );
  }
}

async function migrate() {
  const exportPath = path.join(process.cwd(), '4t-export.json');
  const data = readJson(exportPath);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const admin of data.adminAccounts || []) {
      await upsertAdmin(client, admin);
    }

    for (const user of data.users || []) {
      await upsertCustomer(client, user);
    }

    for (const order of data.orders_v2 || []) {
      const orderId = await upsertOrder(client, order);
      await insertOrderLogs(client, orderId, order.history || []);
    }

    await insertWebsiteVisits(client, data.websiteVisitsLog || []);

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate();
