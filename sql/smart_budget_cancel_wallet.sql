-- Smart Budget: vendor wallet balance (can go negative on cancel penalties)
-- Safe to re-run only if column does not already exist.

ALTER TABLE sb_vendors
  ADD COLUMN wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER on_time_rate;

ALTER TABLE sb_sessions
  ADD COLUMN cancelled_by ENUM('admin', 'customer', 'vendor') DEFAULT NULL AFTER fee_due_at,
  ADD COLUMN cancel_reason VARCHAR(255) DEFAULT NULL AFTER cancelled_by,
  ADD COLUMN cancelled_at DATETIME DEFAULT NULL AFTER cancel_reason;
