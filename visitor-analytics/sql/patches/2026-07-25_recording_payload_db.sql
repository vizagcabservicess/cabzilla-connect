-- Persist recording chunk bytes in MySQL so replay survives Hostinger redeploys
-- (local .data/object-store is wiped when the Node app is redeployed).
-- Ignore duplicate-column errors if already applied.

ALTER TABLE va_recording_chunks
  ADD COLUMN payload_gzip MEDIUMBLOB NULL AFTER byte_size;
