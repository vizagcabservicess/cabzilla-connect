
-- Create table for storing Razorpay orders
CREATE TABLE IF NOT EXISTS `razorpay_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `receipt` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create table for storing Razorpay payments
CREATE TABLE IF NOT EXISTS `razorpay_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `payment_id` varchar(255) NOT NULL,
  `order_id` varchar(255) NOT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(20) NOT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'razorpay',
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_id` (`payment_id`),
  KEY `order_id` (`order_id`),
  KEY `booking_id` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add Razorpay fields to the payments table
ALTER TABLE `payments` 
ADD COLUMN IF NOT EXISTS `razorpay_payment_id` varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `razorpay_order_id` varchar(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `razorpay_signature` varchar(255) DEFAULT NULL;
