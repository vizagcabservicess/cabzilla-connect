-- Guest cab search alerts (WhatsApp notifications from track-search.php)
CREATE TABLE IF NOT EXISTS search_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guest_phone VARCHAR(20) NOT NULL,
    pickup TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    trip_type TEXT,
    departure VARCHAR(120) DEFAULT NULL,
    distance_km_one_way DECIMAL(10, 2) DEFAULT NULL,
    duration_minutes_one_way INT DEFAULT NULL,
    trip_mode VARCHAR(32) DEFAULT NULL,
    results_shown TEXT,
    vehicle_fares_json JSON DEFAULT NULL,
    whatsapp_message MEDIUMTEXT,
    searched_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_search_alerts_searched_at (searched_at),
    INDEX idx_search_alerts_guest_phone (guest_phone),
    INDEX idx_search_alerts_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
