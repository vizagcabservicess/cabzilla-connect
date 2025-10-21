-- Email Verification Migration
-- Add email verification fields to users table

-- Add email verification columns to users table
ALTER TABLE `users` 
ADD COLUMN `email_verified` BOOLEAN DEFAULT FALSE,
ADD COLUMN `email_verification_token` VARCHAR(255) NULL,
ADD COLUMN `email_verification_expires` DATETIME NULL,
ADD COLUMN `is_active` BOOLEAN DEFAULT TRUE;

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`),
  KEY `expires_at` (`expires_at`),
  CONSTRAINT `email_verification_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Update existing users to have email_verified = TRUE (assuming they were verified before this change)
UPDATE `users` SET `email_verified` = TRUE WHERE `email_verified` = FALSE;





















