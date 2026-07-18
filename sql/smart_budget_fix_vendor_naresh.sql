-- Fix Naresh Reddy (id 10 / 8790755002) — go live + eligible for all cab types.
-- vehicle_types = [] means match-all (primary_vehicle_type is ignored for filtering).
-- After running: vendor should open Vendor Dashboard once (creates offers + WhatsApp for open trips).

UPDATE sb_vendors
SET
  name = 'Naresh Reddy',
  phone = '8790755002',
  email = 'nareshreddyerisi6@gmail.com',
  is_active = 1,
  verification_status = 'approved',
  rating = GREATEST(IFNULL(rating, 0), 4.80),
  vehicle_types = '[]'
WHERE id = 10
   OR RIGHT(REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), ' ', ''), '-', ''), '+', ''), 10) = '8790755002'
   OR LOWER(TRIM(COALESCE(email, ''))) = 'nareshreddyerisi6@gmail.com';

-- Optional check:
-- SELECT id, name, phone, is_active, verification_status, rating, vehicle_types, primary_vehicle_type
-- FROM sb_vendors
-- WHERE id = 10 OR phone LIKE '%8790755002%';
