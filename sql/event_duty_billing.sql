-- Local package billing for event duties.
-- Included hours and km live on the event (default 10 hr / 100 km).
-- Vendor and VTH prices live on each event vehicle.
-- Safe to re-run. Existing columns are left as they are.

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `vth_events` ADD COLUMN `billing_included_hours` DECIMAL(6,2) NOT NULL DEFAULT 10',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'vth_events' AND COLUMN_NAME = 'billing_included_hours'
);
PREPARE vth_bill_stmt FROM @sql;
EXECUTE vth_bill_stmt;
DEALLOCATE PREPARE vth_bill_stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `vth_events` ADD COLUMN `billing_included_km` DECIMAL(8,2) NOT NULL DEFAULT 100',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'vth_events' AND COLUMN_NAME = 'billing_included_km'
);
PREPARE vth_bill_stmt FROM @sql;
EXECUTE vth_bill_stmt;
DEALLOCATE PREPARE vth_bill_stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `vth_event_vehicles` ADD COLUMN `vendor_package_price` DECIMAL(10,2) NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'vth_event_vehicles' AND COLUMN_NAME = 'vendor_package_price'
);
PREPARE vth_bill_stmt FROM @sql;
EXECUTE vth_bill_stmt;
DEALLOCATE PREPARE vth_bill_stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `vth_event_vehicles` ADD COLUMN `vendor_extra_hour` DECIMAL(10,2) NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'vth_event_vehicles' AND COLUMN_NAME = 'vendor_extra_hour'
);
PREPARE vth_bill_stmt FROM @sql;
EXECUTE vth_bill_stmt;
DEALLOCATE PREPARE vth_bill_stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `vth_event_vehicles` ADD COLUMN `vendor_extra_km` DECIMAL(10,2) NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'vth_event_vehicles' AND COLUMN_NAME = 'vendor_extra_km'
);
PREPARE vth_bill_stmt FROM @sql;
EXECUTE vth_bill_stmt;
DEALLOCATE PREPARE vth_bill_stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `vth_event_vehicles` ADD COLUMN `vth_package_price` DECIMAL(10,2) NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'vth_event_vehicles' AND COLUMN_NAME = 'vth_package_price'
);
PREPARE vth_bill_stmt FROM @sql;
EXECUTE vth_bill_stmt;
DEALLOCATE PREPARE vth_bill_stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `vth_event_vehicles` ADD COLUMN `vth_extra_hour` DECIMAL(10,2) NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'vth_event_vehicles' AND COLUMN_NAME = 'vth_extra_hour'
);
PREPARE vth_bill_stmt FROM @sql;
EXECUTE vth_bill_stmt;
DEALLOCATE PREPARE vth_bill_stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `vth_event_vehicles` ADD COLUMN `vth_extra_km` DECIMAL(10,2) NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'vth_event_vehicles' AND COLUMN_NAME = 'vth_extra_km'
);
PREPARE vth_bill_stmt FROM @sql;
EXECUTE vth_bill_stmt;
DEALLOCATE PREPARE vth_bill_stmt;
