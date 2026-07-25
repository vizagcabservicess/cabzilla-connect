-- Capture Google Ads click id on sessions.
-- If column/index already exists, ignore the duplicate-column / duplicate-key error and continue.
ALTER TABLE va_sessions
  ADD COLUMN gclid VARCHAR(255) NULL AFTER utm_content;

ALTER TABLE va_sessions
  ADD INDEX idx_va_sessions_gclid (site_id, gclid);

ALTER TABLE va_sessions
  ADD INDEX idx_va_sessions_utm_source (site_id, utm_source);
