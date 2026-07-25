-- IP fraud / quality signals for fake-click detection (ISP, proxy, datacenter).
-- Ignore duplicate-column errors if already applied.

ALTER TABLE va_sessions
  ADD COLUMN isp VARCHAR(160) NULL AFTER pincode;

ALTER TABLE va_sessions
  ADD COLUMN ip_org VARCHAR(190) NULL AFTER isp;

ALTER TABLE va_sessions
  ADD COLUMN is_proxy TINYINT(1) NOT NULL DEFAULT 0 AFTER ip_org;

ALTER TABLE va_sessions
  ADD COLUMN is_hosting TINYINT(1) NOT NULL DEFAULT 0 AFTER is_proxy;

ALTER TABLE va_sessions
  ADD COLUMN is_mobile_net TINYINT(1) NOT NULL DEFAULT 0 AFTER is_hosting;

ALTER TABLE va_sessions
  ADD INDEX idx_va_sessions_hosting (site_id, is_hosting, started_at);

ALTER TABLE va_visitors
  ADD COLUMN isp VARCHAR(160) NULL AFTER pincode;

ALTER TABLE va_visitors
  ADD COLUMN is_proxy TINYINT(1) NOT NULL DEFAULT 0 AFTER isp;

ALTER TABLE va_visitors
  ADD COLUMN is_hosting TINYINT(1) NOT NULL DEFAULT 0 AFTER is_proxy;
