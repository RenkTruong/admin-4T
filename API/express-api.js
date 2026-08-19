require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 4000);

const configuredOrigins = [
  process.env.CORS_ORIGIN,
  process.env.ADMIN_ORIGIN,
  process.env.CUSTOMER_ORIGIN
].flatMap(value => typeof value === 'string' ? value.split(',') : []).map(value => value.trim()).filter(Boolean);

const allowedOrigins = configuredOrigins.length > 0 ? new Set(configuredOrigins) : new Set(['*']);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has('*') || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

app.use((err, req, res, next) => {
  if (err && err.message === 'CORS origin not allowed') {
    return res.status(403).json({ message: 'Origin không được phép truy cập API.' });
  }
  next(err);
});

const STATUS_SEQUENCE = [
  'Chờ tiếp nhận',
  'Đã tiếp nhận',
  'Đang xử lý',
  'Đã xử lý',
  'Đang giao hàng',
  'Hoàn tất'
];

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidPhone(value) {
  const phone = normalizePhone(value);
  return /^0\d{9}$/.test(phone);
}

function getNextStatus(currentStatus) {
  const index = STATUS_SEQUENCE.indexOf(currentStatus);
  if (index === -1 || index === STATUS_SEQUENCE.length - 1) return null;
  return STATUS_SEQUENCE[index + 1];
}

function isStatusTransitionAllowed(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus) return false;
  const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus);
  const nextIndex = STATUS_SEQUENCE.indexOf(nextStatus);

  if (currentIndex === -1 || nextIndex === -1) return false;
  return nextIndex === currentIndex + 1;
}

function buildOrderCode() {
  const now = new Date();
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `4T-${yymmdd}-${random}`;
}

async function getCustomerById(id) {
  const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getAdminByUsername(username) {
  const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
  return result.rows[0] || null;
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'postgresql' });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// =========================
// ADMIN AUTH & MANAGEMENT
// =========================
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Thiếu username hoặc password' });
  }

  const admin = await getAdminByUsername(username);
  if (!admin) {
    return res.status(401).json({ message: 'Sai username hoặc password' });
  }

  const isMatch = await bcrypt.compare(password, admin.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Sai username hoặc password' });
  }

  if (admin.is_locked) {
    return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
  }

  const permissions = await pool.query(
    'SELECT permission_code FROM admin_permissions WHERE admin_id = $1 ORDER BY permission_code ASC',
    [admin.id]
  );

  res.json({
    id: admin.id,
    username: admin.username,
    full_name: admin.full_name,
    title: admin.title,
    permissions: permissions.rows.map(r => r.permission_code)
  });
});

app.get('/api/admins', async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, a.username, a.full_name, a.title, a.is_locked, a.created_at,
            COALESCE(json_agg(ap.permission_code ORDER BY ap.permission_code) FILTER (WHERE ap.permission_code IS NOT NULL), '[]'::json) AS permissions
     FROM admins a
     LEFT JOIN admin_permissions ap ON ap.admin_id = a.id
     GROUP BY a.id, a.username, a.full_name, a.title, a.is_locked, a.created_at
     ORDER BY a.created_at DESC`
  );

  const admins = result.rows.map(row => ({
    ...row,
    fullname: row.full_name,
    permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]')
  }));

  res.json(admins);
});

app.get('/api/admins/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, a.username, a.full_name, a.title, a.is_locked, a.created_at,
            COALESCE(json_agg(ap.permission_code ORDER BY ap.permission_code) FILTER (WHERE ap.permission_code IS NOT NULL), '[]'::json) AS permissions
     FROM admins a
     LEFT JOIN admin_permissions ap ON ap.admin_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, a.username, a.full_name, a.title, a.is_locked, a.created_at`,
    [req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ message: 'Không tìm thấy admin' });
  const admin = result.rows[0];
  res.json({
    ...admin,
    fullname: admin.full_name,
    permissions: Array.isArray(admin.permissions) ? admin.permissions : JSON.parse(admin.permissions || '[]')
  });
});

app.post('/api/admins', async (req, res) => {
  const { username, password, full_name, title, permissions = [] } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ message: 'Thiếu username, password hoặc full_name' });
  }

  const duplicate = await pool.query('SELECT 1 FROM admins WHERE username = $1', [username]);
  if (duplicate.rows[0]) {
    return res.status(409).json({ message: 'Username đã tồn tại' });
  }

  const hash = await bcrypt.hash(password, 10);
  const adminResult = await pool.query(
    `INSERT INTO admins (username, password_hash, full_name, title) VALUES ($1, $2, $3, $4) RETURNING *`,
    [username, hash, full_name, title || 'Nhân viên']
  );

  const admin = adminResult.rows[0];

  if (Array.isArray(permissions) && permissions.length > 0) {
    for (const permission of permissions) {
      await pool.query(
        'INSERT INTO admin_permissions (admin_id, permission_code) VALUES ($1, $2) ON CONFLICT (admin_id, permission_code) DO NOTHING',
        [admin.id, permission]
      );
    }
  }

  const permissionsResult = await pool.query(
    'SELECT permission_code FROM admin_permissions WHERE admin_id = $1 ORDER BY permission_code ASC',
    [admin.id]
  );

  res.status(201).json({
    ...admin,
    fullname: admin.full_name,
    permissions: permissionsResult.rows.map(row => row.permission_code)
  });
});

app.patch('/api/admins/:id', async (req, res) => {
  const { username, full_name, title, permissions = [] } = req.body;
  if (!username || !full_name) {
    return res.status(400).json({ message: 'Thiếu username hoặc full_name' });
  }

  const current = await pool.query('SELECT * FROM admins WHERE id = $1', [req.params.id]);
  if (!current.rows[0]) return res.status(404).json({ message: 'Không tìm thấy admin' });

  const existingWithUsername = await pool.query(
    'SELECT id FROM admins WHERE username = $1 AND id <> $2',
    [username, req.params.id]
  );
  if (existingWithUsername.rows[0]) {
    return res.status(409).json({ message: 'Username đã tồn tại' });
  }

  await pool.query(
    `UPDATE admins
     SET username = $1, full_name = $2, title = $3, updated_at = NOW()
     WHERE id = $4`,
    [username, full_name, title || current.rows[0].title, req.params.id]
  );

  await pool.query('DELETE FROM admin_permissions WHERE admin_id = $1', [req.params.id]);
  for (const permission of permissions) {
    await pool.query(
      'INSERT INTO admin_permissions (admin_id, permission_code) VALUES ($1, $2) ON CONFLICT (admin_id, permission_code) DO NOTHING',
      [req.params.id, permission]
    );
  }

  const result = await pool.query(
    `SELECT a.id, a.username, a.full_name, a.title, a.is_locked, a.created_at,
            COALESCE(json_agg(ap.permission_code ORDER BY ap.permission_code) FILTER (WHERE ap.permission_code IS NOT NULL), '[]'::json) AS permissions
     FROM admins a
     LEFT JOIN admin_permissions ap ON ap.admin_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, a.username, a.full_name, a.title, a.is_locked, a.created_at`,
    [req.params.id]
  );

  const admin = result.rows[0];
  res.json({
    ...admin,
    fullname: admin.full_name,
    permissions: Array.isArray(admin.permissions) ? admin.permissions : JSON.parse(admin.permissions || '[]')
  });
});

app.patch('/api/admins/:id/lock', async (req, res) => {
  const { is_locked } = req.body;
  const result = await pool.query(
    `UPDATE admins SET is_locked = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [Boolean(is_locked), req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ message: 'Không tìm thấy admin' });
  res.json(result.rows[0]);
});

app.delete('/api/admins/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ message: 'Không tìm thấy admin' });
  res.json({ message: 'Xóa admin thành công' });
});

// =========================
// CUSTOMER AUTH & PROFILE
// =========================
app.post('/api/customers/register', async (req, res) => {
  const { name, phone, address, gps, username, password } = req.body;
  if (!name || !phone || !username || !password) {
    return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
  }

  const cleanPhone = normalizePhone(phone);

  const duplicatePhone = await pool.query('SELECT 1 FROM customers WHERE phone = $1', [cleanPhone]);
  if (duplicatePhone.rows[0]) {
    return res.status(409).json({ message: 'Số điện thoại đã tồn tại' });
  }

  const duplicateUser = await pool.query('SELECT 1 FROM customer_accounts WHERE username = $1', [username]);
  if (duplicateUser.rows[0]) {
    return res.status(409).json({ message: 'Username đã tồn tại' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customerRes = await client.query(
      `INSERT INTO customers (name, phone, address, gps, points, status) VALUES ($1, $2, $3, $4, 0, 'active') RETURNING *`,
      [name, cleanPhone, address || null, gps || null]
    );

    const customer = customerRes.rows[0];
    const hash = await bcrypt.hash(password, 10);

    await client.query(
      `INSERT INTO customer_accounts (customer_id, username, password_hash) VALUES ($1, $2, $3)`,
      [customer.id, username, hash]
    );

    await client.query('COMMIT');
    res.status(201).json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      username
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Lỗi tạo tài khoản', error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/customers/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Thiếu username hoặc password' });
  }

  const result = await pool.query(
    `SELECT ca.*, c.*
     FROM customer_accounts ca
     JOIN customers c ON c.id = ca.customer_id
     WHERE ca.username = $1`,
    [username]
  );

  const account = result.rows[0];
  if (!account) {
    return res.status(401).json({ message: 'Sai username hoặc password' });
  }

  const isMatch = await bcrypt.compare(password, account.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Sai username hoặc password' });
  }

  await pool.query(
    `UPDATE customer_accounts SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [account.id]
  );
  await pool.query(
    `UPDATE customers SET last_access_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [account.customer_id]
  );

  res.json({
    id: account.customer_id,
    username: account.username,
    name: account.name,
    phone: account.phone,
    points: Number(account.points || 0)
  });
});

app.get('/api/customers/:id', async (req, res) => {
  const customer = await getCustomerById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
  res.json(customer);
});

app.put('/api/customers/:id', async (req, res) => {
  const { name, phone, address, gps } = req.body;
  const result = await pool.query(
    `UPDATE customers
     SET name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         address = COALESCE($3, address),
         gps = COALESCE($4, gps),
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [name || null, normalizePhone(phone) || null, address || null, gps || null, req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
  res.json(result.rows[0]);
});

app.patch('/api/customers/:id/change-password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
  }

  const customer = await getCustomerById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });

  const account = await pool.query('SELECT * FROM customer_accounts WHERE customer_id = $1', [customer.id]);
  if (!account.rows[0]) return res.status(404).json({ message: 'Không tìm thấy tài khoản khách hàng' });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    'UPDATE customer_accounts SET password_hash = $1, updated_at = NOW() WHERE customer_id = $2',
    [hash, customer.id]
  );

  res.json({ message: 'Đổi mật khẩu thành công' });
});

app.get('/api/customers/:id/orders', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json(result.rows);
});

// =========================
// ORDER CRUD & STATUS
// =========================
app.post('/api/orders', async (req, res) => {
  const payload = req.body || {};
  const {
    customer_id,
    customer_name,
    phone,
    service_name,
    weight,
    address,
    delivery_service,
    payment_method,
    total_amount,
    status = 'Chờ tiếp nhận',
    revenue_status = 'Chờ thu'
  } = payload;

  if (!customer_name || !phone || !service_name) {
    return res.status(400).json({ message: 'Thiếu thông tin đơn hàng' });
  }

  const orderCode = buildOrderCode();
  const orderResult = await pool.query(
    `INSERT INTO orders (
      order_code,
      customer_id,
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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      orderCode,
      customer_id || null,
      customer_name,
      normalizePhone(phone),
      service_name,
      Number(weight || 0),
      address || null,
      delivery_service || null,
      payment_method || 'Tiền mặt',
      Number(total_amount || 0),
      status,
      revenue_status
    ]
  );

  const order = orderResult.rows[0];

  await pool.query(
    `INSERT INTO order_action_logs (order_id, action, actor_name)
     VALUES ($1, $2, $3)`,
    [order.id, 'Khách hàng tạo đơn hàng', customer_name || 'Customer']
  );

  res.status(201).json(order);
});

app.get('/api/orders', async (req, res) => {
  const { status, revenue_status, phone } = req.query;
  let query = 'SELECT * FROM orders WHERE 1 = 1';
  const params = [];
  let index = 1;

  if (status) {
    query += ` AND status = $${index}`;
    params.push(status);
    index += 1;
  }

  if (revenue_status) {
    query += ` AND revenue_status = $${index}`;
    params.push(revenue_status);
    index += 1;
  }

  if (phone) {
    query += ` AND phone = $${index}`;
    params.push(normalizePhone(phone));
    index += 1;
  }

  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, params);
  res.json(result.rows);
});

app.get('/api/orders/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM orders WHERE id = $1 OR order_code = $1',
    [req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  res.json(result.rows[0]);
});

app.get('/api/orders/:id/history', async (req, res) => {
  const result = await pool.query(
    `SELECT h.*, a.full_name AS admin_name
     FROM order_status_history h
     LEFT JOIN admins a ON a.id = h.changed_by_admin_id
     WHERE h.order_id = (
       SELECT id FROM orders WHERE id = $1 OR order_code = $1
     )
     ORDER BY h.created_at DESC`,
    [req.params.id]
  );

  res.json(result.rows);
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const { status, admin_id, note } = req.body;
  if (!status) return res.status(400).json({ message: 'Thiếu trạng thái mới' });

  const current = await pool.query(
    'SELECT * FROM orders WHERE id = $1 OR order_code = $1',
    [req.params.id]
  );

  if (!current.rows[0]) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

  const order = current.rows[0];
  if (!isStatusTransitionAllowed(order.status, status)) {
    return res.status(400).json({
      message: `Không cho phép cập nhật từ ${order.status} sang ${status}`
    });
  }

  const updated = await pool.query(
    `UPDATE orders
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, order.id]
  );

  await pool.query(
    `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_admin_id, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [order.id, order.status, status, admin_id || null, note || null]
  );

  await pool.query(
    `INSERT INTO order_action_logs (order_id, action, actor_admin_id, actor_name)
     VALUES ($1, $2, $3, $4)`,
    [order.id, `Cập nhật trạng thái: ${order.status} -> ${status}`, admin_id || null, 'Admin']
  );

  res.json(updated.rows[0]);
});

app.patch('/api/orders/:id/revenue-status', async (req, res) => {
  const { revenue_status } = req.body;
  if (!revenue_status) return res.status(400).json({ message: 'Thiếu trạng thái doanh thu' });

  const result = await pool.query(
    `UPDATE orders
     SET revenue_status = $1, updated_at = NOW()
     WHERE id = $2 OR order_code = $2
     RETURNING *`,
    [revenue_status, req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  res.json(result.rows[0]);
});

app.delete('/api/orders/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM orders WHERE id = $1 OR order_code = $1 RETURNING id',
    [req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  res.json({ message: 'Xóa đơn hàng thành công' });
});

// =========================
// INVOICE
// =========================
app.get('/api/orders/:id/invoice', async (req, res) => {
  const orderResult = await pool.query(
    'SELECT * FROM orders WHERE id = $1 OR order_code = $1',
    [req.params.id]
  );

  if (!orderResult.rows[0]) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

  const order = orderResult.rows[0];
  const invoiceCode = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const invoiceResult = await pool.query(
    `INSERT INTO invoices (order_id, invoice_code, bank_account, bank_code, total_amount, printed_at)
     VALUES ($1, $2, '19036623385014', 'TCB', $3, NOW())
     RETURNING *`,
    [order.id, invoiceCode, Number(order.total_amount || 0)]
  );

  res.json({ invoice: invoiceResult.rows[0], order });
});

// =========================
// WEBSITE VISITS
// =========================
app.post('/api/visits', async (req, res) => {
  const { session_id, ip, user_agent, page_path } = req.body || {};
  await pool.query(
    `INSERT INTO website_visits (session_id, ip, user_agent, page_path)
     VALUES ($1, $2, $3, $4)`,
    [session_id || null, ip || null, user_agent || null, page_path || null]
  );

  res.json({ ok: true });
});

app.get('/api/visits/stats', async (req, res) => {
  const result = await pool.query('SELECT COUNT(*) AS total FROM website_visits');
  res.json({ total: Number(result.rows[0].total || 0) });
});

app.listen(port, () => {
  console.log(`4T Express API listening on http://localhost:${port}`);
});
