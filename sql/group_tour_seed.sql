-- Seed sample group tours for Vizag Taxi Hub (next 30 days)
-- Run after group_tour_migration.sql and group_tour_extended_columns.sql:
--   mysql -u USER -p DATABASE < sql/group_tour_seed.sql

INSERT INTO `group_tour_tours` (
  `title`,
  `pickup_location`,
  `dropoff_location`,
  `travel_date`,
  `expiry_date`,
  `price_per_seat`,
  `capacity`,
  `status`
)
SELECT * FROM (
  SELECT
    'Araku Valley Group Tour' AS title,
    'Visakhapatnam Airport' AS pickup_location,
    'Araku Valley' AS dropoff_location,
    CURDATE() + INTERVAL 3 DAY AS travel_date,
    NULL AS expiry_date,
    500.00 AS price_per_seat,
    17 AS capacity,
    'active' AS status
  UNION ALL
  SELECT
    'Araku Valley Group Tour',
    'Vizag City',
    'Araku Valley',
    CURDATE() + INTERVAL 7 DAY,
    NULL,
    500.00,
    17,
    'active'
  UNION ALL
  SELECT
    'Araku Valley Group Tour',
    'Visakhapatnam Airport',
    'Araku Valley',
    CURDATE() + INTERVAL 14 DAY,
    NULL,
    450.00,
    17,
    'active'
) AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM `group_tour_tours`
  WHERE `status` = 'active'
    AND `travel_date` >= CURDATE()
  LIMIT 1
);

-- Create seats for any tour missing them
INSERT IGNORE INTO `group_tour_seats` (`tour_id`, `seat_id`, `status`)
SELECT t.id, s.seat_id, 'available'
FROM `group_tour_tours` t
CROSS JOIN (
  SELECT 'S1' AS seat_id UNION SELECT 'S2' UNION SELECT 'S3' UNION SELECT 'S4' UNION SELECT 'S5'
  UNION SELECT 'S6' UNION SELECT 'S7' UNION SELECT 'S8' UNION SELECT 'S9' UNION SELECT 'S10'
  UNION SELECT 'S11' UNION SELECT 'S12' UNION SELECT 'S13' UNION SELECT 'S14' UNION SELECT 'S15'
  UNION SELECT 'S16' UNION SELECT 'S17'
) s
WHERE t.status = 'active'
  AND t.travel_date >= CURDATE()
  AND NOT EXISTS (
    SELECT 1
    FROM `group_tour_seats` gs
    WHERE gs.tour_id = t.id
      AND gs.seat_id = s.seat_id
  );
