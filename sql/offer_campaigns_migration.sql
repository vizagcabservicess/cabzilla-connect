-- Offer / Campaign Management
-- Categories: Airport, Local, Tour, Outstation one-way / round-trip
-- Deploy alongside api/campaigns/*.php
-- Existing DBs: also run offer_campaigns_categories_v2.sql

CREATE TABLE IF NOT EXISTS oc_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  campaign_type ENUM(
    'todays_offer','weekend_offer','festival_offer','corporate_offer',
    'flash_sale','happy_hour','seasonal_offer','custom'
  ) NOT NULL DEFAULT 'custom',
  category ENUM(
    'airport','local','outstation','tour',
    'outstation_one_way','outstation_round_trip'
  ) NOT NULL,
  offer_type ENUM('flat','percentage','fixed_fare') NOT NULL,
  offer_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  coupon_code VARCHAR(40) NOT NULL,
  eligible_own_fleet TINYINT(1) NOT NULL DEFAULT 1,
  eligible_attached_fleet TINYINT(1) NOT NULL DEFAULT 1,
  absorb_own ENUM('company','owner') NOT NULL DEFAULT 'company',
  absorb_attached ENUM('company','owner') NOT NULL DEFAULT 'company',
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  travel_date_from DATE DEFAULT NULL COMMENT 'Eligible trip pickup from (NULL = any)',
  travel_date_to DATE DEFAULT NULL COMMENT 'Eligible trip pickup to (NULL = any)',
  travel_time_from TIME DEFAULT NULL COMMENT 'Earliest trip pickup time (NULL = any time)',
  pickup_location VARCHAR(180) DEFAULT NULL COMMENT 'Offer pickup place (NULL = any / not shown)',
  drop_location VARCHAR(180) DEFAULT NULL COMMENT 'Offer destination (NULL = any / not shown)',
  pickup_lat DECIMAL(10,7) DEFAULT NULL,
  pickup_lng DECIMAL(10,7) DEFAULT NULL,
  drop_lat DECIMAL(10,7) DEFAULT NULL,
  drop_lng DECIMAL(10,7) DEFAULT NULL,
  max_redemptions INT DEFAULT NULL COMMENT 'NULL = unlimited',
  max_per_customer INT NOT NULL DEFAULT 1,
  popup_enabled TINYINT(1) NOT NULL DEFAULT 1,
  priority ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  status ENUM('draft','scheduled','active','paused','expired','cancelled') NOT NULL DEFAULT 'draft',
  redemption_count INT NOT NULL DEFAULT 0,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_oc_campaigns_coupon (coupon_code),
  INDEX idx_oc_campaigns_cat_status (category, status),
  INDEX idx_oc_campaigns_window (starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS oc_campaign_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  fleet_type ENUM('own','attached') NOT NULL,
  vehicle_id INT DEFAULT NULL,
  driver_id INT DEFAULT NULL,
  vendor_id INT DEFAULT NULL,
  vehicle_number VARCHAR(40) DEFAULT NULL,
  vehicle_type VARCHAR(80) DEFAULT NULL,
  participant_label VARCHAR(160) DEFAULT NULL,
  participation_status ENUM('joined','declined','removed') NOT NULL DEFAULT 'joined',
  vehicle_status ENUM('available','busy','offline') NOT NULL DEFAULT 'available',
  joined_at DATETIME DEFAULT NULL,
  removed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_oc_part_campaign (campaign_id, participation_status),
  INDEX idx_oc_part_vendor (vendor_id),
  INDEX idx_oc_part_driver (driver_id),
  CONSTRAINT fk_oc_part_campaign FOREIGN KEY (campaign_id) REFERENCES oc_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS oc_campaign_redemptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  booking_id VARCHAR(64) DEFAULT NULL,
  coupon_code VARCHAR(40) NOT NULL,
  website_fare DECIMAL(12,2) DEFAULT NULL,
  offer_fare DECIMAL(12,2) DEFAULT NULL,
  applied_at DATETIME NOT NULL,
  payment_completed_at DATETIME DEFAULT NULL,
  status ENUM('applied','completed','expired') NOT NULL DEFAULT 'applied',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_oc_red_campaign_phone (campaign_id, customer_phone),
  INDEX idx_oc_red_phone (customer_phone),
  INDEX idx_oc_red_booking (booking_id),
  CONSTRAINT fk_oc_red_campaign FOREIGN KEY (campaign_id) REFERENCES oc_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS oc_campaign_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT DEFAULT NULL,
  event_type VARCHAR(40) NOT NULL COMMENT 'view,popup_view,click,apply,booking,revenue',
  category ENUM(
    'airport','local','outstation','tour',
    'outstation_one_way','outstation_round_trip'
  ) DEFAULT NULL,
  meta_json JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_oc_evt_campaign (campaign_id, event_type),
  INDEX idx_oc_evt_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS oc_campaign_settings (
  setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO oc_campaign_settings (setting_key, setting_value) VALUES
  ('grace_window_minutes', '15'),
  ('v1_categories', 'airport,local,tour,outstation_one_way,outstation_round_trip,outstation');
