-- City is already on visitors/sessions; add Indian-style pincode (postal code).
-- Ignore duplicate-column errors if already applied.

ALTER TABLE va_visitors
  ADD COLUMN pincode VARCHAR(20) NULL AFTER city;

ALTER TABLE va_sessions
  ADD COLUMN pincode VARCHAR(20) NULL AFTER city;

ALTER TABLE va_visitors
  ADD INDEX idx_va_visitors_pincode (site_id, pincode);

ALTER TABLE va_sessions
  ADD INDEX idx_va_sessions_city (site_id, city);
