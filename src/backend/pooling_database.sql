
-- Complete Pooling System Database Schema
-- Run this SQL in your phpMyAdmin

-- Create pooling_providers table
CREATE TABLE IF NOT EXISTS `pooling_providers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT 0.00,
  `total_ratings` int(11) DEFAULT 0,
  `is_verified` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `license_number` (`license_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create pooling_vehicles table
CREATE TABLE IF NOT EXISTS `pooling_vehicles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider_id` int(11) NOT NULL,
  `make` varchar(50) NOT NULL,
  `model` varchar(50) NOT NULL,
  `color` varchar(30) NOT NULL,
  `plate_number` varchar(20) NOT NULL,
  `vehicle_type` enum('car','bus','shared-taxi') NOT NULL,
  `total_seats` int(11) NOT NULL,
  `amenities` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plate_number` (`plate_number`),
  KEY `provider_id` (`provider_id`),
  FOREIGN KEY (`provider_id`) REFERENCES `pooling_providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create pooling_rides table
CREATE TABLE IF NOT EXISTS `pooling_rides` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider_id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `type` enum('car','bus','shared-taxi') NOT NULL,
  `from_location` varchar(100) NOT NULL,
  `to_location` varchar(100) NOT NULL,
  `departure_time` datetime NOT NULL,
  `arrival_time` datetime DEFAULT NULL,
  `total_seats` int(11) NOT NULL,
  `available_seats` int(11) NOT NULL,
  `price_per_seat` decimal(10,2) NOT NULL,
  `route_stops` json DEFAULT NULL,
  `amenities` json DEFAULT NULL,
  `rules` json DEFAULT NULL,
  `status` enum('active','completed','cancelled','full') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `provider_id` (`provider_id`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `departure_time` (`departure_time`),
  KEY `from_location` (`from_location`),
  KEY `to_location` (`to_location`),
  KEY `status` (`status`),
  FOREIGN KEY (`provider_id`) REFERENCES `pooling_providers` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vehicle_id`) REFERENCES `pooling_vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create pooling_bookings table
CREATE TABLE IF NOT EXISTS `pooling_bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ride_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `passenger_name` varchar(100) NOT NULL,
  `passenger_phone` varchar(20) NOT NULL,
  `passenger_email` varchar(100) NOT NULL,
  `seats_booked` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `booking_status` enum('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  `payment_status` enum('pending','paid','failed','refunded') DEFAULT 'pending',
  `payment_id` varchar(100) DEFAULT NULL,
  `razorpay_order_id` varchar(100) DEFAULT NULL,
  `razorpay_payment_id` varchar(100) DEFAULT NULL,
  `special_requests` text DEFAULT NULL,
  `booking_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ride_id` (`ride_id`),
  KEY `user_id` (`user_id`),
  KEY `booking_status` (`booking_status`),
  KEY `payment_status` (`payment_status`),
  FOREIGN KEY (`ride_id`) REFERENCES `pooling_rides` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create pooling_payments table
CREATE TABLE IF NOT EXISTS `pooling_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `payment_method` varchar(50) DEFAULT NULL,
  `razorpay_order_id` varchar(100) DEFAULT NULL,
  `razorpay_payment_id` varchar(100) DEFAULT NULL,
  `razorpay_signature` varchar(255) DEFAULT NULL,
  `status` enum('pending','success','failed','refunded') DEFAULT 'pending',
  `payment_date` datetime DEFAULT NULL,
  `refund_amount` decimal(10,2) DEFAULT 0.00,
  `refund_date` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `razorpay_payment_id` (`razorpay_payment_id`),
  KEY `status` (`status`),
  FOREIGN KEY (`booking_id`) REFERENCES `pooling_bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create pooling_reviews table
CREATE TABLE IF NOT EXISTS `pooling_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `review_text` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `provider_id` (`provider_id`),
  KEY `user_id` (`user_id`),
  FOREIGN KEY (`booking_id`) REFERENCES `pooling_bookings` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`provider_id`) REFERENCES `pooling_providers` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample providers
INSERT INTO `pooling_providers` (`name`, `phone`, `email`, `license_number`, `rating`, `total_ratings`, `is_verified`, `is_active`) VALUES
('Ravi Kumar', '+919876543210', 'ravi.kumar@example.com', 'AP12345678901', 4.5, 50, 1, 1),
('Prasad Taxi Service', '+919988776655', 'prasad.taxi@example.com', 'AP98765432109', 4.2, 30, 1, 1),
('Suresh Reddy', '+919123456789', 'suresh.reddy@example.com', 'AP11223344556', 4.8, 75, 1, 1),
('APSRTC', '+919999888777', 'contact@apsrtc.gov.in', 'APSRTC001', 4.0, 100, 1, 1),
('Venkat Travels', '+919876512345', 'venkat.travels@example.com', 'AP55667788990', 4.3, 40, 1, 1);

-- Insert sample vehicles
INSERT INTO `pooling_vehicles` (`provider_id`, `make`, `model`, `color`, `plate_number`, `vehicle_type`, `total_seats`, `amenities`) VALUES
(1, 'Maruti', 'Swift', 'White', 'AP05AB1234', 'car', 4, '["AC", "Music", "Bottle Water"]'),
(2, 'Hyundai', 'i20', 'Silver', 'AP33CD5678', 'shared-taxi', 4, '["AC", "Music"]'),
(3, 'Toyota', 'Innova', 'Grey', 'AP39GH3456', 'car', 7, '["AC", "Music", "Phone Charger"]'),
(4, 'Ashok Leyland', 'Luxury Bus', 'Red', 'AP28BUS001', 'bus', 45, '["AC", "WiFi", "Entertainment", "Reclining Seats"]'),
(5, 'Mahindra', 'Bolero', 'Black', 'AP12KL7890', 'car', 6, '["AC", "Music"]');

-- Insert sample rides for next 7 days
INSERT INTO `pooling_rides` (`provider_id`, `vehicle_id`, `type`, `from_location`, `to_location`, `departure_time`, `arrival_time`, `total_seats`, `available_seats`, `price_per_seat`, `route_stops`, `amenities`, `rules`) VALUES
(1, 1, 'car', 'Visakhapatnam', 'Hyderabad', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY + INTERVAL 6 HOUR), 4, 3, 450.00, '["Vizianagaram", "Rajam"]', '["AC", "Music"]', '["No smoking", "Be punctual"]'),
(2, 2, 'shared-taxi', 'Vijayawada', 'Guntur', DATE_ADD(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY + INTERVAL 2 HOUR), 4, 2, 150.00, '["Tenali"]', '["AC"]', '["No smoking", "Cash payment only"]'),
(3, 3, 'car', 'Visakhapatnam', 'Vijayawada', DATE_ADD(NOW(), INTERVAL 1 DAY + INTERVAL 8 HOUR), DATE_ADD(NOW(), INTERVAL 1 DAY + INTERVAL 14 HOUR), 7, 5, 600.00, '["Rajahmundry", "Eluru"]', '["AC", "Music", "Phone Charger"]', '["No smoking", "No loud music"]'),
(4, 4, 'bus', 'Hyderabad', 'Visakhapatnam', DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY + INTERVAL 8 HOUR), 45, 30, 350.00, '["Warangal", "Khammam", "Rajahmundry"]', '["AC", "WiFi", "Entertainment"]', '["No smoking", "Keep tickets ready"]'),
(5, 5, 'car', 'Tirupati', 'Chennai', DATE_ADD(NOW(), INTERVAL 2 DAY + INTERVAL 6 HOUR), DATE_ADD(NOW(), INTERVAL 2 DAY + INTERVAL 10 HOUR), 6, 4, 400.00, '["Chittoor", "Vellore"]', '["AC", "Music"]', '["No smoking", "Be punctual"]);

-- Create indexes for better performance
CREATE INDEX idx_rides_search ON pooling_rides (from_location, to_location, departure_time, status);
CREATE INDEX idx_bookings_user ON pooling_bookings (user_id, booking_status);
CREATE INDEX idx_payments_status ON pooling_payments (status, payment_date);
CREATE INDEX idx_reviews_provider ON pooling_reviews (provider_id, rating);
