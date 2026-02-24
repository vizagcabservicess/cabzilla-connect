-- Add boarding point and drop point to group tour bookings
-- Run after group_tour_migration.sql and group_tour_extended_columns.sql.
-- Enables storing customer-selected boarding point and pickup time.

ALTER TABLE `group_tour_bookings` ADD COLUMN `boarding_point_id` INT(11) UNSIGNED NULL DEFAULT NULL AFTER `customer_phone`;
ALTER TABLE `group_tour_bookings` ADD COLUMN `drop_point_id` INT(11) UNSIGNED NULL DEFAULT NULL AFTER `boarding_point_id`;

-- Optional: add indexes for joins (ignore if columns already exist from previous run)
-- ALTER TABLE `group_tour_bookings` ADD KEY `idx_boarding_point` (`boarding_point_id`);
-- ALTER TABLE `group_tour_bookings` ADD KEY `idx_drop_point` (`drop_point_id`);
