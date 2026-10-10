-- Event-only vehicles (do not insert into fleet_vehicles).
-- Safe to re-run. Ignore duplicate-column errors.

CREATE TABLE IF NOT EXISTS `vth_event_vehicles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `registration_number` VARCHAR(50) NOT NULL,
  `vehicle_type` VARCHAR(40) NOT NULL DEFAULT 'other',
  `make` VARCHAR(100) NULL,
  `model` VARCHAR(100) NULL,
  `seating_capacity` INT UNSIGNED NULL,
  `owner_name` VARCHAR(120) NULL,
  `owner_mobile` VARCHAR(20) NULL,
  `notes` TEXT NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vth_event_vehicle_reg` (`event_id`, `registration_number`),
  KEY `idx_vth_event_vehicle_event` (`event_id`),
  CONSTRAINT `fk_vth_event_vehicle_event` FOREIGN KEY (`event_id`) REFERENCES `vth_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `vth_event_assignments`
  ADD COLUMN `event_vehicle_id` INT UNSIGNED NULL AFTER `requirement_group_id`;

ALTER TABLE `vth_event_assignments`
  ADD KEY `idx_vth_asg_event_vehicle` (`event_vehicle_id`);

ALTER TABLE `vth_event_duties`
  ADD COLUMN `event_vehicle_id` INT UNSIGNED NULL AFTER `assignment_id`;

ALTER TABLE `vth_event_duties`
  ADD KEY `idx_vth_duty_event_vehicle` (`event_vehicle_id`);
