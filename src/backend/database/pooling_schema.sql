
-- MySQL Database Schema for Pooling Module

-- Users table for authentication and user management
CREATE TABLE pooling_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('guest', 'provider', 'admin') DEFAULT 'guest',
    is_active BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_rides INT DEFAULT 0,
    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    profile_image VARCHAR(500),
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_role (role)
);

-- Providers table for additional provider information
CREATE TABLE pooling_providers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    business_name VARCHAR(255),
    license_number VARCHAR(100),
    license_expiry DATE,
    insurance_number VARCHAR(100),
    insurance_expiry DATE,
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_account_holder VARCHAR(255),
    aadhar_number VARCHAR(20),
    pan_number VARCHAR(20),
    is_kyc_verified BOOLEAN DEFAULT FALSE,
    minimum_wallet_balance DECIMAL(10,2) DEFAULT 500.00,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    status ENUM('active', 'suspended', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES pooling_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_kyc_status (is_kyc_verified)
);

-- Vehicles table
CREATE TABLE pooling_vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    vehicle_type ENUM('car', 'bus', 'shared-taxi') NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INT,
    color VARCHAR(50),
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    chassis_number VARCHAR(50),
    engine_number VARCHAR(50),
    registration_date DATE,
    registration_expiry DATE,
    insurance_number VARCHAR(100),
    insurance_expiry DATE,
    pollution_certificate VARCHAR(100),
    pollution_expiry DATE,
    total_seats INT NOT NULL,
    amenities JSON,
    fuel_type ENUM('petrol', 'diesel', 'cng', 'electric') DEFAULT 'petrol',
    mileage DECIMAL(5,2),
    is_ac BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'maintenance', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES pooling_providers(id) ON DELETE CASCADE,
    INDEX idx_provider_id (provider_id),
    INDEX idx_plate_number (plate_number),
    INDEX idx_vehicle_type (vehicle_type)
);

-- Rides table
CREATE TABLE pooling_rides (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    ride_type ENUM('car', 'bus', 'shared-taxi') NOT NULL,
    from_location VARCHAR(255) NOT NULL,
    to_location VARCHAR(255) NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME,
    total_seats INT NOT NULL,
    available_seats INT NOT NULL,
    price_per_seat DECIMAL(10,2) NOT NULL,
    route_stops JSON,
    amenities JSON,
    rules JSON,
    cancellation_policy JSON,
    auto_approve_requests BOOLEAN DEFAULT FALSE,
    advance_booking_hours INT DEFAULT 2,
    status ENUM('draft', 'active', 'full', 'started', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES pooling_providers(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES pooling_vehicles(id) ON DELETE CASCADE,
    INDEX idx_provider_id (provider_id),
    INDEX idx_departure_time (departure_time),
    INDEX idx_route (from_location, to_location),
    INDEX idx_status (status),
    INDEX idx_ride_type (ride_type)
);

-- Ride requests table
CREATE TABLE pooling_ride_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL,
    guest_id INT NOT NULL,
    seats_requested INT NOT NULL,
    request_message TEXT,
    response_message TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    responded_by INT,
    FOREIGN KEY (ride_id) REFERENCES pooling_rides(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES pooling_users(id) ON DELETE CASCADE,
    FOREIGN KEY (responded_by) REFERENCES pooling_users(id) ON DELETE SET NULL,
    INDEX idx_ride_id (ride_id),
    INDEX idx_guest_id (guest_id),
    INDEX idx_status (status)
);

-- Bookings table
CREATE TABLE pooling_bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL,
    request_id INT,
    user_id INT NOT NULL,
    passenger_name VARCHAR(255) NOT NULL,
    passenger_phone VARCHAR(20) NOT NULL,
    passenger_email VARCHAR(255) NOT NULL,
    seats_booked INT NOT NULL,
    selected_seats JSON,
    from_stop VARCHAR(255),
    to_stop VARCHAR(255),
    total_amount DECIMAL(10,2) NOT NULL,
    booking_status ENUM('pending', 'approved', 'confirmed', 'started', 'completed', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'refunded', 'failed') DEFAULT 'pending',
    special_requests TEXT,
    cancellation_reason TEXT,
    cancellation_date TIMESTAMP NULL,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    can_cancel_free BOOLEAN DEFAULT TRUE,
    cancellation_deadline DATETIME,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES pooling_rides(id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES pooling_ride_requests(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES pooling_users(id) ON DELETE CASCADE,
    INDEX idx_ride_id (ride_id),
    INDEX idx_user_id (user_id),
    INDEX idx_booking_status (booking_status),
    INDEX idx_payment_status (payment_status)
);

-- Payments table
CREATE TABLE pooling_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('razorpay', 'wallet', 'cash') DEFAULT 'razorpay',
    payment_gateway VARCHAR(50) DEFAULT 'razorpay',
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    status ENUM('pending', 'processing', 'success', 'failed', 'refunded') DEFAULT 'pending',
    failure_reason TEXT,
    refund_id VARCHAR(100),
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_date TIMESTAMP NULL,
    refund_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES pooling_bookings(id) ON DELETE CASCADE,
    INDEX idx_booking_id (booking_id),
    INDEX idx_status (status),
    INDEX idx_payment_date (payment_date)
);

-- Wallets table
CREATE TABLE pooling_wallets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_type ENUM('guest', 'provider') NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0.00,
    locked_amount DECIMAL(10,2) DEFAULT 0.00,
    minimum_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    total_deposits DECIMAL(10,2) DEFAULT 0.00,
    total_withdrawals DECIMAL(10,2) DEFAULT 0.00,
    can_withdraw BOOLEAN DEFAULT TRUE,
    last_transaction_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES pooling_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_wallet (user_id),
    INDEX idx_user_type (user_type),
    INDEX idx_balance (balance)
);

-- Wallet transactions table
CREATE TABLE pooling_wallet_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    wallet_id INT NOT NULL,
    type ENUM('credit', 'debit', 'lock', 'unlock', 'penalty', 'withdrawal', 'deposit') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    purpose ENUM('booking_payment', 'ride_earning', 'refund', 'commission', 'penalty', 'compensation', 'withdrawal', 'deposit', 'cancellation_fee') NOT NULL,
    reference_id INT,
    reference_type ENUM('booking', 'ride', 'payment', 'withdrawal_request'),
    description TEXT NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'completed',
    gateway_transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES pooling_wallets(id) ON DELETE CASCADE,
    INDEX idx_wallet_id (wallet_id),
    INDEX idx_type (type),
    INDEX idx_purpose (purpose),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Ratings and reviews table
CREATE TABLE pooling_ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    ride_id INT NOT NULL,
    rater_id INT NOT NULL,
    rated_id INT NOT NULL,
    rater_type ENUM('guest', 'provider') NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    aspects JSON, -- {punctuality: 5, cleanliness: 4, behavior: 5, safety: 4}
    is_anonymous BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'hidden', 'flagged') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES pooling_bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES pooling_rides(id) ON DELETE CASCADE,
    FOREIGN KEY (rater_id) REFERENCES pooling_users(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_id) REFERENCES pooling_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_booking_rating (booking_id, rater_id),
    INDEX idx_rated_id (rated_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at)
);

-- Cancellation policies table
CREATE TABLE pooling_cancellation_policies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_type ENUM('car', 'bus', 'shared-taxi') NOT NULL,
    cancelled_by ENUM('guest', 'provider') NOT NULL,
    hours_before_departure INT NOT NULL,
    penalty_type ENUM('percentage', 'fixed') NOT NULL,
    penalty_amount DECIMAL(10,2) NOT NULL,
    refund_percentage DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ride_type (ride_type),
    INDEX idx_cancelled_by (cancelled_by)
);

-- Disputes table
CREATE TABLE pooling_disputes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    raised_by INT NOT NULL,
    raised_against INT NOT NULL,
    type ENUM('payment', 'service_quality', 'behavior', 'safety', 'cancellation', 'other') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls JSON,
    status ENUM('open', 'investigating', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assigned_to INT,
    resolution TEXT,
    compensation_amount DECIMAL(10,2) DEFAULT 0.00,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES pooling_bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (raised_by) REFERENCES pooling_users(id) ON DELETE CASCADE,
    FOREIGN KEY (raised_against) REFERENCES pooling_users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES pooling_users(id) ON DELETE SET NULL,
    INDEX idx_booking_id (booking_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority)
);

-- Commission tracking table
CREATE TABLE pooling_commissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    provider_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    provider_payout DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'calculated', 'paid', 'disputed') DEFAULT 'pending',
    hold_until DATETIME,
    payout_date TIMESTAMP NULL,
    payout_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES pooling_bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES pooling_providers(id) ON DELETE CASCADE,
    INDEX idx_booking_id (booking_id),
    INDEX idx_provider_id (provider_id),
    INDEX idx_status (status)
);

-- Notifications table
CREATE TABLE pooling_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('booking', 'payment', 'ride_update', 'request', 'cancellation', 'reminder', 'promotion') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    is_push_sent BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    is_sms_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES pooling_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- System settings table
CREATE TABLE pooling_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSON NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
);

-- Insert default settings
INSERT INTO pooling_settings (setting_key, setting_value, description) VALUES
('commission_rates', '{"car": 10, "bus": 8, "shared-taxi": 12}', 'Commission rates by vehicle type'),
('minimum_wallet_balance', '{"provider": 500, "guest": 0}', 'Minimum wallet balance required'),
('cancellation_policies', '{"free_cancellation_hours": 24, "penalty_percentage": 25}', 'Default cancellation policies'),
('payment_gateway', '{"razorpay_key": "rzp_test_41fJeGiVFyU9OQ", "razorpay_secret": "ZbNPHrr9CmMyMnm7TzJOJozH"}', 'Payment gateway configuration'),
('booking_settings', '{"advance_booking_hours": 2, "max_booking_days": 30}', 'Booking time restrictions'),
('rating_settings', '{"min_rating": 1, "max_rating": 5, "required_for_completion": true}', 'Rating system settings');

-- Create indexes for better performance
CREATE INDEX idx_rides_search ON pooling_rides (ride_type, from_location, to_location, departure_time, status);
CREATE INDEX idx_bookings_user_status ON pooling_bookings (user_id, booking_status, created_at);
CREATE INDEX idx_payments_status_date ON pooling_payments (status, payment_date);
CREATE INDEX idx_wallet_transactions_date ON pooling_wallet_transactions (wallet_id, created_at);
