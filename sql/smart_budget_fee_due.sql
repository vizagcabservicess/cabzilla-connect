-- Smart Budget: fee payment deadline after vendor/admin accepts
-- Link TTL covers invite only; fee_due_at covers unlock payment after claim (10 minutes).

ALTER TABLE sb_sessions
  ADD COLUMN fee_due_at DATETIME DEFAULT NULL AFTER marketplace_expires_at;
