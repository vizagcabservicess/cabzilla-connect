-- Vendor preference: receive every cab type, or only their own vehicle type.
-- Runtime also auto-adds this column via sbEnsureVendorAdminSchema().
-- Skip the ALTER if the column already exists.

ALTER TABLE sb_vendors
  ADD COLUMN accept_any_vehicle_type TINYINT(1) NOT NULL DEFAULT 0
  AFTER primary_vehicle_type;

-- Legacy: empty vehicle_types JSON already meant match-all.
UPDATE sb_vendors
SET accept_any_vehicle_type = 1
WHERE vehicle_types IS NOT NULL
  AND TRIM(vehicle_types) IN ('[]', 'null');
