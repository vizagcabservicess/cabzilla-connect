-- Live mobile GPS for event duties. Safe to re-run.

CREATE TABLE IF NOT EXISTS `vth_event_track_points` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `duty_id` INT UNSIGNED NOT NULL,
  `lat` DECIMAL(10,7) NOT NULL,
  `lng` DECIMAL(10,7) NOT NULL,
  `accuracy` DECIMAL(8,2) NULL,
  `speed` DECIMAL(8,2) NULL,
  `heading` DECIMAL(6,2) NULL,
  `recorded_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vth_track_duty_time` (`duty_id`, `recorded_at`),
  KEY `idx_vth_track_event_time` (`event_id`, `recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `vth_event_duties` ADD COLUMN `last_lat` DECIMAL(10,7) NULL;
ALTER TABLE `vth_event_duties` ADD COLUMN `last_lng` DECIMAL(10,7) NULL;
ALTER TABLE `vth_event_duties` ADD COLUMN `last_gps_accuracy` DECIMAL(8,2) NULL;
ALTER TABLE `vth_event_duties` ADD COLUMN `last_gps_at` DATETIME NULL;
ALTER TABLE `vth_event_duties` ADD COLUMN `last_gps_address` VARCHAR(255) NULL;
ALTER TABLE `vth_event_duties` ADD COLUMN `last_gps_client` VARCHAR(64) NULL;
