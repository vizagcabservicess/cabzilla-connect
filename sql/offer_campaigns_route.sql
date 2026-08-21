-- Airport / outstation campaign route (shown on offer cards & popups)
-- Coupon applies only when the customer trip matches this route.
-- Ignore "Duplicate column name" if already applied.
-- Hostinger: also SELECT/INSERT/UPDATE these columns in api/campaigns/admin.php and public.php.

ALTER TABLE oc_campaigns
  ADD COLUMN pickup_location VARCHAR(180) NULL
    COMMENT 'Offer pickup place (NULL = any / not shown)' AFTER travel_date_to;

ALTER TABLE oc_campaigns
  ADD COLUMN drop_location VARCHAR(180) NULL
    COMMENT 'Offer destination (NULL = any / not shown)' AFTER pickup_location;

ALTER TABLE oc_campaigns
  ADD COLUMN pickup_lat DECIMAL(10,7) NULL
    COMMENT 'Google Maps pickup lat' AFTER drop_location;

ALTER TABLE oc_campaigns
  ADD COLUMN pickup_lng DECIMAL(10,7) NULL
    COMMENT 'Google Maps pickup lng' AFTER pickup_lat;

ALTER TABLE oc_campaigns
  ADD COLUMN drop_lat DECIMAL(10,7) NULL
    COMMENT 'Google Maps destination lat' AFTER pickup_lng;

ALTER TABLE oc_campaigns
  ADD COLUMN drop_lng DECIMAL(10,7) NULL
    COMMENT 'Google Maps destination lng' AFTER drop_lat;
