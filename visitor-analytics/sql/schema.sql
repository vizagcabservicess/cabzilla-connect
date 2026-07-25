-- Visitor Analytics & Live Chat System for Vizag Taxi Hub
-- Run: mysql -u USER -p DATABASE < sql/visitor_analytics_schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Sites / projects (multi-tenant ready)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_sites (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  public_key VARCHAR(64) NOT NULL UNIQUE,
  retention_days INT NOT NULL DEFAULT 90,
  cookie_consent_required TINYINT(1) NOT NULL DEFAULT 1,
  recording_enabled TINYINT(1) NOT NULL DEFAULT 1,
  heatmap_enabled TINYINT(1) NOT NULL DEFAULT 1,
  chat_enabled TINYINT(1) NOT NULL DEFAULT 1,
  ai_chat_enabled TINYINT(1) NOT NULL DEFAULT 1,
  mask_selectors JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_va_sites_domain (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Visitors & sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_visitors (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  visitor_key VARCHAR(64) NOT NULL,
  is_returning TINYINT(1) NOT NULL DEFAULT 0,
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  country VARCHAR(80) NULL,
  city VARCHAR(120) NULL,
  pincode VARCHAR(20) NULL,
  region VARCHAR(120) NULL,
  timezone VARCHAR(80) NULL,
  language VARCHAR(32) NULL,
  browser VARCHAR(80) NULL,
  browser_version VARCHAR(40) NULL,
  os VARCHAR(80) NULL,
  device_type ENUM('desktop','tablet','mobile','unknown') NOT NULL DEFAULT 'unknown',
  screen_width INT NULL,
  screen_height INT NULL,
  user_agent TEXT NULL,
  ip_hash VARCHAR(64) NULL,
  ip_address VARCHAR(45) NULL,
  name VARCHAR(160) NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(40) NULL,
  tags JSON NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_va_visitor_site_key (site_id, visitor_key),
  INDEX idx_va_visitors_last_seen (site_id, last_seen_at),
  INDEX idx_va_visitors_city (site_id, city),
  CONSTRAINT fk_va_visitors_site FOREIGN KEY (site_id) REFERENCES va_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS va_sessions (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  visitor_id CHAR(36) NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  duration_ms INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  landing_page VARCHAR(2048) NULL,
  exit_page VARCHAR(2048) NULL,
  referrer VARCHAR(2048) NULL,
  utm_source VARCHAR(255) NULL,
  utm_medium VARCHAR(255) NULL,
  utm_campaign VARCHAR(255) NULL,
  utm_term VARCHAR(255) NULL,
  utm_content VARCHAR(255) NULL,
  gclid VARCHAR(255) NULL,
  entry_url VARCHAR(2048) NULL,
  page_count INT NOT NULL DEFAULT 0,
  event_count INT NOT NULL DEFAULT 0,
  has_recording TINYINT(1) NOT NULL DEFAULT 0,
  recording_s3_key VARCHAR(512) NULL,
  device_type ENUM('desktop','tablet','mobile','unknown') NOT NULL DEFAULT 'unknown',
  browser VARCHAR(80) NULL,
  os VARCHAR(80) NULL,
  country VARCHAR(80) NULL,
  city VARCHAR(120) NULL,
  pincode VARCHAR(20) NULL,
  ip_address VARCHAR(45) NULL,
  consent_given TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_va_sessions_site_started (site_id, started_at),
  INDEX idx_va_sessions_visitor (visitor_id),
  INDEX idx_va_sessions_active (site_id, is_active),
  INDEX idx_va_sessions_utm (site_id, utm_campaign),
  CONSTRAINT fk_va_sessions_site FOREIGN KEY (site_id) REFERENCES va_sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_va_sessions_visitor FOREIGN KEY (visitor_id) REFERENCES va_visitors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Events (batched, high volume)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  visitor_id CHAR(36) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  event_name VARCHAR(120) NULL,
  page_url VARCHAR(2048) NULL,
  page_path VARCHAR(1024) NULL,
  page_title VARCHAR(512) NULL,
  x INT NULL,
  y INT NULL,
  scroll_depth DECIMAL(5,2) NULL,
  viewport_w INT NULL,
  viewport_h INT NULL,
  element_tag VARCHAR(64) NULL,
  element_id VARCHAR(255) NULL,
  element_class VARCHAR(512) NULL,
  element_text VARCHAR(512) NULL,
  element_href VARCHAR(2048) NULL,
  form_name VARCHAR(255) NULL,
  meta JSON NULL,
  occurred_at DATETIME(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_va_events_session_time (session_id, occurred_at),
  INDEX idx_va_events_site_type_time (site_id, event_type, occurred_at),
  INDEX idx_va_events_path (site_id, page_path(255), event_type),
  INDEX idx_va_events_visitor (visitor_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Session recording chunks (compressed payloads in S3; metadata here)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_recording_chunks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  chunk_index INT NOT NULL,
  s3_key VARCHAR(512) NOT NULL,
  byte_size INT NOT NULL,
  /** Durable gzip payload (survives Hostinger redeploys when local disk is wiped) */
  payload_gzip MEDIUMBLOB NULL,
  event_count INT NOT NULL DEFAULT 0,
  started_at DATETIME(3) NOT NULL,
  ended_at DATETIME(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_va_rec_chunk (session_id, chunk_index),
  INDEX idx_va_rec_session (session_id),
  CONSTRAINT fk_va_rec_session FOREIGN KEY (session_id) REFERENCES va_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Heatmap aggregates (precomputed buckets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_heatmap_points (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  page_path VARCHAR(1024) NOT NULL,
  device_type ENUM('desktop','tablet','mobile','unknown') NOT NULL,
  heatmap_type ENUM('click','scroll','move') NOT NULL,
  bucket_x SMALLINT NOT NULL,
  bucket_y SMALLINT NOT NULL,
  intensity INT NOT NULL DEFAULT 1,
  day_date DATE NOT NULL,
  campaign VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_va_heat (site_id, page_path(191), device_type, heatmap_type, bucket_x, bucket_y, day_date, campaign(64)),
  INDEX idx_va_heat_query (site_id, page_path(191), heatmap_type, day_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Funnels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_funnels (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  steps JSON NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_va_funnels_site (site_id),
  CONSTRAINT fk_va_funnels_site FOREIGN KEY (site_id) REFERENCES va_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Booking analytics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_booking_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  session_id CHAR(36) NULL,
  visitor_id CHAR(36) NULL,
  vehicle_category VARCHAR(80) NOT NULL,
  event_type ENUM(
    'quote_request','booking_form','phone_call','whatsapp_click',
    'payment_success','booking_completed','booking_started'
  ) NOT NULL,
  booking_id VARCHAR(64) NULL,
  amount DECIMAL(12,2) NULL,
  currency VARCHAR(8) NULL DEFAULT 'INR',
  page_url VARCHAR(2048) NULL,
  meta JSON NULL,
  occurred_at DATETIME(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_va_booking_cat_time (site_id, vehicle_category, occurred_at),
  INDEX idx_va_booking_type_time (site_id, event_type, occurred_at),
  INDEX idx_va_booking_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Live chat
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_chat_departments (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(512) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_va_dept_site (site_id),
  CONSTRAINT fk_va_dept_site FOREIGN KEY (site_id) REFERENCES va_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS va_chat_operators (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  user_id INT NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  avatar_url VARCHAR(512) NULL,
  status ENUM('online','away','offline') NOT NULL DEFAULT 'offline',
  department_ids JSON NULL,
  last_seen_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_va_op_email (site_id, email),
  INDEX idx_va_op_status (site_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS va_chat_conversations (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  visitor_id CHAR(36) NOT NULL,
  session_id CHAR(36) NULL,
  department_id CHAR(36) NULL,
  operator_id CHAR(36) NULL,
  status ENUM('open','pending','assigned','resolved','missed','offline') NOT NULL DEFAULT 'open',
  subject VARCHAR(255) NULL,
  source VARCHAR(80) NULL,
  vehicle_interest VARCHAR(80) NULL,
  campaign VARCHAR(255) NULL,
  location_city VARCHAR(120) NULL,
  unread_visitor INT NOT NULL DEFAULT 0,
  unread_operator INT NOT NULL DEFAULT 0,
  ai_handled TINYINT(1) NOT NULL DEFAULT 0,
  transferred_from_ai TINYINT(1) NOT NULL DEFAULT 0,
  last_message_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_va_chat_inbox (site_id, status, last_message_at),
  INDEX idx_va_chat_visitor (visitor_id),
  INDEX idx_va_chat_operator (operator_id, status),
  CONSTRAINT fk_va_chat_site FOREIGN KEY (site_id) REFERENCES va_sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_va_chat_visitor FOREIGN KEY (visitor_id) REFERENCES va_visitors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS va_chat_messages (
  id CHAR(36) PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  sender_type ENUM('visitor','operator','ai','system') NOT NULL,
  sender_id CHAR(36) NULL,
  message_type ENUM('text','image','file','voice','emoji','system') NOT NULL DEFAULT 'text',
  body TEXT NULL,
  attachment_s3_key VARCHAR(512) NULL,
  attachment_mime VARCHAR(120) NULL,
  attachment_name VARCHAR(255) NULL,
  attachment_size INT NULL,
  is_seen TINYINT(1) NOT NULL DEFAULT 0,
  seen_at DATETIME NULL,
  meta JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_va_msg_conv (conversation_id, created_at),
  CONSTRAINT fk_va_msg_conv FOREIGN KEY (conversation_id) REFERENCES va_chat_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS va_chat_canned_replies (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  department_id CHAR(36) NULL,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  shortcut VARCHAR(40) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_va_canned_site (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS va_visitor_notes (
  id CHAR(36) PRIMARY KEY,
  visitor_id CHAR(36) NOT NULL,
  operator_id CHAR(36) NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_va_notes_visitor (visitor_id),
  CONSTRAINT fk_va_notes_visitor FOREIGN KEY (visitor_id) REFERENCES va_visitors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS va_visitor_tags (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#2563eb',
  UNIQUE KEY uq_va_tag (site_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS va_visitor_tag_map (
  visitor_id CHAR(36) NOT NULL,
  tag_id CHAR(36) NOT NULL,
  PRIMARY KEY (visitor_id, tag_id),
  CONSTRAINT fk_va_tagmap_visitor FOREIGN KEY (visitor_id) REFERENCES va_visitors(id) ON DELETE CASCADE,
  CONSTRAINT fk_va_tagmap_tag FOREIGN KEY (tag_id) REFERENCES va_visitor_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_notifications (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  type ENUM(
    'new_visitor','new_chat','booking_started','booking_completed',
    'payment_success','missed_chat'
  ) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id CHAR(36) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  meta JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_va_notif_site (site_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Daily rollup reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_daily_stats (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  day_date DATE NOT NULL,
  visitors_new INT NOT NULL DEFAULT 0,
  visitors_returning INT NOT NULL DEFAULT 0,
  sessions INT NOT NULL DEFAULT 0,
  pageviews INT NOT NULL DEFAULT 0,
  chats INT NOT NULL DEFAULT 0,
  bookings_started INT NOT NULL DEFAULT 0,
  bookings_completed INT NOT NULL DEFAULT 0,
  payments_success INT NOT NULL DEFAULT 0,
  avg_session_ms INT NOT NULL DEFAULT 0,
  top_landing_pages JSON NULL,
  top_exit_pages JSON NULL,
  top_vehicles JSON NULL,
  top_buttons JSON NULL,
  top_campaigns JSON NULL,
  top_search_terms JSON NULL,
  UNIQUE KEY uq_va_daily (site_id, day_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Offline chat form submissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_offline_forms (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  visitor_id CHAR(36) NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(40) NULL,
  message TEXT NOT NULL,
  page_url VARCHAR(2048) NULL,
  is_handled TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_va_offline_site (site_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- AI lead capture
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS va_ai_leads (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  conversation_id CHAR(36) NULL,
  visitor_id CHAR(36) NULL,
  customer_name VARCHAR(160) NULL,
  phone VARCHAR(40) NULL,
  pickup VARCHAR(512) NULL,
  dropoff VARCHAR(512) NULL,
  travel_date DATE NULL,
  vehicle VARCHAR(80) NULL,
  status ENUM('collecting','complete','transferred') NOT NULL DEFAULT 'collecting',
  meta JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_va_ai_leads_site (site_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Seed default Vizag Taxi Hub site (replace public_key in production)
INSERT INTO va_sites (id, name, domain, public_key, retention_days)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Vizag Taxi Hub',
  'vizagtaxihub.com',
  'vth_pk_live_replace_me',
  90
) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO va_funnels (id, site_id, name, steps, is_default)
VALUES (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  'Booking Funnel',
  JSON_ARRAY(
    JSON_OBJECT('name', 'Landing Page', 'event', 'page_view', 'match', JSON_OBJECT('path', '/')),
    JSON_OBJECT('name', 'Vehicle Page', 'event', 'page_view', 'match', JSON_OBJECT('pathContains', '/vehicle')),
    JSON_OBJECT('name', 'Booking Form', 'event', 'booking_started'),
    JSON_OBJECT('name', 'Payment', 'event', 'razorpay_payment'),
    JSON_OBJECT('name', 'Confirmation', 'event', 'booking_completed')
  ),
  1
) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO va_chat_departments (id, site_id, name, description, sort_order)
VALUES
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001', 'Sales', 'Booking & pricing help', 1),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'Support', 'Trip & payment support', 2)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO va_chat_canned_replies (id, site_id, title, body, shortcut)
VALUES
  ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000001',
   'Greeting', 'Hello! Welcome to Vizag Taxi Hub. How can I help you today?', '/hi'),
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001',
   'Airport taxi', 'We offer reliable airport taxi transfers in Vizag. Share your flight time and pickup point for a quote.', '/airport'),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000001',
   'Outstation', 'For outstation trips please share pickup, drop, date and preferred vehicle (Sedan / SUV / Tempo Traveller).', '/outstation')
ON DUPLICATE KEY UPDATE title = VALUES(title);
