-- Ask-to-end notice for an in-progress event duty.
-- The PHP API also adds these columns on first request.

ALTER TABLE vth_event_duties ADD COLUMN end_requested_at DATETIME NULL;
ALTER TABLE vth_event_duties ADD COLUMN end_request_seen_at DATETIME NULL;
ALTER TABLE vth_event_duties ADD COLUMN end_request_nonce VARCHAR(32) NULL;
ALTER TABLE vth_event_duties ADD COLUMN end_requested_by VARCHAR(20) NULL;

CREATE TABLE IF NOT EXISTS `vth_event_driver_push` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assignment_id` INT UNSIGNED NOT NULL,
  `endpoint` TEXT NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth_key` VARCHAR(255) NOT NULL,
  `open_path` VARCHAR(180) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vth_driver_push_endpoint` (`endpoint`(191)),
  KEY `idx_vth_driver_push_asg` (`assignment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
