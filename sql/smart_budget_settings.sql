-- Smart Budget admin-tunable settings (e.g. min budget % of website fare)
CREATE TABLE IF NOT EXISTS sb_settings (
  setting_key VARCHAR(64) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO sb_settings (setting_key, setting_value)
VALUES ('budget_min_of_website_fare_percent', '70');
