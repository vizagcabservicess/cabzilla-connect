-- Payment tracking table for tracking payment attempts, failures, and cancellations
CREATE TABLE IF NOT EXISTS `payment_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `booking_number` varchar(50) NOT NULL,
  `razorpay_order_id` varchar(255) DEFAULT NULL,
  `razorpay_payment_id` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'INR',
  `payment_status` enum('initiated','failed','cancelled','successful') NOT NULL DEFAULT 'initiated',
  `failure_reason` text DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `customer_phone` varchar(15) DEFAULT NULL,
  `customer_email` varchar(100) DEFAULT NULL,
  `attempt_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `failure_timestamp` timestamp NULL DEFAULT NULL,
  `cancellation_timestamp` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_booking_number` (`booking_number`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_attempt_timestamp` (`attempt_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better query performance
ALTER TABLE `payment_attempts` 
  ADD INDEX IF NOT EXISTS `idx_razorpay_payment_id` (`razorpay_payment_id`),
  ADD INDEX IF NOT EXISTS `idx_customer_email` (`customer_email`),
  ADD INDEX IF NOT EXISTS `idx_created_at` (`created_at`);

