-- Seed admin mẫu cho hệ thống 4T.
-- Mật khẩu mặc định: 123456
INSERT INTO admins (username, password_hash, full_name, title, is_locked)
VALUES (
  'admin4T',
  '$2b$10$aF7Ol9kitdXQhr0PZ9iGaO.rpYoLJrqP4V832LRfImn6yaCJmNVC.',
  'Admin 4T',
  'Quản Trị Hệ Thống',
  FALSE
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO admin_permissions (admin_id, permission_code)
SELECT a.id, v.permission_code
FROM admins a
CROSS JOIN (
  VALUES
    ('orders'),
    ('create_order'),
    ('delete_order'),
    ('view_order_detail'),
    ('view_order_history'),
    ('print_bill'),
    ('customer_new_password'),
    ('customer_chat'),
    ('customer_lock'),
    ('customer_delete'),
    ('export'),
    ('manage_admins'),
    ('footer_stats')
) AS v(permission_code)
WHERE a.username = 'admin4T'
ON CONFLICT (admin_id, permission_code) DO NOTHING;
