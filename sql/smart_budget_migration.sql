-- Smart Budget Marketplace schema
-- Deploy on vizagtaxihub.com MySQL; frontend expects /api/smart-budget/{admin,public,vendor}.php

CREATE TABLE IF NOT EXISTS sb_vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(160) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rating DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
    vehicle_types JSON DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    verification_status ENUM(
        'pending',
        'approved',
        'rejected',
        'more_docs'
    ) NOT NULL DEFAULT 'approved',
    tier ENUM('silver', 'gold', 'platinum') NOT NULL DEFAULT 'silver',
    notes TEXT DEFAULT NULL,
    trips_completed INT NOT NULL DEFAULT 0,
    acceptance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    cancellation_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    on_time_rate DECIMAL(5, 2) NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sb_vendors_phone (phone),
    UNIQUE KEY uq_sb_vendors_email (email),
    INDEX idx_sb_vendors_active_rating (is_active, rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sb_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL,
    status ENUM(
        'link_sent',
        'budget_submitted',
        'admin_priority',
        'marketplace',
        'admin_assigned',
        'vendor_claimed',
        'chat_open',
        'fee_paid',
        'completed',
        'expired',
        'cancelled'
    ) NOT NULL DEFAULT 'link_sent',
    pickup TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    trip_datetime DATETIME NOT NULL,
    vehicle_type VARCHAR(80) NOT NULL,
    passengers INT NOT NULL DEFAULT 1,
    special_requests TEXT DEFAULT NULL,
    quoted_fare DECIMAL(10, 2) DEFAULT NULL,
    customer_budget DECIMAL(10, 2) DEFAULT NULL,
    customer_name VARCHAR(120) DEFAULT NULL,
    customer_phone VARCHAR(20) DEFAULT NULL,
    link_expires_at DATETIME NOT NULL,
    admin_priority_ends_at DATETIME DEFAULT NULL,
    marketplace_expires_at DATETIME DEFAULT NULL,
    claimed_vendor_id INT DEFAULT NULL,
    admin_vehicle_assigned TINYINT(1) NOT NULL DEFAULT 0,
    driver_name VARCHAR(120) DEFAULT NULL,
    vehicle_number VARCHAR(40) DEFAULT NULL,
    created_by_admin_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sb_sessions_token (token),
    INDEX idx_sb_sessions_status (status),
    INDEX idx_sb_sessions_link_expires (link_expires_at),
    INDEX idx_sb_sessions_admin_priority (status, admin_priority_ends_at),
    CONSTRAINT fk_sb_sessions_vendor
        FOREIGN KEY (claimed_vendor_id) REFERENCES sb_vendors(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sb_session_offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    vendor_id INT NOT NULL,
    status ENUM('pending', 'skipped', 'accepted', 'closed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sb_offer_session_vendor (session_id, vendor_id),
    INDEX idx_sb_offers_vendor_status (vendor_id, status),
    CONSTRAINT fk_sb_offers_session
        FOREIGN KEY (session_id) REFERENCES sb_sessions(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_sb_offers_vendor
        FOREIGN KEY (vendor_id) REFERENCES sb_vendors(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sb_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    sender_role ENUM('admin', 'customer', 'vendor') NOT NULL,
    sender_name VARCHAR(120) DEFAULT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sb_messages_session (session_id, created_at),
    CONSTRAINT fk_sb_messages_session
        FOREIGN KEY (session_id) REFERENCES sb_sessions(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sb_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    razorpay_order_id VARCHAR(80) DEFAULT NULL,
    razorpay_payment_id VARCHAR(80) DEFAULT NULL,
    razorpay_signature VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sb_payments_session (session_id),
    INDEX idx_sb_payments_order (razorpay_order_id),
    CONSTRAINT fk_sb_payments_session
        FOREIGN KEY (session_id) REFERENCES sb_sessions(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
