-- Add tier pricing columns to outstation_fares table for dynamic tiered pricing
ALTER TABLE `outstation_fares` 
ADD COLUMN `tier1_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 1 one-way trips (35-50 km)',
ADD COLUMN `tier2_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 2 one-way trips (51-75 km)',
ADD COLUMN `tier3_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 3 one-way trips (76-100 km)',
ADD COLUMN `tier4_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 4 one-way trips (101-149 km)',
ADD COLUMN `extra_km_charge` DECIMAL(5,2) DEFAULT NULL COMMENT 'Extra charge per km for distances beyond tier 4',
ADD COLUMN `tier1_min_km` INT DEFAULT 35 COMMENT 'Minimum km for tier 1',
ADD COLUMN `tier1_max_km` INT DEFAULT 50 COMMENT 'Maximum km for tier 1',
ADD COLUMN `tier2_min_km` INT DEFAULT 51 COMMENT 'Minimum km for tier 2',
ADD COLUMN `tier2_max_km` INT DEFAULT 75 COMMENT 'Maximum km for tier 2',
ADD COLUMN `tier3_min_km` INT DEFAULT 76 COMMENT 'Minimum km for tier 3',
ADD COLUMN `tier3_max_km` INT DEFAULT 100 COMMENT 'Maximum km for tier 3',
ADD COLUMN `tier4_min_km` INT DEFAULT 101 COMMENT 'Minimum km for tier 4',
ADD COLUMN `tier4_max_km` INT DEFAULT 149 COMMENT 'Maximum km for tier 4';

-- Set default tier pricing values based on existing base_price and price_per_km
-- This makes the migration dynamic and uses existing fare data as a reference
UPDATE `outstation_fares` SET
  `tier1_price` = CASE 
    WHEN `base_price` > 0 THEN `base_price` * 0.8
    ELSE 3500
  END,
  `tier2_price` = CASE 
    WHEN `base_price` > 0 THEN `base_price` * 0.95
    ELSE 4200
  END,
  `tier3_price` = CASE 
    WHEN `base_price` > 0 THEN `base_price` * 1.1
    ELSE 4900
  END,
  `tier4_price` = CASE 
    WHEN `base_price` > 0 THEN `base_price` * 1.25
    ELSE 5600
  END,
  `extra_km_charge` = CASE 
    WHEN `price_per_km` > 0 THEN `price_per_km`
    ELSE 14
  END,
  `tier1_min_km` = 35,
  `tier1_max_km` = 50,
  `tier2_min_km` = 51,
  `tier2_max_km` = 75,
  `tier3_min_km` = 76,
  `tier3_max_km` = 100,
  `tier4_min_km` = 101,
  `tier4_max_km` = 149
WHERE `tier1_price` IS NULL;

-- Also add tier columns to vehicle_pricing table for consistency
ALTER TABLE `vehicle_pricing` 
ADD COLUMN `outstation_tier1_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 1 one-way trips (35-50 km)',
ADD COLUMN `outstation_tier2_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 2 one-way trips (51-75 km)',
ADD COLUMN `outstation_tier3_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 3 one-way trips (76-100 km)',
ADD COLUMN `outstation_tier4_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'Price for tier 4 one-way trips (101-149 km)',
ADD COLUMN `outstation_extra_km_charge` DECIMAL(5,2) DEFAULT NULL COMMENT 'Extra charge per km for distances beyond tier 4',
ADD COLUMN `outstation_tier1_min_km` INT DEFAULT 35 COMMENT 'Minimum km for tier 1',
ADD COLUMN `outstation_tier1_max_km` INT DEFAULT 50 COMMENT 'Maximum km for tier 1',
ADD COLUMN `outstation_tier2_min_km` INT DEFAULT 51 COMMENT 'Minimum km for tier 2',
ADD COLUMN `outstation_tier2_max_km` INT DEFAULT 75 COMMENT 'Maximum km for tier 2',
ADD COLUMN `outstation_tier3_min_km` INT DEFAULT 76 COMMENT 'Minimum km for tier 3',
ADD COLUMN `outstation_tier3_max_km` INT DEFAULT 100 COMMENT 'Maximum km for tier 3',
ADD COLUMN `outstation_tier4_min_km` INT DEFAULT 101 COMMENT 'Minimum km for tier 4',
ADD COLUMN `outstation_tier4_max_km` INT DEFAULT 149 COMMENT 'Maximum km for tier 4';

-- Update vehicle_pricing table with dynamic tier pricing based on existing base_fare
UPDATE `vehicle_pricing` SET
  `outstation_tier1_price` = CASE 
    WHEN `base_fare` > 0 THEN `base_fare` * 0.8
    ELSE 3500
  END,
  `outstation_tier2_price` = CASE 
    WHEN `base_fare` > 0 THEN `base_fare` * 0.95
    ELSE 4200
  END,
  `outstation_tier3_price` = CASE 
    WHEN `base_fare` > 0 THEN `base_fare` * 1.1
    ELSE 4900
  END,
  `outstation_tier4_price` = CASE 
    WHEN `base_fare` > 0 THEN `base_fare` * 1.25
    ELSE 5600
  END,
  `outstation_extra_km_charge` = CASE 
    WHEN `price_per_km` > 0 THEN `price_per_km`
    ELSE 14
  END,
  `outstation_tier1_min_km` = 35,
  `outstation_tier1_max_km` = 50,
  `outstation_tier2_min_km` = 51,
  `outstation_tier2_max_km` = 75,
  `outstation_tier3_min_km` = 76,
  `outstation_tier3_max_km` = 100,
  `outstation_tier4_min_km` = 101,
  `outstation_tier4_max_km` = 149
WHERE `trip_type` = 'outstation' AND `outstation_tier1_price` IS NULL;

-- Create indexes for better performance (removed WHERE clause as it's not supported in MariaDB/MySQL)
CREATE INDEX `idx_outstation_fares_vehicle_tier` ON `outstation_fares` (`vehicle_id`, `tier1_price`);
CREATE INDEX `idx_vehicle_pricing_outstation_tier` ON `vehicle_pricing` (`vehicle_id`, `outstation_tier1_price`);
