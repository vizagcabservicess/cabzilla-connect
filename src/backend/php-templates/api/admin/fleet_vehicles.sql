
-- Create fleet_vehicles table
CREATE TABLE IF NOT EXISTS fleet_vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_number VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    make VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    status ENUM('Active', 'Maintenance', 'Inactive') DEFAULT 'Active',
    last_service_date DATE,
    next_service_due DATE,
    fuel_type VARCHAR(50),
    vehicle_type VARCHAR(50),
    cab_type_id VARCHAR(50),
    capacity INT DEFAULT 4,
    luggage_capacity INT DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_driver_id INT,
    current_odometer INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_vehicle_number (vehicle_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create vehicle_documents table
CREATE TABLE IF NOT EXISTS vehicle_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    document_type ENUM('registration', 'insurance', 'permit', 'fitness', 'pollution', 'other') NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    issued_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    file_url VARCHAR(255),
    status ENUM('valid', 'expired', 'expiring_soon') DEFAULT 'valid',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_document (vehicle_id, document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create maintenance_records table
CREATE TABLE IF NOT EXISTS maintenance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    service_date DATE NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    description TEXT,
    cost DECIMAL(10,2) NOT NULL,
    vendor VARCHAR(100),
    odometer INT,
    next_service_due DATE,
    next_service_odometer INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES fleet_vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create fuel_records table
CREATE TABLE IF NOT EXISTS fuel_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    fill_date DATE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    price_per_unit DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    odometer INT,
    fuel_station VARCHAR(100),
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES fleet_vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create vehicle_assignments table
CREATE TABLE IF NOT EXISTS vehicle_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    booking_id INT NOT NULL,
    driver_id INT,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    UNIQUE KEY unique_booking_assignment (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add vehicle_id to bookings table if it doesn't exist
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS fleet_vehicle_id INT NULL,
ADD CONSTRAINT fk_booking_vehicle FOREIGN KEY (fleet_vehicle_id) REFERENCES fleet_vehicles(id) ON DELETE SET NULL;

-- Add indexing for better performance
CREATE INDEX idx_vehicle_status ON fleet_vehicles(status);
CREATE INDEX idx_vehicle_active ON fleet_vehicles(is_active);
CREATE INDEX idx_maintenance_date ON maintenance_records(service_date);
CREATE INDEX idx_maintenance_next ON maintenance_records(next_service_due);
CREATE INDEX idx_fuel_date ON fuel_records(fill_date);
CREATE INDEX idx_assignment_dates ON vehicle_assignments(start_date, end_date);
CREATE INDEX idx_document_expiry ON vehicle_documents(expiry_date);
