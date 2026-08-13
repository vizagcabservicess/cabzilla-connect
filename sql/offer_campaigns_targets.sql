-- Vehicle / tour targeting for offer campaigns
-- Empty targets = campaign applies to all vehicles/tours in the category (legacy behaviour)

CREATE TABLE IF NOT EXISTS oc_campaign_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  target_type ENUM('vehicle', 'tour') NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_oc_target (campaign_id, target_type, target_id),
  INDEX idx_oc_target_lookup (target_type, target_id, campaign_id),
  CONSTRAINT fk_oc_target_campaign FOREIGN KEY (campaign_id) REFERENCES oc_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
