-- Optional one-time backfill: trip Fuel column uses SUM(fuel_records.total_cost) WHERE booking_id = bookings.id.
-- Older driver saves only put bookingId inside JSON `notes`, so dashboard showed ₹0.
-- Run after columns `booking_id` / `driver_id` exist (ensureFuelRecordsColumns adds them).

UPDATE fuel_records fr
SET booking_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(fr.notes, '$.bookingId')) AS UNSIGNED)
WHERE fr.booking_id IS NULL
  AND fr.notes IS NOT NULL
  AND fr.notes LIKE '%bookingId%'
  AND JSON_VALID(fr.notes)
  AND JSON_EXTRACT(fr.notes, '$.bookingId') IS NOT NULL
  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(fr.notes, '$.bookingId')) AS UNSIGNED) > 0;
