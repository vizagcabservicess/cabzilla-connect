-- Latest trip pickup clock time (e.g. 20:00 last airport pickup for this offer).
-- NULL = no end time on the travel date.
-- Ignore "Duplicate column name" if already applied.
-- Hostinger: also SELECT/INSERT/UPDATE travel_time_to in api/campaigns/admin.php, public.php, db.php.

ALTER TABLE oc_campaigns
  ADD COLUMN travel_time_to TIME NULL
    COMMENT 'Latest trip pickup time (NULL = no end time)' AFTER travel_time_from;
