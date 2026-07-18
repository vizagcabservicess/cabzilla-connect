-- Optional: seed a test Smart Budget vendor
-- Login: phone 9876543210 / password Vendor@123
-- Run after sql/smart_budget_migration.sql (and vendors_admin columns if upgrading).

INSERT INTO sb_vendors (
  name, phone, email, password_hash, rating, vehicle_types, is_active,
  verification_status, tier
)
VALUES (
  'Demo Vendor',
  '9876543210',
  'vendor@vizagtaxihub.com',
  '$2y$10$fVQlqAracfQQG5pOemRNC.IW2/TO0sRrBPUTwklfMuToKoxlTnZmu',
  4.80,
  '["Sedan","SUV","Innova","Tempo Traveller","Urbania"]',
  1,
  'approved',
  'gold'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  name = VALUES(name),
  rating = VALUES(rating),
  vehicle_types = VALUES(vehicle_types),
  is_active = 1,
  verification_status = 'approved',
  tier = VALUES(tier);
