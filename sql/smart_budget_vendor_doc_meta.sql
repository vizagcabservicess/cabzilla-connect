-- Per-document KYC review metadata (reject / re-upload / expiry)
-- Safe to re-run if column already exists (will error once — ignore duplicate column).

ALTER TABLE sb_vendors
  ADD COLUMN doc_meta JSON DEFAULT NULL AFTER admin_notified_at;
