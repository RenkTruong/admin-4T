CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- ADMIN
-- =========================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  title VARCHAR(200),
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  permission_code VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_id, permission_code)
);

-- =========================
-- CUSTOMER
-- =========================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  gps TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  last_access_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- ORDERS
-- =========================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(200),
  phone VARCHAR(20),
  service_name VARCHAR(200),
  weight NUMERIC(10,2) NOT NULL DEFAULT 0,
  address TEXT,
  delivery_service VARCHAR(100),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Tiền mặt',
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'Chờ tiếp nhận' CHECK (status IN (
    'Chờ tiếp nhận',
    'Đã tiếp nhận',
    'Đang xử lý',
    'Đã xử lý',
    'Đang giao hàng',
    'Hoàn tất',
    'Đã hủy'
  )),
  revenue_status VARCHAR(30) NOT NULL DEFAULT 'Chờ thu' CHECK (revenue_status IN ('Chờ thu', 'Đã thu')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(40),
  to_status VARCHAR(40) NOT NULL,
  changed_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  actor_name VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- INVOICE / BILL
-- =========================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_code VARCHAR(100) NOT NULL UNIQUE,
  bank_account VARCHAR(50),
  bank_code VARCHAR(20),
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- WEBSITE / STATS
-- =========================
CREATE TABLE IF NOT EXISTS website_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(200),
  ip VARCHAR(100),
  user_agent TEXT,
  page_path VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_username ON customer_accounts(username);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_revenue_status ON orders(revenue_status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_action_logs_order_id ON order_action_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_website_visits_created_at ON website_visits(created_at);

-- =========================
-- UPDATE TRIGGERS
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admins_updated_at ON admins;
CREATE TRIGGER trg_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_accounts_updated_at ON customer_accounts;
CREATE TRIGGER trg_customer_accounts_updated_at
BEFORE UPDATE ON customer_accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- SAMPLE ADMIN
-- =========================
-- Example seed account:
-- INSERT INTO admins (username, password_hash, full_name, title)
-- VALUES ('admin4T', '$2b$10$REPLACE_WITH_BCRYPT_HASH', 'Admin 4T', 'Quản Trị Hệ Thống');
--
-- INSERT INTO admin_permissions (admin_id, permission_code)
-- SELECT id, permission_code
-- FROM admins
-- CROSS JOIN (
--   VALUES
--     ('orders'),
--     ('create_order'),
--     ('delete_order'),
--     ('view_order_detail'),
--     ('view_order_history'),
--     ('print_bill'),
--     ('customer_new_password'),
--     ('customer_chat'),
--     ('customer_lock'),
--     ('customer_delete'),
--     ('export'),
--     ('manage_admins')
-- ) AS v(permission_code)
-- WHERE username = 'admin4T';
