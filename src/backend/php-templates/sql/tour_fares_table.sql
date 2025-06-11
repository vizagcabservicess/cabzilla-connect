
-- Drop existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS `tour_fares`;

-- Create tour_fares table with proper structure
CREATE TABLE `tour_fares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tour_id` varchar(50) NOT NULL,
  `tour_name` varchar(255) NOT NULL,
  `sedan` decimal(10,2) NOT NULL DEFAULT 0.00,
  `ertiga` decimal(10,2) NOT NULL DEFAULT 0.00,
  `innova` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tempo` decimal(10,2) NOT NULL DEFAULT 0.00,
  `luxury` decimal(10,2) NOT NULL DEFAULT 0.00,
  `distance` int(11) NOT NULL DEFAULT 0,
  `days` int(11) NOT NULL DEFAULT 1,
  `description` text,
  `image_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tour_id` (`tour_id`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default tour data
INSERT INTO `tour_fares` (`tour_id`, `tour_name`, `sedan`, `ertiga`, `innova`, `tempo`, `luxury`, `distance`, `days`, `description`, `image_url`) VALUES
('araku_valley', 'Araku Valley Tour', 6000.00, 7500.00, 9000.00, 12000.00, 15000.00, 120, 1, 'Experience the beautiful valley with waterfalls, tribal museums, and lush coffee plantations. Perfect for nature lovers and photography enthusiasts.', '/tours/araku_valley.jpg'),
('lambasingi', 'Lambasingi Hill Station', 8500.00, 10000.00, 12000.00, 15000.00, 18000.00, 150, 2, 'Kashmir of Andhra Pradesh - Experience the enchanting hill station known for its misty mornings and coffee plantations.', '/tours/lambasingi.jpg'),
('vizag_city', 'Vizag City Tour', 3000.00, 3800.00, 4600.00, 6000.00, 8000.00, 50, 1, 'Explore the beautiful beaches, ancient temples, and modern attractions of Visakhapatnam. Perfect for first-time visitors.', '/tours/vizag_city.jpg'),
('yarada_beach', 'Yarada Beach Tour', 2500.00, 3500.00, 4500.00, 5500.00, 7000.00, 40, 1, 'Visit the pristine Yarada Beach with golden sands and clear blue waters. Perfect for a relaxing day trip.', '/tours/yarada_beach.jpg'),
('rushikonda', 'Rushikonda Beach Tour', 2000.00, 3000.00, 4000.00, 5000.00, 6500.00, 25, 1, 'Enjoy water sports and beach activities at the popular Rushikonda Beach. Great for adventure enthusiasts.', '/tours/rushikonda.jpg');
