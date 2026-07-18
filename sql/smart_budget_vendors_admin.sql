-- Smart Budget: admin vendor dashboard columns
-- Run after sql/smart_budget_migration.sql
-- Safe to re-run only if columns do not already exist.

ALTER TABLE sb_vendors
  ADD COLUMN verification_status ENUM(
    'pending',
    'approved',
    'rejected',
    'more_docs'
  ) NOT NULL DEFAULT 'approved' AFTER is_active,
  ADD COLUMN tier ENUM('silver', 'gold', 'platinum') NOT NULL DEFAULT 'silver' AFTER verification_status,
  ADD COLUMN notes TEXT DEFAULT NULL AFTER tier,
  ADD COLUMN trips_completed INT NOT NULL DEFAULT 0 AFTER notes,
  ADD COLUMN acceptance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0 AFTER trips_completed,
  ADD COLUMN cancellation_rate DECIMAL(5, 2) NOT NULL DEFAULT 0 AFTER acceptance_rate,
  ADD COLUMN on_time_rate DECIMAL(5, 2) NOT NULL DEFAULT 100 AFTER cancellation_rate;
