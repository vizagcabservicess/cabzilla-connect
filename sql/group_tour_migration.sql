-- Group Tour (Tempo Traveller Seat Sharing) Migration
-- Vizag Taxi Hub - 17-Seater Tempo Traveller

-- Tours table: routes with pickup, dropoff, date, price
CREATE TABLE IF NOT EXISTS `group_tour_tours` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `pickup_location` VARCHAR(255) NOT NULL,
  `dropoff_location` VARCHAR(255) NOT NULL,
  `travel_date` DATE NOT NULL,
  `price_per_seat` DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  `capacity` TINYINT UNSIGNED NOT NULL DEFAULT 17,
  `status` ENUM('active','inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pickup_dropoff_date` (`pickup_location`(50), `dropoff_location`(50), `travel_date`),
  KEY `idx_travel_date` (`travel_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seats table: per-tour seat status (S1-S17, DRIVER)
CREATE TABLE IF NOT EXISTS `group_tour_seats` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tour_id` INT(11) UNSIGNED NOT NULL,
  `seat_id` VARCHAR(10) NOT NULL,
  `status` ENUM('available','reserved','booked') NOT NULL DEFAULT 'available',
  `reservation_expires_at` DATETIME NULL,
  `reservation_id` VARCHAR(64) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tour_seat` (`tour_id`, `seat_id`),
  KEY `idx_status` (`status`),
  KEY `idx_reservation` (`reservation_expires_at`, `reservation_id`),
  CONSTRAINT `fk_seats_tour` FOREIGN KEY (`tour_id`) REFERENCES `group_tour_tours` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings table: completed paid bookings
CREATE TABLE IF NOT EXISTS `group_tour_bookings` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_number` VARCHAR(32) NOT NULL,
  `tour_id` INT(11) UNSIGNED NOT NULL,
  `razorpay_order_id` VARCHAR(64) NULL,
  `razorpay_payment_id` VARCHAR(64) NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `seat_count` TINYINT UNSIGNED NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_email` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `status` ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  `whatsapp_sent` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_booking_number` (`booking_number`),
  KEY `idx_tour` (`tour_id`),
  KEY `idx_payment` (`razorpay_payment_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_bookings_tour` FOREIGN KEY (`tour_id`) REFERENCES `group_tour_tours` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Booking seats junction table
CREATE TABLE IF NOT EXISTS `group_tour_booking_seats` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` INT(11) UNSIGNED NOT NULL,
  `seat_id` VARCHAR(10) NOT NULL,
  `tour_id` INT(11) UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_booking_seat_tour` (`booking_id`, `seat_id`, `tour_id`),
  KEY `idx_booking` (`booking_id`),
  KEY `idx_tour_seat` (`tour_id`, `seat_id`),
  CONSTRAINT `fk_booking_seats_booking` FOREIGN KEY (`booking_id`) REFERENCES `group_tour_bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_booking_seats_tour` FOREIGN KEY (`tour_id`) REFERENCES `group_tour_tours` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default seat layout for a new tour (helper stored proc / app logic)
-- Seat layout: Row1: S1 | Row2: S2-S5 | Row3: S6-S9 | Row4: S10-S13 | Row5: S14-S17

-- Insert sample tours for testing (optional - remove in production)
INSERT INTO `group_tour_tours` (`pickup_location`, `dropoff_location`, `travel_date`, `price_per_seat`, `capacity`, `status`)
SELECT 'Visakhapatnam Airport', 'Araku Valley', CURDATE() + INTERVAL 1 DAY, 500.00, 17, 'active'
WHERE NOT EXISTS (SELECT 1 FROM `group_tour_tours` LIMIT 1);

-- Create seats for the sample tour (and any tour missing seats)
INSERT IGNORE INTO `group_tour_seats` (`tour_id`, `seat_id`, `status`)
SELECT t.id, s.seat_id, 'available'
FROM `group_tour_tours` t
CROSS JOIN (
  SELECT 'S1' as seat_id UNION SELECT 'S2' UNION SELECT 'S3' UNION SELECT 'S4' UNION SELECT 'S5'
  UNION SELECT 'S6' UNION SELECT 'S7' UNION SELECT 'S8' UNION SELECT 'S9' UNION SELECT 'S10'
  UNION SELECT 'S11' UNION SELECT 'S12' UNION SELECT 'S13' UNION SELECT 'S14' UNION SELECT 'S15'
  UNION SELECT 'S16' UNION SELECT 'S17'
) s
WHERE NOT EXISTS (SELECT 1 FROM `group_tour_seats` gs WHERE gs.tour_id = t.id AND gs.seat_id = s.seat_id);
