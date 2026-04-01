-- Browser Web Push (VAPID) subscriptions for admin / super_admin dashboards.
-- Run once on the application database.

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    user_agent VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_web_push_user (user_id),
    KEY idx_web_push_endpoint_prefix (endpoint(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
