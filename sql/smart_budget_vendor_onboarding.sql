-- Smart Budget vendor onboarding: profile pic, primary vehicle, KYC documents
-- Safe to re-run only if columns do not already exist.

ALTER TABLE sb_vendors
  ADD COLUMN profile_image_url VARCHAR(500) DEFAULT NULL AFTER email,
  ADD COLUMN primary_vehicle_number VARCHAR(40) DEFAULT NULL AFTER vehicle_types,
  ADD COLUMN primary_vehicle_type VARCHAR(80) DEFAULT NULL AFTER primary_vehicle_number,
  ADD COLUMN doc_pan_url VARCHAR(500) DEFAULT NULL AFTER primary_vehicle_type,
  ADD COLUMN doc_aadhaar_url VARCHAR(500) DEFAULT NULL AFTER doc_pan_url,
  ADD COLUMN doc_rc_url VARCHAR(500) DEFAULT NULL AFTER doc_aadhaar_url,
  ADD COLUMN doc_insurance_url VARCHAR(500) DEFAULT NULL AFTER doc_rc_url,
  ADD COLUMN doc_dl_url VARCHAR(500) DEFAULT NULL AFTER doc_insurance_url,
  ADD COLUMN doc_pollution_url VARCHAR(500) DEFAULT NULL AFTER doc_dl_url,
  ADD COLUMN doc_permit_url VARCHAR(500) DEFAULT NULL AFTER doc_pollution_url,
  ADD COLUMN onboarding_submitted_at DATETIME DEFAULT NULL AFTER doc_permit_url,
  ADD COLUMN admin_notified_at DATETIME DEFAULT NULL AFTER onboarding_submitted_at;

CREATE TABLE IF NOT EXISTS sb_vendor_otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sb_vendor_otps_phone (phone),
  INDEX idx_sb_vendor_otps_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sb_admin_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alert_type VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT DEFAULT NULL,
  ref_id INT DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sb_admin_alerts_unread (is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
