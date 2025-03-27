
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
  `user_id` int(11) NULL, -- NULL for guest bookings
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
  `driver_name` varchar(100) NULL,
  `driver_phone` varchar(20) NULL,
  `vehicle_number` varchar(50) NULL,
  `admin_notes` text NULL,
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

-- Vehicle Pricing Table - FIXED column names for local fares
CREATE TABLE `vehicle_pricing` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` varchar(50) NOT NULL,
  `trip_type` varchar(50) NOT NULL DEFAULT 'outstation',
  `base_fare` decimal(10,2) NOT NULL DEFAULT 0,
  `price_per_km` decimal(5,2) NOT NULL DEFAULT 0,
  `night_halt_charge` decimal(10,2) NOT NULL DEFAULT 0,
  `driver_allowance` decimal(10,2) NOT NULL DEFAULT 0,
  -- Local package specific columns (FIXED column names)  
  `local_package_4hr` decimal(10,2) DEFAULT NULL,
  `local_package_8hr` decimal(10,2) DEFAULT NULL,
  `local_package_10hr` decimal(10,2) DEFAULT NULL,
  `extra_km_charge` decimal(5,2) DEFAULT NULL,
  `extra_hour_charge` decimal(5,2) DEFAULT NULL,
  -- Airport specific columns
  `airport_base_price` decimal(10,2) DEFAULT NULL,
  `airport_price_per_km` decimal(5,2) DEFAULT NULL,
  `airport_drop_price` decimal(10,2) DEFAULT NULL,
  `airport_pickup_price` decimal(10,2) DEFAULT NULL,
  -- Airport tier pricing
  `airport_tier1_price` decimal(10,2) DEFAULT NULL,
  `airport_tier2_price` decimal(10,2) DEFAULT NULL,
  `airport_tier3_price` decimal(10,2) DEFAULT NULL,
  `airport_tier4_price` decimal(10,2) DEFAULT NULL,
  `airport_extra_km_charge` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_trip_type` (`vehicle_id`, `trip_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vehicle Types Table
CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` varchar(50) NOT NULL UNIQUE,
  `name` varchar(100) NOT NULL,
  `capacity` int(11) NOT NULL DEFAULT 4,
  `luggage_capacity` int(11) NOT NULL DEFAULT 2,
  `ac` tinyint(1) NOT NULL DEFAULT 1,
  `image` varchar(255) DEFAULT '/cars/sedan.png',
  `amenities` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- Airport Transfer Fares Table
CREATE TABLE `airport_transfer_fares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` varchar(50) NOT NULL,
  `base_price` decimal(10,2) NOT NULL DEFAULT 0,
  `price_per_km` decimal(5,2) NOT NULL DEFAULT 0,
  `pickup_price` decimal(10,2) NOT NULL DEFAULT 0,
  `drop_price` decimal(10,2) NOT NULL DEFAULT 0,
  `tier1_price` decimal(10,2) NOT NULL DEFAULT 0,
  `tier2_price` decimal(10,2) NOT NULL DEFAULT 0,
  `tier3_price` decimal(10,2) NOT NULL DEFAULT 0,
  `tier4_price` decimal(10,2) NOT NULL DEFAULT 0,
  `extra_km_charge` decimal(5,2) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_id` (`vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Local Package Fares Table
CREATE TABLE `local_package_fares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` varchar(50) NOT NULL,
  `price_4hrs_40km` decimal(10,2) NOT NULL DEFAULT 0,
  `price_8hrs_80km` decimal(10,2) NOT NULL DEFAULT 0,
  `price_10hrs_100km` decimal(10,2) NOT NULL DEFAULT 0,
  `price_extra_km` decimal(5,2) NOT NULL DEFAULT 0,
  `price_extra_hour` decimal(5,2) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_id` (`vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Outstation Fares Table
CREATE TABLE `outstation_fares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` varchar(50) NOT NULL,
  `base_price` decimal(10,2) NOT NULL DEFAULT 0,
  `price_per_km` decimal(5,2) NOT NULL DEFAULT 0,
  `night_halt_charge` decimal(10,2) NOT NULL DEFAULT 0,
  `driver_allowance` decimal(10,2) NOT NULL DEFAULT 0,
  `roundtrip_base_price` decimal(10,2) DEFAULT 0,
  `roundtrip_price_per_km` decimal(5,2) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_id` (`vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default data for tours
INSERT INTO `tour_fares` (`tour_id`, `tour_name`, `sedan`, `ertiga`, `innova`, `tempo`, `luxury`) VALUES
('araku', 'Araku Day Tour', 5000, 6500, 8000, 12000, 15000),
('vizag', 'Vizag City Tour', 3000, 4000, 5500, 8000, 10000),
('lambasingi', 'Lambasingi Tour', 5500, 7000, 8500, 12500, 16000),
('srikakulam', 'Srikakulam Pilgrim Tour', 6500, 8000, 9500, 14000, 18000),
('annavaram', 'Annavaram Tour', 6000, 7500, 9000, 13500, 17000),
('vanajangi', 'Vanajangi Tour', 5500, 7000, 8500, 12500, 16000);

-- Insert default data for vehicle pricing (compatibility with old schema)
INSERT INTO `vehicle_pricing` (`vehicle_id`, `trip_type`, `base_fare`, `price_per_km`, `night_halt_charge`, `driver_allowance`, 
                               `local_package_4hr`, `local_package_8hr`, `local_package_10hr`, `extra_km_charge`, `extra_hour_charge`,
                               `airport_base_price`, `airport_price_per_km`, `airport_pickup_price`, `airport_drop_price`,
                               `airport_tier1_price`, `airport_tier2_price`, `airport_tier3_price`, `airport_tier4_price`, `airport_extra_km_charge`) VALUES
('sedan', 'outstation', 4200, 14, 700, 250, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('sedan', 'local', 0, 0, 0, 0, 1200, 2200, 2500, 14, 250, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('sedan', 'airport', 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, 3000, 12, 800, 800, 600, 800, 1000, 1200, 12),
('ertiga', 'outstation', 5400, 18, 1000, 250, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('ertiga', 'local', 0, 0, 0, 0, 1500, 2700, 3000, 18, 250, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('ertiga', 'airport', 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, 3500, 15, 1000, 1000, 800, 1000, 1200, 1400, 15),
('innova_crysta', 'outstation', 6000, 20, 1000, 250, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('innova_crysta', 'local', 0, 0, 0, 0, 1800, 3000, 3500, 20, 250, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('innova_crysta', 'airport', 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, 4000, 17, 1200, 1200, 1000, 1200, 1400, 1600, 17),
('tempo', 'outstation', 9000, 22, 1500, 300, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('tempo', 'local', 0, 0, 0, 0, 3000, 4500, 5500, 22, 300, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('tempo', 'airport', 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, 6000, 19, 2000, 2000, 1600, 1800, 2000, 2500, 19),
('luxury', 'outstation', 10500, 25, 1500, 300, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('luxury', 'local', 0, 0, 0, 0, 3500, 5500, 6500, 25, 300, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('luxury', 'airport', 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, 7000, 22, 2500, 2500, 2000, 2200, 2500, 3000, 22);

-- Insert default vehicle types
INSERT INTO `vehicles` (`vehicle_id`, `name`, `capacity`, `luggage_capacity`, `ac`, `image`, `amenities`, `description`, `is_active`) VALUES
('sedan', 'Sedan', 4, 2, 1, '/cars/sedan.png', 'AC, Bottle Water, Music System', 'Comfortable sedan suitable for 4 passengers.', 1),
('ertiga', 'Ertiga', 6, 3, 1, '/cars/ertiga.png', 'AC, Bottle Water, Music System, Extra Legroom', 'Spacious SUV suitable for 6 passengers.', 1),
('innova_crysta', 'Innova Crysta', 7, 4, 1, '/cars/innova.png', 'AC, Bottle Water, Music System, Extra Legroom, Charging Point', 'Premium SUV with ample space for 7 passengers.', 1),
('tempo', 'Tempo Traveller', 12, 8, 1, '/cars/tempo.png', 'AC, Bottle Water, Music System, Extra Legroom, Charging Point', 'Spacious van suitable for group travel of up to 12 passengers.', 1),
('luxury', 'Luxury Sedan', 4, 3, 1, '/cars/luxury.png', 'AC, Bottle Water, Music System, Premium Leather Seats, WiFi, Charging Points', 'Premium luxury sedan with high-end amenities for a comfortable journey.', 1);

-- Insert default airport transfer fares
INSERT INTO `airport_transfer_fares` (`vehicle_id`, `base_price`, `price_per_km`, `pickup_price`, `drop_price`, 
                                    `tier1_price`, `tier2_price`, `tier3_price`, `tier4_price`, `extra_km_charge`) VALUES
('sedan', 3000, 12, 800, 800, 600, 800, 1000, 1200, 12),
('ertiga', 3500, 15, 1000, 1000, 800, 1000, 1200, 1400, 15),
('innova_crysta', 4000, 17, 1200, 1200, 1000, 1200, 1400, 1600, 17),
('tempo', 6000, 19, 2000, 2000, 1600, 1800, 2000, 2500, 19),
('luxury', 7000, 22, 2500, 2500, 2000, 2200, 2500, 3000, 22);

-- Insert default local package fares
INSERT INTO `local_package_fares` (`vehicle_id`, `price_4hrs_40km`, `price_8hrs_80km`, `price_10hrs_100km`, `price_extra_km`, `price_extra_hour`) VALUES
('sedan', 1200, 2200, 2500, 14, 250),
('ertiga', 1500, 2700, 3000, 18, 250),
('innova_crysta', 1800, 3000, 3500, 20, 250),
('tempo', 3000, 4500, 5500, 22, 300),
('luxury', 3500, 5500, 6500, 25, 300);

-- Insert default outstation fares
INSERT INTO `outstation_fares` (`vehicle_id`, `base_price`, `price_per_km`, `night_halt_charge`, `driver_allowance`, 
                              `roundtrip_base_price`, `roundtrip_price_per_km`) VALUES
('sedan', 4200, 14, 700, 250, 4000, 12),
('ertiga', 5400, 18, 1000, 250, 5000, 15),
('innova_crysta', 6000, 20, 1000, 250, 5600, 17),
('tempo', 9000, 22, 1500, 300, 8500, 19),
('luxury', 10500, 25, 1500, 300, 10000, 22);

-- Insert default admin user
INSERT INTO `users` (`name`, `email`, `phone`, `password`, `role`) VALUES
('Admin User', 'admin@example.com', '9876543210', '$2y$10$YPmH6FlAB8gQXI/qjLXVq.jlHCB1PRJKZRmj2aeMSCXvKBgNCHWc2', 'admin');
-- Default password: admin123
