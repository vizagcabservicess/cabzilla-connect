
-- Create fleet_commission_settings table
CREATE TABLE IF NOT EXISTS fleet_commission_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT 'Default Commission',
    description TEXT,
    default_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add commission_percentage to fleet_vehicles table if it doesn't exist
ALTER TABLE fleet_vehicles 
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS use_default_commission BOOLEAN DEFAULT TRUE;

-- Create fleet_commission_payments table
CREATE TABLE IF NOT EXISTS fleet_commission_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    driver_id INT,
    total_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    payment_date DATETIME NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add commission columns to vehicle_assignments table
ALTER TABLE vehicle_assignments
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) NULL,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) NULL;

-- Insert default commission setting if not exists
INSERT INTO fleet_commission_settings (name, description, default_percentage, is_active)
SELECT 'Default Commission', 'Standard commission rate for fleet vehicles', 10.00, TRUE
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM fleet_commission_settings LIMIT 1);

-- Create index for better query performance
CREATE INDEX idx_commission_vehicle ON fleet_commission_payments(vehicle_id);
CREATE INDEX idx_commission_booking ON fleet_commission_payments(booking_id);
CREATE INDEX idx_commission_status ON fleet_commission_payments(status);
