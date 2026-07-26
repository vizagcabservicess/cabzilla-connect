-- Site promo banner popups (admin-managed image + optional link + auto-expire)
-- Deploy with api/promos/*.php
-- PHP also auto-creates/alters the table on first request.

CREATE TABLE IF NOT EXISTS site_promos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL DEFAULT '',
  image_url VARCHAR(1024) NOT NULL,
  link_url VARCHAR(1024) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  starts_at DATETIME DEFAULT NULL,
  expires_at DATETIME DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_site_promos_active (is_active, sort_order, id),
  INDEX idx_site_promos_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If table already existed without duration columns, run these once (ignore "Duplicate column" errors):
-- ALTER TABLE site_promos ADD COLUMN starts_at DATETIME DEFAULT NULL AFTER is_active;
-- ALTER TABLE site_promos ADD COLUMN expires_at DATETIME DEFAULT NULL AFTER starts_at;
