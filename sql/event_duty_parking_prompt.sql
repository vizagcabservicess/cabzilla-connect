-- Driver "In Parking" prompt after the event manager marks a vehicle In Trip.
-- The PHP API also adds these columns on the next event request.

ALTER TABLE vth_event_duties ADD COLUMN parking_prompt_at DATETIME NULL;
ALTER TABLE vth_event_duties ADD COLUMN parking_prompt_nonce VARCHAR(32) NULL;
