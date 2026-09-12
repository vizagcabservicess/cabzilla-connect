-- Link guest/website/admin bookings to registered customers by phone (last 10 digits).
-- Only updates rows that are not already attached to a real user (user_id IS NULL or 0).
-- Review the SELECT first, then run the UPDATE.

SELECT
  b.id,
  b.booking_number,
  b.passenger_name,
  b.passenger_phone,
  b.user_id AS current_user_id,
  u.id AS matched_user_id,
  u.name AS matched_user_name,
  u.phone AS matched_user_phone
FROM bookings b
INNER JOIN users u
  ON RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(b.passenger_phone, ''), '+', ''), '-', ''), ' ', ''), '(', ''), ')', ''), '.', ''), 10)
   = RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(u.phone, ''), '+', ''), '-', ''), ' ', ''), '(', ''), ')', ''), '.', ''), 10)
WHERE (b.user_id IS NULL OR b.user_id = 0)
  AND u.phone IS NOT NULL
  AND u.phone <> ''
  AND CHAR_LENGTH(RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(u.phone, ''), '+', ''), '-', ''), ' ', ''), '(', ''), ')', ''), '.', ''), 10)) = 10
ORDER BY b.id DESC;

UPDATE bookings b
INNER JOIN users u
  ON RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(b.passenger_phone, ''), '+', ''), '-', ''), ' ', ''), '(', ''), ')', ''), '.', ''), 10)
   = RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(u.phone, ''), '+', ''), '-', ''), ' ', ''), '(', ''), ')', ''), '.', ''), 10)
SET b.user_id = u.id
WHERE (b.user_id IS NULL OR b.user_id = 0)
  AND u.phone IS NOT NULL
  AND u.phone <> ''
  AND CHAR_LENGTH(RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(u.phone, ''), '+', ''), '-', ''), ' ', ''), '(', ''), ')', ''), '.', ''), 10)) = 10;
