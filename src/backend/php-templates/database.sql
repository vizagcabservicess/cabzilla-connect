
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
  `distance` float NULL DEFAULT 0,
  `trip_type` enum('outstation','local','airport','tour') NOT NULL,
  `trip_mode` enum('one-way','round-trip') NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  `passenger_name` varchar(100) NOT NULL,
  `passenger_phone` varchar(20) NOT NULL,
  `passenger_email` varchar(100) NOT NULL,
  `hourly_package` varchar(50) NULL,
  `tour_id` varchar(50) NULL,
  `driver_id` int(11) NULL,
  `driver_name` varchar(100) NULL,
  `driver_phone` varchar(20) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Drivers Table
CREATE TABLE `drivers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(100) NULL,
  `license_number` varchar(50) NOT NULL,
  `vehicle_number` varchar(20) NOT NULL,
  `vehicle_type` varchar(50) NOT NULL,
  `status` enum('available','busy','offline') NOT NULL DEFAULT 'available',
  `rating` decimal(3,1) DEFAULT '5.0',
  `total_trips` int(11) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ratings Table
CREATE TABLE `ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `driver_id` int(11) NOT NULL,
  `rating` int(1) NOT NULL,
  `review` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `user_id` (`user_id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_3` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE
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

-- Insert sample drivers
INSERT INTO `drivers` (`name`, `phone`, `email`, `license_number`, `vehicle_number`, `vehicle_type`, `status`) VALUES
('Rajesh Kumar', '9876543201', 'rajesh@example.com', 'DL-1234567890', 'AP-01-AB-1234', 'sedan', 'available'),
('Suresh Singh', '9876543202', 'suresh@example.com', 'DL-2345678901', 'AP-02-CD-2345', 'sedan', 'available'),
('Anil Verma', '9876543203', 'anil@example.com', 'DL-3456789012', 'AP-03-EF-3456', 'ertiga', 'busy'),
('Vikram Patel', '9876543204', 'vikram@example.com', 'DL-4567890123', 'AP-04-GH-4567', 'innova', 'available'),
('Manoj Das', '9876543205', 'manoj@example.com', 'DL-5678901234', 'AP-05-IJ-5678', 'innova', 'busy'),
('Gopal Rao', '9876543206', 'gopal@example.com', 'DL-6789012345', 'AP-06-KL-6789', 'tempo', 'available'),
('Satish Sharma', '9876543207', 'satish@example.com', 'DL-7890123456', 'AP-07-MN-7890', 'luxury', 'busy'),
('Kiran Joshi', '9876543208', 'kiran@example.com', 'DL-8901234567', 'AP-08-OP-8901', 'sedan', 'available'),
('Rahul Mishra', '9876543209', 'rahul@example.com', 'DL-9012345678', 'AP-09-QR-9012', 'ertiga', 'busy'),
('Dinesh Gupta', '9876543210', 'dinesh@example.com', 'DL-0123456789', 'AP-10-ST-0123', 'sedan', 'available'),
('Praveen Reddy', '9876543211', 'praveen@example.com', 'DL-1122334455', 'AP-11-UV-1122', 'innova', 'available'),
('Naveen Kumar', '9876543212', 'naveen@example.com', 'DL-2233445566', 'AP-12-WX-2233', 'sedan', 'busy'),
('Srinivas Rao', '9876543213', 'srinivas@example.com', 'DL-3344556677', 'AP-13-YZ-3344', 'ertiga', 'available'),
('Vamsi Krishna', '9876543214', 'vamsi@example.com', 'DL-4455667788', 'AP-14-AB-4455', 'tempo', 'available'),
('Ravi Shankar', '9876543215', 'ravi@example.com', 'DL-5566778899', 'AP-15-CD-5566', 'luxury', 'busy'),
('Harish Chandra', '9876543216', 'harish@example.com', 'DL-6677889900', 'AP-16-EF-6677', 'sedan', 'available'),
('Mahesh Babu', '9876543217', 'mahesh@example.com', 'DL-7788990011', 'AP-17-GH-7788', 'innova', 'available'),
('Venkat Rao', '9876543218', 'venkat@example.com', 'DL-8899001122', 'AP-18-IJ-8899', 'sedan', 'busy'),
('Ramesh Kumar', '9876543219', 'ramesh@example.com', 'DL-9900112233', 'AP-19-KL-9900', 'ertiga', 'available'),
('Sai Kumar', '9876543220', 'sai@example.com', 'DL-0011223344', 'AP-20-MN-0011', 'luxury', 'available');

-- Insert sample ratings
INSERT INTO `ratings` (`booking_id`, `user_id`, `driver_id`, `rating`, `review`) VALUES
(1, 1, 3, 5, 'Excellent service, very professional driver'),
(2, 1, 5, 4, 'Good experience, driver was polite and on time'),
(3, 1, 7, 5, 'Amazing experience, very comfortable journey'),
(4, 1, 9, 4, 'Good service, vehicle was clean and well maintained'),
(5, 1, 12, 5, 'Perfect ride, driver was very knowledgeable about routes');
