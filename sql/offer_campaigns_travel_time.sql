-- Earliest trip pickup clock time (e.g. 08:00 when vehicles reach the airport).
-- NULL = any pickup time on the travel date.
-- Ignore "Duplicate column name" if already applied.

ALTER TABLE oc_campaigns
  ADD COLUMN travel_time_from TIME NULL
    COMMENT 'Earliest trip pickup time (NULL = any time)' AFTER travel_date_to;
