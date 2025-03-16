
-- Database schema for Cab Booking System

-- Users Table
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL UNIQUE,
  `phone` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bookings Table
CREATE TABLE `bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NULL, -- Can be NULL for guest bookings
  `booking_number` varchar(20) NOT NULL UNIQUE,
  `pickup_location` varchar(255) NOT NULL,
  `drop_location` varchar(255) NULL,
  `pickup_date` datetime NOT NULL,
  `return_date` datetime NULL,
  `cab_type` varchar(50) NOT NULL,
  `distance` float NOT NULL,
  `trip_type` enum('outstation','local','airport','tour') NOT NULL,
  `trip_mode` enum('one-way','round-trip') NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  `passenger_name` varchar(100) NOT NULL,
  `passenger_phone` varchar(20) NOT NULL,
  `passenger_email` varchar(100) NOT NULL,
  `hourly_package` varchar(50) NULL,
  `tour_id` varchar(50) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tour Fares Table
CREATE TABLE `tour_fares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tour_id` varchar(50) NOT NULL UNIQUE,
  `tour_name` varchar(100) NOT NULL,
  `sedan` decimal(10,2) NOT NULL,
  `ertiga` decimal(10,2) NOT NULL,
  `innova` decimal(10,2) NOT NULL,
  `tempo` decimal(10,2) NOT NULL,
  `luxury` decimal(10,2) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vehicle Pricing Table
CREATE TABLE `vehicle_pricing` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_type` varchar(50) NOT NULL UNIQUE,
  `base_price` decimal(10,2) NOT NULL,
  `price_per_km` decimal(5,2) NOT NULL,
  `night_halt_charge` decimal(10,2) NOT NULL,
  `driver_allowance` decimal(10,2) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin Settings Table
CREATE TABLE `admin_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(50) NOT NULL UNIQUE,
  `setting_value` text NOT NULL,
  `description` varchar(255) NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default data for tours
INSERT INTO `tour_fares` (`tour_id`, `tour_name`, `sedan`, `ertiga`, `innova`, `tempo`, `luxury`) VALUES
('araku', 'Araku Day Tour', 5000, 6500, 8000, 12000, 15000),
('vizag', 'Vizag City Tour', 3000, 4000, 5500, 8000, 10000),
('lambasingi', 'Lambasingi Tour', 5500, 7000, 8500, 12500, 16000),
('srikakulam', 'Srikakulam Pilgrim Tour', 6500, 8000, 9500, 14000, 18000),
('annavaram', 'Annavaram Tour', 6000, 7500, 9000, 13500, 17000),
('vanajangi', 'Vanajangi Tour', 5500, 7000, 8500, 12500, 16000);

-- Insert default data for vehicle pricing
INSERT INTO `vehicle_pricing` (`vehicle_type`, `base_price`, `price_per_km`, `night_halt_charge`, `driver_allowance`) VALUES
('sedan', 4200, 14, 700, 250),
('ertiga', 5400, 18, 1000, 250),
('innova', 6000, 20, 1000, 250),
('tempo', 9000, 22, 1500, 300),
('luxury', 10500, 25, 1500, 300);

-- Insert default admin user
INSERT INTO `users` (`name`, `email`, `phone`, `password`, `role`) VALUES
('Admin User', 'admin@example.com', '9876543210', '$2y$10$YPmH6FlAB8gQXI/qjLXVq.jlHCB1PRJKZRmj2aeMSCXvKBgNCHWc2', 'admin');
-- Default password: admin123
