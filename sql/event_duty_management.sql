-- VTH Event & Duty Management
-- Safe to re-run: CREATE IF NOT EXISTS + seed guarded by event_code.
-- Optional ALTERs on drivers/fleet_vehicles are at the end so a duplicate-column
-- error cannot block table creation. Ignore those ALTER errors if columns exist.

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vth_events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `client_name` VARCHAR(160) NULL,
  `client_mobile` VARCHAR(20) NULL,
  `support_mobile` VARCHAR(20) NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `reporting_location` VARCHAR(255) NULL,
  `default_reporting_time` CHAR(5) NOT NULL DEFAULT '06:00',
  `notes` TEXT NULL,
  `status` ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  `gps_required` TINYINT(1) NOT NULL DEFAULT 0,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vth_event_code` (`event_code`),
  KEY `idx_vth_event_status` (`status`),
  KEY `idx_vth_event_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vth_event_requirement_groups` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `vehicle_type` VARCHAR(40) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `passenger_count` INT UNSIGNED NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vth_req_event` (`event_id`),
  CONSTRAINT `fk_vth_req_event` FOREIGN KEY (`event_id`) REFERENCES `vth_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vth_event_requirement_dates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id` INT UNSIGNED NOT NULL,
  `duty_date` DATE NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vth_req_date` (`group_id`, `duty_date`),
  KEY `idx_vth_req_duty_date` (`duty_date`),
  CONSTRAINT `fk_vth_req_dates_group` FOREIGN KEY (`group_id`) REFERENCES `vth_event_requirement_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vth_event_assignments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `requirement_group_id` INT UNSIGNED NULL,
  `fleet_vehicle_id` INT NULL,
  `driver_id` INT NULL,
  `vehicle_type` VARCHAR(40) NOT NULL,
  `passenger_count` INT UNSIGNED NULL,
  `reporting_time` CHAR(5) NULL,
  `reporting_location` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `serial_no` INT UNSIGNED NULL,
  `replaced_from_assignment_id` INT UNSIGNED NULL,
  `status` ENUM('active','replaced','cancelled') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vth_asg_event` (`event_id`),
  KEY `idx_vth_asg_vehicle` (`fleet_vehicle_id`),
  KEY `idx_vth_asg_driver` (`driver_id`),
  KEY `idx_vth_asg_status` (`status`),
  CONSTRAINT `fk_vth_asg_event` FOREIGN KEY (`event_id`) REFERENCES `vth_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vth_event_assignment_dates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assignment_id` INT UNSIGNED NOT NULL,
  `duty_date` DATE NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vth_asg_date` (`assignment_id`, `duty_date`),
  KEY `idx_vth_asg_duty_date` (`duty_date`),
  CONSTRAINT `fk_vth_asg_dates` FOREIGN KEY (`assignment_id`) REFERENCES `vth_event_assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vth_event_duties` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `duty_slip_no` VARCHAR(64) NOT NULL,
  `event_id` INT UNSIGNED NOT NULL,
  `assignment_id` INT UNSIGNED NOT NULL,
  `fleet_vehicle_id` INT NULL,
  `driver_id` INT NULL,
  `vehicle_type` VARCHAR(40) NULL,
  `vehicle_reg_snapshot` VARCHAR(50) NULL,
  `driver_name_snapshot` VARCHAR(160) NULL,
  `driver_mobile_snapshot` VARCHAR(20) NULL,
  `duty_date` DATE NOT NULL,
  `reporting_time` CHAR(5) NULL,
  `reporting_location` VARCHAR(255) NULL,
  `opening_km` INT UNSIGNED NULL,
  `opening_photo_id` INT UNSIGNED NULL,
  `opening_at` DATETIME NULL,
  `opening_lat` DECIMAL(10,7) NULL,
  `opening_lng` DECIMAL(10,7) NULL,
  `opening_gps_accuracy` DECIMAL(8,2) NULL,
  `opening_ip` VARCHAR(64) NULL,
  `closing_km` INT UNSIGNED NULL,
  `closing_photo_id` INT UNSIGNED NULL,
  `closing_at` DATETIME NULL,
  `closing_lat` DECIMAL(10,7) NULL,
  `closing_lng` DECIMAL(10,7) NULL,
  `closing_gps_accuracy` DECIMAL(8,2) NULL,
  `closing_ip` VARCHAR(64) NULL,
  `total_km` INT NULL,
  `status` ENUM(
    'scheduled',
    'not_started',
    'in_progress',
    'completed',
    'missing_opening',
    'missing_closing',
    'exception',
    'cancelled'
  ) NOT NULL DEFAULT 'not_started',
  `notes` TEXT NULL,
  `admin_override` TINYINT(1) NOT NULL DEFAULT 0,
  `verification_code` VARCHAR(16) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vth_duty_slip` (`duty_slip_no`),
  UNIQUE KEY `uq_vth_duty_assignment_date` (`assignment_id`, `duty_date`),
  UNIQUE KEY `uq_vth_duty_vehicle_date` (`event_id`, `fleet_vehicle_id`, `duty_date`),
  KEY `idx_vth_duty_event_date` (`event_id`, `duty_date`),
  KEY `idx_vth_duty_driver` (`driver_id`),
  KEY `idx_vth_duty_status` (`status`),
  KEY `idx_vth_duty_date` (`duty_date`),
  CONSTRAINT `fk_vth_duty_event` FOREIGN KEY (`event_id`) REFERENCES `vth_events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vth_duty_asg` FOREIGN KEY (`assignment_id`) REFERENCES `vth_event_assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vth_event_tokens` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `token_hash` CHAR(64) NOT NULL,
  `token_type` ENUM('driver','event_share') NOT NULL,
  `event_id` INT UNSIGNED NOT NULL,
  `assignment_id` INT UNSIGNED NULL,
  `driver_id` INT NULL,
  `expires_at` DATETIME NULL,
  `revoked_at` DATETIME NULL,
  `last_used_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vth_token_hash` (`token_hash`),
  KEY `idx_vth_token_event` (`event_id`, `token_type`),
  KEY `idx_vth_token_asg` (`assignment_id`),
  CONSTRAINT `fk_vth_token_event` FOREIGN KEY (`event_id`) REFERENCES `vth_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vth_event_documents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NULL,
  `owner_type` ENUM('driver','vehicle','duty') NOT NULL,
  `owner_id` INT UNSIGNED NOT NULL,
  `doc_type` VARCHAR(40) NOT NULL,
  `storage_key` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(180) NULL,
  `mime` VARCHAR(80) NULL,
  `size_bytes` INT UNSIGNED NULL,
  `status` ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `rejection_reason` VARCHAR(255) NULL,
  `uploaded_by` VARCHAR(40) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vth_doc_owner` (`owner_type`, `owner_id`),
  KEY `idx_vth_doc_event` (`event_id`),
  KEY `idx_vth_doc_type` (`doc_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vth_event_driver_pii` (
  `driver_id` INT NOT NULL,
  `aadhaar_last4` CHAR(4) NULL,
  `aadhaar_encrypted` TEXT NULL,
  `alt_mobile` VARCHAR(20) NULL,
  `address` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`driver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vth_event_audit_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_type` ENUM('admin','driver','system','share') NOT NULL,
  `actor_id` VARCHAR(40) NULL,
  `action` VARCHAR(80) NOT NULL,
  `entity_type` VARCHAR(40) NOT NULL,
  `entity_id` VARCHAR(40) NULL,
  `event_id` INT UNSIGNED NULL,
  `old_value` JSON NULL,
  `new_value` JSON NULL,
  `ip` VARCHAR(64) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vth_audit_event` (`event_id`),
  KEY `idx_vth_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_vth_audit_action` (`action`),
  KEY `idx_vth_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- October 2026 Event seed (requirement slots only — no vehicle numbers / names)
-- ---------------------------------------------------------------------------
INSERT INTO `vth_events` (
  `event_code`, `name`, `client_name`, `start_date`, `end_date`,
  `reporting_location`, `default_reporting_time`, `notes`, `status`
)
SELECT
  'VTH-2026-10-001',
  'October 2026 Event',
  NULL,
  '2026-10-12',
  '2026-10-21',
  NULL,
  '06:00',
  'Seeded requirement slots. Assign actual vehicles and drivers in admin.',
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM `vth_events` WHERE `event_code` = 'VTH-2026-10-001'
);

SET @evt_id := (SELECT `id` FROM `vth_events` WHERE `event_code` = 'VTH-2026-10-001' LIMIT 1);

INSERT INTO `vth_event_requirement_groups` (`event_id`, `vehicle_type`, `quantity`, `passenger_count`, `notes`)
SELECT @evt_id, 'innova_crysta', 8, NULL, '12-17 Oct and 20-21 Oct'
WHERE @evt_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `vth_event_requirement_groups` WHERE `event_id` = @evt_id AND `notes` = '12-17 Oct and 20-21 Oct' AND `vehicle_type` = 'innova_crysta');

INSERT INTO `vth_event_requirement_groups` (`event_id`, `vehicle_type`, `quantity`, `passenger_count`, `notes`)
SELECT @evt_id, 'fortuner', 1, 24, '12-18 Oct'
WHERE @evt_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `vth_event_requirement_groups` WHERE `event_id` = @evt_id AND `notes` = '12-18 Oct' AND `vehicle_type` = 'fortuner');

INSERT INTO `vth_event_requirement_groups` (`event_id`, `vehicle_type`, `quantity`, `passenger_count`, `notes`)
SELECT @evt_id, 'mini_bus', 3, 24, '12-17 Oct and 20-21 Oct'
WHERE @evt_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `vth_event_requirement_groups` WHERE `event_id` = @evt_id AND `notes` = '12-17 Oct and 20-21 Oct' AND `vehicle_type` = 'mini_bus');

INSERT INTO `vth_event_requirement_groups` (`event_id`, `vehicle_type`, `quantity`, `passenger_count`, `notes`)
SELECT @evt_id, 'innova', 7, 19, '15-21 Oct'
WHERE @evt_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `vth_event_requirement_groups` WHERE `event_id` = @evt_id AND `notes` = '15-21 Oct' AND `vehicle_type` = 'innova');

INSERT INTO `vth_event_requirement_groups` (`event_id`, `vehicle_type`, `quantity`, `passenger_count`, `notes`)
SELECT @evt_id, 'innova', 1, 2, '16-21 Oct'
WHERE @evt_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `vth_event_requirement_groups` WHERE `event_id` = @evt_id AND `notes` = '16-21 Oct' AND `vehicle_type` = 'innova' AND `quantity` = 1 AND `passenger_count` = 2);

INSERT INTO `vth_event_requirement_groups` (`event_id`, `vehicle_type`, `quantity`, `passenger_count`, `notes`)
SELECT @evt_id, 'innova', 1, 2, '16-21 Oct continuation'
WHERE @evt_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `vth_event_requirement_groups` WHERE `event_id` = @evt_id AND `notes` = '16-21 Oct continuation');

INSERT INTO `vth_event_requirement_groups` (`event_id`, `vehicle_type`, `quantity`, `passenger_count`, `notes`)
SELECT @evt_id, 'fortuner', 1, 4, '17-21 Oct'
WHERE @evt_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `vth_event_requirement_groups` WHERE `event_id` = @evt_id AND `notes` = '17-21 Oct' AND `vehicle_type` = 'fortuner');

-- Requirement dates
INSERT IGNORE INTO `vth_event_requirement_dates` (`group_id`, `duty_date`)
SELECT g.id, d.dt
FROM `vth_event_requirement_groups` g
JOIN (
  SELECT '12-17 Oct and 20-21 Oct' AS notes, DATE('2026-10-12') AS dt UNION ALL
  SELECT '12-17 Oct and 20-21 Oct', DATE('2026-10-13') UNION ALL
  SELECT '12-17 Oct and 20-21 Oct', DATE('2026-10-14') UNION ALL
  SELECT '12-17 Oct and 20-21 Oct', DATE('2026-10-15') UNION ALL
  SELECT '12-17 Oct and 20-21 Oct', DATE('2026-10-16') UNION ALL
  SELECT '12-17 Oct and 20-21 Oct', DATE('2026-10-17') UNION ALL
  SELECT '12-17 Oct and 20-21 Oct', DATE('2026-10-20') UNION ALL
  SELECT '12-17 Oct and 20-21 Oct', DATE('2026-10-21') UNION ALL
  SELECT '12-18 Oct', DATE('2026-10-12') UNION ALL
  SELECT '12-18 Oct', DATE('2026-10-13') UNION ALL
  SELECT '12-18 Oct', DATE('2026-10-14') UNION ALL
  SELECT '12-18 Oct', DATE('2026-10-15') UNION ALL
  SELECT '12-18 Oct', DATE('2026-10-16') UNION ALL
  SELECT '12-18 Oct', DATE('2026-10-17') UNION ALL
  SELECT '12-18 Oct', DATE('2026-10-18') UNION ALL
  SELECT '15-21 Oct', DATE('2026-10-15') UNION ALL
  SELECT '15-21 Oct', DATE('2026-10-16') UNION ALL
  SELECT '15-21 Oct', DATE('2026-10-17') UNION ALL
  SELECT '15-21 Oct', DATE('2026-10-18') UNION ALL
  SELECT '15-21 Oct', DATE('2026-10-19') UNION ALL
  SELECT '15-21 Oct', DATE('2026-10-20') UNION ALL
  SELECT '15-21 Oct', DATE('2026-10-21') UNION ALL
  SELECT '16-21 Oct', DATE('2026-10-16') UNION ALL
  SELECT '16-21 Oct', DATE('2026-10-17') UNION ALL
  SELECT '16-21 Oct', DATE('2026-10-18') UNION ALL
  SELECT '16-21 Oct', DATE('2026-10-19') UNION ALL
  SELECT '16-21 Oct', DATE('2026-10-20') UNION ALL
  SELECT '16-21 Oct', DATE('2026-10-21') UNION ALL
  SELECT '16-21 Oct continuation', DATE('2026-10-16') UNION ALL
  SELECT '16-21 Oct continuation', DATE('2026-10-17') UNION ALL
  SELECT '16-21 Oct continuation', DATE('2026-10-18') UNION ALL
  SELECT '16-21 Oct continuation', DATE('2026-10-19') UNION ALL
  SELECT '16-21 Oct continuation', DATE('2026-10-20') UNION ALL
  SELECT '16-21 Oct continuation', DATE('2026-10-21') UNION ALL
  SELECT '17-21 Oct', DATE('2026-10-17') UNION ALL
  SELECT '17-21 Oct', DATE('2026-10-18') UNION ALL
  SELECT '17-21 Oct', DATE('2026-10-19') UNION ALL
  SELECT '17-21 Oct', DATE('2026-10-20') UNION ALL
  SELECT '17-21 Oct', DATE('2026-10-21')
) d ON d.notes = g.notes
WHERE g.event_id = @evt_id;

-- Number table for expanding quantity
CREATE TABLE IF NOT EXISTS `vth_event_seq` (
  `n` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`n`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `vth_event_seq` (`n`) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18),(19),(20);

-- Empty assignment slots (no vehicle / driver)
INSERT INTO `vth_event_assignments` (
  `event_id`, `requirement_group_id`, `vehicle_type`, `passenger_count`,
  `reporting_time`, `reporting_location`, `status`
)
SELECT g.event_id, g.id, g.vehicle_type, g.passenger_count, e.default_reporting_time, e.reporting_location, 'active'
FROM `vth_event_requirement_groups` g
JOIN `vth_events` e ON e.id = g.event_id
JOIN `vth_event_seq` s ON s.n <= g.quantity
WHERE g.event_id = @evt_id
  AND (
    SELECT COUNT(*) FROM `vth_event_assignments` a
    WHERE a.requirement_group_id = g.id
  ) < g.quantity;

INSERT IGNORE INTO `vth_event_assignment_dates` (`assignment_id`, `duty_date`)
SELECT a.id, rd.duty_date
FROM `vth_event_assignments` a
JOIN `vth_event_requirement_dates` rd ON rd.group_id = a.requirement_group_id
WHERE a.event_id = @evt_id;

INSERT INTO `vth_event_duties` (
  `duty_slip_no`, `event_id`, `assignment_id`, `vehicle_type`,
  `duty_date`, `reporting_time`, `reporting_location`, `status`, `verification_code`
)
SELECT
  CONCAT(e.event_code, '-', DATE_FORMAT(ad.duty_date, '%d'), '-', LPAD(a.id, 3, '0')),
  a.event_id,
  a.id,
  a.vehicle_type,
  ad.duty_date,
  COALESCE(a.reporting_time, e.default_reporting_time),
  COALESCE(a.reporting_location, e.reporting_location),
  'not_started',
  UPPER(SUBSTRING(MD5(CONCAT(a.id, '-', ad.duty_date)), 1, 8))
FROM `vth_event_assignments` a
JOIN `vth_event_assignment_dates` ad ON ad.assignment_id = a.id
JOIN `vth_events` e ON e.id = a.event_id
WHERE a.event_id = @evt_id
  AND NOT EXISTS (
    SELECT 1 FROM `vth_event_duties` d
    WHERE d.assignment_id = a.id AND d.duty_date = ad.duty_date
  );

-- ---------------------------------------------------------------------------
-- Optional master-table columns (ignore errors if they already exist)
-- ---------------------------------------------------------------------------
ALTER TABLE `drivers`
  ADD COLUMN `alt_mobile` VARCHAR(20) NULL AFTER `phone`;

ALTER TABLE `drivers`
  ADD COLUMN `aadhaar_last4` CHAR(4) NULL AFTER `license_no`;

ALTER TABLE `drivers`
  ADD COLUMN `address` VARCHAR(255) NULL AFTER `location`;

ALTER TABLE `fleet_vehicles`
  ADD COLUMN `owner_name` VARCHAR(120) NULL AFTER `assigned_driver_id`;

ALTER TABLE `fleet_vehicles`
  ADD COLUMN `owner_mobile` VARCHAR(20) NULL AFTER `owner_name`;
