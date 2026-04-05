-- Optional: fuel_records.driver_id must be fleet `drivers.id` (matches dashboard filter).
-- Older builds mistakenly stored JWT `users.id` in this column. Fix rows where driver_id = drivers.user_id.

UPDATE fuel_records fr
INNER JOIN drivers d ON d.user_id = fr.driver_id
SET fr.driver_id = d.id
WHERE fr.driver_id IS NOT NULL;
