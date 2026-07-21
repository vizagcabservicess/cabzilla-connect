-- Add paused status for offer campaigns
-- Ignore duplicate/enum errors if already applied.

ALTER TABLE oc_campaigns
  MODIFY COLUMN status ENUM(
    'draft','scheduled','active','paused','expired','cancelled'
  ) NOT NULL DEFAULT 'draft';
