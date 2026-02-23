-- Add extended columns to group_tour_tours (images, content, boarding points)
-- Run after group_tour_migration.sql and group_tour_add_title.sql.
-- Skip any statement that errors with "Duplicate column" (column already exists).

ALTER TABLE `group_tour_tours` ADD COLUMN `expiry_date` DATE NULL DEFAULT NULL AFTER `travel_date`;
ALTER TABLE `group_tour_tours` ADD COLUMN `featured_image_url` VARCHAR(512) NULL DEFAULT NULL AFTER `status`;
ALTER TABLE `group_tour_tours` ADD COLUMN `gallery_images` TEXT NULL DEFAULT NULL AFTER `featured_image_url`;
ALTER TABLE `group_tour_tours` ADD COLUMN `highlights` TEXT NULL DEFAULT NULL AFTER `gallery_images`;
ALTER TABLE `group_tour_tours` ADD COLUMN `itinerary` TEXT NULL DEFAULT NULL AFTER `highlights`;
ALTER TABLE `group_tour_tours` ADD COLUMN `inclusions` TEXT NULL DEFAULT NULL AFTER `itinerary`;
ALTER TABLE `group_tour_tours` ADD COLUMN `exclusions` TEXT NULL DEFAULT NULL AFTER `inclusions`;

-- Boarding points table (optional - used when provided in admin form)
CREATE TABLE IF NOT EXISTS `group_tour_boarding_points` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tour_id` INT(11) UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(512) NULL DEFAULT NULL,
  `boarding_time` VARCHAR(20) NULL DEFAULT '07:00',
  `sort_order` INT(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_tour` (`tour_id`),
  CONSTRAINT `fk_bp_tour` FOREIGN KEY (`tour_id`) REFERENCES `group_tour_tours` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
