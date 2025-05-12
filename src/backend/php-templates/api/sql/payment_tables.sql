
-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_date` datetime DEFAULT NULL,
  `status` enum('pending', 'confirmed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `transaction_id` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create payment_reminders table if it doesn't exist
CREATE TABLE IF NOT EXISTS `payment_reminders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `booking_number` varchar(50) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_email` varchar(100) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `reminder_type` enum('initial', 'followup', 'final') NOT NULL DEFAULT 'initial',
  `reminder_date` datetime NOT NULL,
  `sent_date` datetime DEFAULT NULL,
  `status` enum('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  `message` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add payment_status and payment_method columns to bookings table if they don't exist
ALTER TABLE `bookings` 
  ADD COLUMN IF NOT EXISTS `payment_status` 
    enum('payment_pending', 'payment_received', 'cancelled') 
    NOT NULL DEFAULT 'payment_pending' AFTER `status`;

ALTER TABLE `bookings` 
  ADD COLUMN IF NOT EXISTS `payment_method` 
    varchar(50) DEFAULT NULL AFTER `payment_status`;
