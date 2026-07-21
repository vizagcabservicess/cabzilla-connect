-- Travel date window for campaigns (trip pickup dates the offer applies to)
-- Offer live window remains starts_at / ends_at (when customers can book the offer).
-- Ignore "Duplicate column name" if already applied.

ALTER TABLE oc_campaigns
  ADD COLUMN travel_date_from DATE NULL
    COMMENT 'Eligible trip pickup from (NULL = any)' AFTER ends_at;

ALTER TABLE oc_campaigns
  ADD COLUMN travel_date_to DATE NULL
    COMMENT 'Eligible trip pickup to (NULL = any)' AFTER travel_date_from;
