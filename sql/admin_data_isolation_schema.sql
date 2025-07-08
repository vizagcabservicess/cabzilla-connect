-- Admin Data Isolation Schema for Multi-Tenant Taxi Management
-- This extends the existing schema to support operator-based data isolation

-- Create admin_profiles table for operator business information
CREATE TABLE IF NOT EXISTS admin_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_user_id INT NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    business_phone VARCHAR(20),
    business_email VARCHAR(255),
    business_address TEXT,
    logo_url VARCHAR(500),
    description TEXT,
    starting_fare DECIMAL(10,2) DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    total_ratings INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    service_areas JSON DEFAULT '[]',
    amenities JSON DEFAULT '[]',
    vehicle_types JSON DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_admin_profiles_active (is_active),
    INDEX idx_admin_profiles_rating (rating)
);

-- Add owner_admin_id to vehicles table for data isolation
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS owner_admin_id INT NULL,
ADD INDEX idx_vehicles_owner_admin (owner_admin_id);

-- Add foreign key constraint if it doesn't exist
SET foreign_key_checks = 0;
ALTER TABLE vehicles 
ADD CONSTRAINT fk_vehicles_owner_admin 
FOREIGN KEY (owner_admin_id) REFERENCES users(id) ON DELETE SET NULL;
SET foreign_key_checks = 1;

-- Add created_by_admin_id to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS operator_admin_id INT NULL,
ADD COLUMN IF NOT EXISTS created_by_admin_id INT NULL,
ADD INDEX idx_bookings_operator_admin (operator_admin_id),
ADD INDEX idx_bookings_created_by_admin (created_by_admin_id);

-- Add foreign key constraints for bookings
SET foreign_key_checks = 0;
ALTER TABLE bookings 
ADD CONSTRAINT fk_bookings_operator_admin 
FOREIGN KEY (operator_admin_id) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_bookings_created_by_admin 
FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL;
SET foreign_key_checks = 1;

-- Add admin_id to fare management tables
ALTER TABLE local_fares 
ADD COLUMN IF NOT EXISTS admin_id INT NULL,
ADD INDEX idx_local_fares_admin (admin_id);

ALTER TABLE outstation_fares 
ADD COLUMN IF NOT EXISTS admin_id INT NULL,
ADD INDEX idx_outstation_fares_admin (admin_id);

ALTER TABLE airport_fares 
ADD COLUMN IF NOT EXISTS admin_id INT NULL,
ADD INDEX idx_airport_fares_admin (admin_id);

-- Add admin_id to drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS assigned_admin_id INT NULL,
ADD INDEX idx_drivers_assigned_admin (assigned_admin_id);

-- Create admin_vehicle_fares table for operator-specific pricing
CREATE TABLE IF NOT EXISTS admin_vehicle_fares (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    trip_type ENUM('local', 'outstation', 'airport') NOT NULL,
    base_fare DECIMAL(10,2) NOT NULL,
    per_km_rate DECIMAL(10,2) DEFAULT 0,
    per_hour_rate DECIMAL(10,2) DEFAULT 0,
    night_charges DECIMAL(10,2) DEFAULT 0,
    waiting_charges DECIMAL(10,2) DEFAULT 0,
    toll_charges DECIMAL(10,2) DEFAULT 0,
    driver_allowance DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE,
    effective_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_admin_vehicle_fare (admin_id, vehicle_id, trip_type),
    INDEX idx_admin_vehicle_fares_admin (admin_id),
    INDEX idx_admin_vehicle_fares_vehicle (vehicle_id),
    INDEX idx_admin_vehicle_fares_active (is_active)
);

-- Create operator_reviews table for customer feedback
CREATE TABLE IF NOT EXISTS operator_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    operator_admin_id INT NOT NULL,
    booking_id INT,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    INDEX idx_operator_reviews_operator (operator_admin_id),
    INDEX idx_operator_reviews_rating (rating),
    INDEX idx_operator_reviews_public (is_public)
);

-- Insert sample admin profiles for existing admin users
INSERT INTO admin_profiles (admin_user_id, business_name, display_name, business_phone, description, starting_fare, service_areas, amenities, vehicle_types)
SELECT 
    id,
    CONCAT(name, ' Travels'),
    CONCAT(name, ' Cab Services'),
    phone,
    CONCAT('Premium taxi services by ', name, '. Safe, reliable, and comfortable rides across the city.'),
    299.00,
    '["Visakhapatnam", "Vizianagaram", "Srikakulam"]',
    '["AC Vehicles", "GPS Tracking", "24x7 Support", "Professional Drivers"]',
    '["Sedan", "SUV", "Hatchback"]'
FROM users 
WHERE role IN ('admin', 'super_admin') 
AND id NOT IN (SELECT admin_user_id FROM admin_profiles)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Update existing vehicles to assign them to first admin if not assigned
UPDATE vehicles 
SET owner_admin_id = (
    SELECT id FROM users WHERE role IN ('admin', 'super_admin') LIMIT 1
) 
WHERE owner_admin_id IS NULL;

-- Update existing bookings to assign operator
UPDATE bookings 
SET operator_admin_id = (
    SELECT owner_admin_id FROM vehicles WHERE vehicles.id = bookings.vehicle_id LIMIT 1
),
created_by_admin_id = (
    SELECT id FROM users WHERE role IN ('admin', 'super_admin') LIMIT 1
)
WHERE operator_admin_id IS NULL;