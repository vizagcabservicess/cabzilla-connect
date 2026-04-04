-- Run once on production if `bookings.status` is ENUM or VARCHAR too small.
-- Without this, MySQL may store an empty string for `admin_created` (14 chars) and admin UI shows "—".
-- Safe to re-run on VARCHAR(>=40): MODIFY is idempotent for compatible types.

ALTER TABLE bookings
  MODIFY COLUMN status VARCHAR(40) NOT NULL DEFAULT 'pending';
