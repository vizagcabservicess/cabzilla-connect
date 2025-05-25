
-- Enhanced Pooling System Database Schema
-- Import this file into your phpMyAdmin to create the enhanced pooling tables

-- Create enhanced pooling tables with all advanced features

-- 1. Cancellation Policies Table
CREATE TABLE IF NOT EXISTS `pooling_cancellation_policies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('customer','provider') NOT NULL DEFAULT 'customer',
  `hours_before_departure` int(11) NOT NULL DEFAULT 0,
  `refund_percentage` decimal(5,2) NOT NULL DEFAULT 100.00,
  `penalty_amount` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type_active` (`type`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Commission Tracking Table
CREATE TABLE IF NOT EXISTS `pooling_commissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL DEFAULT 15.00,
  `commission_amount` decimal(10,2) NOT NULL,
  `driver_payout` decimal(10,2) NOT NULL,
  `status` enum('pending','paid','disputed') NOT NULL DEFAULT 'pending',
  `payout_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`booking_id`) REFERENCES `pooling_bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Disputes Management Table
CREATE TABLE IF NOT EXISTS `pooling_disputes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `provider_id` int(11) NOT NULL,
  `type` enum('service_quality','payment','cancellation','behavior','other') NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `status` enum('pending','investigating','resolved','closed') NOT NULL DEFAULT 'pending',
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `resolution` text DEFAULT NULL,
  `compensation_amount` decimal(10,2) DEFAULT NULL,
  `assigned_to` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  FOREIGN KEY (`booking_id`) REFERENCES `pooling_bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Provider KYC Documents Table
CREATE TABLE IF NOT EXISTS `pooling_provider_kyc` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider_id` int(11) NOT NULL,
  `document_type` enum('driving_license','vehicle_registration','insurance','identity_proof') NOT NULL,
  `document_number` varchar(100) NOT NULL,
  `document_url` varchar(500) NOT NULL,
  `verification_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verified_by` varchar(100) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_provider_id` (`provider_id`),
  KEY `idx_verification_status` (`verification_status`),
  FOREIGN KEY (`provider_id`) REFERENCES `pooling_providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Provider Ratings Table
CREATE TABLE IF NOT EXISTS `pooling_provider_ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `booking_id` int(11) NOT NULL,
  `rating` decimal(2,1) NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `review` text DEFAULT NULL,
  `punctuality_rating` decimal(2,1) DEFAULT NULL,
  `vehicle_condition_rating` decimal(2,1) DEFAULT NULL,
  `behavior_rating` decimal(2,1) DEFAULT NULL,
  `safety_rating` decimal(2,1) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_booking_rating` (`booking_id`),
  KEY `idx_provider_id` (`provider_id`),
  FOREIGN KEY (`provider_id`) REFERENCES `pooling_providers` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`booking_id`) REFERENCES `pooling_bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Wallet System Table
CREATE TABLE IF NOT EXISTS `pooling_wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `user_type` enum('customer','provider') NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `locked_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_earnings` decimal(10,2) DEFAULT 0.00,
  `total_spent` decimal(10,2) DEFAULT 0.00,
  `last_transaction_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_wallet` (`user_id`, `user_type`),
  KEY `idx_user_type` (`user_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS `pooling_wallet_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wallet_id` int(11) NOT NULL,
  `type` enum('credit','debit','lock','unlock') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `purpose` enum('booking_payment','refund','commission','penalty','compensation','withdrawal') NOT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  `status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wallet_id` (`wallet_id`),
  KEY `idx_type` (`type`),
  KEY `idx_purpose` (`purpose`),
  FOREIGN KEY (`wallet_id`) REFERENCES `pooling_wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Terms and Conditions Table
CREATE TABLE IF NOT EXISTS `pooling_terms_conditions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `version` varchar(20) NOT NULL,
  `type` enum('customer','provider','general') NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `effective_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type_active` (`type`, `is_active`),
  KEY `idx_version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Route Stops Table for Multi-stop Routes
CREATE TABLE IF NOT EXISTS `pooling_route_stops` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ride_id` int(11) NOT NULL,
  `stop_order` int(11) NOT NULL,
  `location_name` varchar(255) NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `estimated_arrival` time DEFAULT NULL,
  `is_pickup_point` tinyint(1) NOT NULL DEFAULT 1,
  `is_drop_point` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ride_id` (`ride_id`),
  KEY `idx_stop_order` (`stop_order`),
  FOREIGN KEY (`ride_id`) REFERENCES `pooling_rides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Enhanced Bookings Table (Add new columns to existing table)
ALTER TABLE `pooling_bookings` 
ADD COLUMN IF NOT EXISTS `cancellation_reason` varchar(500) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `cancellation_date` timestamp NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `refund_amount` decimal(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `commission_deducted` decimal(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `wallet_transaction_id` int(11) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `terms_accepted_at` timestamp NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `terms_version` varchar(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `dispute_id` int(11) DEFAULT NULL;

-- 11. Enhanced Rides Table (Add new columns to existing table)
ALTER TABLE `pooling_rides`
ADD COLUMN IF NOT EXISTS `cancellation_policy_id` int(11) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `last_cancellation_date` timestamp NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `cancellation_count` int(11) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `average_rating` decimal(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `total_reviews` int(11) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `is_recurring` tinyint(1) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `recurring_days` json DEFAULT NULL;

-- 12. Enhanced Providers Table (Add new columns to existing table)
ALTER TABLE `pooling_providers`
ADD COLUMN IF NOT EXISTS `kyc_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS `average_rating` decimal(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `total_ratings` int(11) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `total_rides_completed` int(11) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `cancellation_count` int(11) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `last_active_date` timestamp NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `account_status` enum('active','suspended','banned') NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS `suspension_reason` text DEFAULT NULL;

-- Insert default cancellation policies
INSERT INTO `pooling_cancellation_policies` (`type`, `hours_before_departure`, `refund_percentage`, `penalty_amount`, `is_active`) VALUES
('customer', 0, 0, NULL, 1),
('customer', 2, 80, NULL, 1),
('customer', 24, 90, NULL, 1),
('provider', 0, 100, 100, 1);

-- Insert default terms and conditions
INSERT INTO `pooling_terms_conditions` (`version`, `type`, `title`, `content`, `is_active`, `effective_date`) VALUES
('1.0', 'customer', 'Customer Terms & Conditions', 'Default customer terms and conditions content goes here...', 1, CURDATE()),
('1.0', 'provider', 'Provider Terms & Conditions', 'Default provider terms and conditions content goes here...', 1, CURDATE()),
('1.0', 'general', 'General Terms & Conditions', 'Default general terms and conditions content goes here...', 1, CURDATE());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pooling_bookings_status ON pooling_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_pooling_bookings_payment ON pooling_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_pooling_rides_departure ON pooling_rides(departure_time);
CREATE INDEX IF NOT EXISTS idx_pooling_rides_status ON pooling_rides(status);
CREATE INDEX IF NOT EXISTS idx_pooling_providers_status ON pooling_providers(account_status);

-- Create triggers for automatic calculations
DELIMITER $$

-- Trigger to update provider average rating
CREATE TRIGGER IF NOT EXISTS update_provider_rating 
AFTER INSERT ON pooling_provider_ratings
FOR EACH ROW
BEGIN
    UPDATE pooling_providers 
    SET 
        average_rating = (
            SELECT AVG(rating) 
            FROM pooling_provider_ratings 
            WHERE provider_id = NEW.provider_id
        ),
        total_ratings = (
            SELECT COUNT(*) 
            FROM pooling_provider_ratings 
            WHERE provider_id = NEW.provider_id
        )
    WHERE id = NEW.provider_id;
END$$

-- Trigger to update wallet balance
CREATE TRIGGER IF NOT EXISTS update_wallet_balance 
AFTER INSERT ON pooling_wallet_transactions
FOR EACH ROW
BEGIN
    IF NEW.type = 'credit' THEN
        UPDATE pooling_wallets 
        SET balance = balance + NEW.amount,
            last_transaction_at = NOW()
        WHERE id = NEW.wallet_id;
    ELSEIF NEW.type = 'debit' THEN
        UPDATE pooling_wallets 
        SET balance = balance - NEW.amount,
            last_transaction_at = NOW()
        WHERE id = NEW.wallet_id;
    ELSEIF NEW.type = 'lock' THEN
        UPDATE pooling_wallets 
        SET locked_amount = locked_amount + NEW.amount,
            last_transaction_at = NOW()
        WHERE id = NEW.wallet_id;
    ELSEIF NEW.type = 'unlock' THEN
        UPDATE pooling_wallets 
        SET locked_amount = locked_amount - NEW.amount,
            last_transaction_at = NOW()
        WHERE id = NEW.wallet_id;
    END IF;
END$$

DELIMITER ;

-- Insert sample data for testing (optional)
-- This can be removed in production

-- Sample providers with KYC status
INSERT INTO pooling_providers (name, phone, email, kyc_status, average_rating, total_ratings) VALUES
('Rajesh Kumar', '+919876543210', 'rajesh@example.com', 'verified', 4.8, 25),
('Suresh Reddy', '+919876543211', 'suresh@example.com', 'pending', 4.5, 15),
('Ramesh Varma', '+919876543212', 'ramesh@example.com', 'rejected', 3.9, 8);

-- Sample vehicles
INSERT INTO pooling_vehicles (provider_id, make, model, color, plate_number, vehicle_type, total_seats) VALUES
(1, 'Hyundai', 'Creta', 'White', 'TS09EA1234', 'suv', 7),
(2, 'Maruti', 'Ertiga', 'Silver', 'TS09EB5678', 'suv', 7),
(3, 'Toyota', 'Innova', 'Black', 'TS09EC9012', 'suv', 8);

-- Sample KYC documents
INSERT INTO pooling_provider_kyc (provider_id, document_type, document_number, document_url, verification_status) VALUES
(1, 'driving_license', 'TS1234567890', '/uploads/kyc/dl_1.pdf', 'verified'),
(1, 'vehicle_registration', 'TS09EA1234', '/uploads/kyc/rc_1.pdf', 'verified'),
(2, 'driving_license', 'TS2345678901', '/uploads/kyc/dl_2.pdf', 'pending'),
(3, 'driving_license', 'TS3456789012', '/uploads/kyc/dl_3.pdf', 'rejected');

-- Sample rides
INSERT INTO pooling_rides (provider_id, vehicle_id, type, from_location, to_location, departure_time, total_seats, available_seats, price_per_seat) VALUES
(1, 1, 'carpool', 'Hyderabad', 'Visakhapatnam', '2024-12-30 06:00:00', 6, 4, 800),
(2, 2, 'carpool', 'Visakhapatnam', 'Vijayawada', '2024-12-30 14:00:00', 6, 5, 600),
(3, 3, 'carpool', 'Vijayawada', 'Hyderabad', '2024-12-31 08:00:00', 7, 6, 700);

-- Sample wallets
INSERT INTO pooling_wallets (user_id, user_type, balance, total_earnings) VALUES
(1, 'provider', 2500.00, 15000.00),
(2, 'provider', 1800.00, 8500.00),
(1, 'customer', 500.00, 0.00);

COMMIT;
