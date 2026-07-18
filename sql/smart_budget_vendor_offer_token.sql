-- Per-vendor magic link for WhatsApp OTP claim (/smart-budget/v/{offer_token})
-- Run once on production. Ignore errors if column/index already exists.

ALTER TABLE sb_session_offers
  ADD COLUMN offer_token VARCHAR(64) DEFAULT NULL AFTER status;

ALTER TABLE sb_session_offers
  ADD UNIQUE KEY uq_sb_offer_token (offer_token);
