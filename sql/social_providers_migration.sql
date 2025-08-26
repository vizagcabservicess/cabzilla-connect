-- Social Providers Table Migration
-- This table stores social login provider information for users

-- Drop table if exists and recreate (for development)
-- DROP TABLE IF EXISTS `social_providers`;

CREATE TABLE IF NOT EXISTS `social_providers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `provider` enum('google','facebook') NOT NULL,
  `provider_id` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `picture` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_provider_user` (`provider`, `provider_id`),
  KEY `user_id` (`user_id`),
  KEY `email` (`email`),
  CONSTRAINT `social_providers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance (only if they don't exist)
-- CREATE INDEX IF NOT EXISTS idx_social_providers_provider ON social_providers(provider);
-- CREATE INDEX IF NOT EXISTS idx_social_providers_provider_id ON social_providers(provider_id);
-- CREATE INDEX IF NOT EXISTS idx_social_providers_user_provider ON social_providers(user_id, provider);
