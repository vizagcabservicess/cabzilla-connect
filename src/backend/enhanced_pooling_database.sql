
-- Enhanced Pooling System Database Schema with Wallet and Driver Approval

-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL UNIQUE,
  `role` enum('customer','driver','admin') DEFAULT 'customer',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create user sessions table
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL UNIQUE,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Update pooling_providers to link with users
ALTER TABLE `pooling_providers` ADD COLUMN IF NOT EXISTS `user_id` int(11) NULL;
ALTER TABLE `pooling_providers` ADD FOREIGN KEY IF NOT EXISTS (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- Create pooling_wallets table
CREATE TABLE IF NOT EXISTS `pooling_wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `balance` decimal(10,2) DEFAULT 0.00,
  `locked_amount` decimal(10,2) DEFAULT 0.00,
  `total_earnings` decimal(10,2) DEFAULT 0.00,
  `total_spent` decimal(10,2) DEFAULT 0.00,
  `last_transaction_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wallet_id` int(11) NOT NULL,
  `type` enum('credit','debit','lock','unlock') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `purpose` enum('booking_payment','refund','commission','penalty','compensation','withdrawal','deposit') NOT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `description` text NOT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  `status` enum('pending','completed','failed') DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`wallet_id`) REFERENCES `pooling_wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Update pooling_bookings table with new approval flow
ALTER TABLE `pooling_bookings` 
ADD COLUMN IF NOT EXISTS `driver_approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS `driver_approval_at` timestamp NULL,
ADD COLUMN IF NOT EXISTS `approval_expires_at` timestamp NULL,
ADD COLUMN IF NOT EXISTS `cancellation_reason` varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `cancellation_date` timestamp NULL,
ADD COLUMN IF NOT EXISTS `refund_amount` decimal(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS `wallet_transaction_id` int(11) DEFAULT NULL;

-- Create booking_approvals table for tracking approval flow
CREATE TABLE IF NOT EXISTS `booking_approvals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `driver_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `status` enum('pending','approved','rejected','expired') DEFAULT 'pending',
  `response_time` timestamp NULL,
  `expires_at` timestamp NOT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`booking_id`) REFERENCES `pooling_bookings` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('booking_request','booking_approved','booking_rejected','payment_received','cancellation') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert admin user
INSERT IGNORE INTO `users` (`name`, `email`, `password`, `phone`, `role`) 
VALUES ('Admin User', 'admin@pooling.com', '$2y$10$example.hash.here', '+919999999999', 'admin');

-- Insert sample customers and drivers
INSERT IGNORE INTO `users` (`name`, `email`, `password`, `phone`, `role`) VALUES
('John Customer', 'john@customer.com', '$2y$10$example.hash.here', '+919876543210', 'customer'),
('Ravi Driver', 'ravi@driver.com', '$2y$10$example.hash.here', '+919876543211', 'driver'),
('Prasad Driver', 'prasad@driver.com', '$2y$10$example.hash.here', '+919876543212', 'driver');

-- Create wallets for users
INSERT IGNORE INTO `pooling_wallets` (`user_id`, `balance`) 
SELECT id, CASE WHEN role = 'driver' THEN 1000.00 ELSE 0.00 END 
FROM users WHERE id NOT IN (SELECT user_id FROM pooling_wallets);

-- Update existing providers to link with users
UPDATE pooling_providers p 
JOIN users u ON p.phone = u.phone 
SET p.user_id = u.id 
WHERE p.user_id IS NULL AND u.role = 'driver';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_booking_approvals_status ON booking_approvals (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (token, expires_at);
