-- Actual trip start when driver starts trip (in_progress). Run once if column missing.
-- Application code also runs ALTER when the column is absent.
ALTER TABLE bookings ADD COLUMN trip_started_at DATETIME NULL;
