-- Smart Budget customer portal accounts (signup OTP + password login)
CREATE TABLE IF NOT EXISTS sb_customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(120) DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sb_customers_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing installs (ignore error if column already exists):
-- ALTER TABLE sb_customers ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL AFTER name;
