-- Expand offer campaign categories: Tour + Outstation one-way / round-trip
-- Safe to re-run. Prefer VARCHAR widen (runtime schema) then ENUM update if tables used migration ENUM.

-- Widen VARCHAR schemas (ocEnsureSchema / mixed installs)
ALTER TABLE oc_campaigns MODIFY COLUMN category VARCHAR(32) NOT NULL;
ALTER TABLE oc_campaign_events MODIFY COLUMN category VARCHAR(32) DEFAULT NULL;

-- If columns are still ENUM from the original migration, expand them:
-- (Ignore error if already VARCHAR)
ALTER TABLE oc_campaigns
  MODIFY COLUMN category ENUM(
    'airport','local','outstation','tour',
    'outstation_one_way','outstation_round_trip'
  ) NOT NULL;

ALTER TABLE oc_campaign_events
  MODIFY COLUMN category ENUM(
    'airport','local','outstation','tour',
    'outstation_one_way','outstation_round_trip'
  ) DEFAULT NULL;

UPDATE oc_campaign_settings
SET setting_value = 'airport,local,tour,outstation_one_way,outstation_round_trip,outstation'
WHERE setting_key = 'v1_categories';
