-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    license_number VARCHAR(50) NOT NULL,
    vehicle_number VARCHAR(50),
    vehicle_type VARCHAR(50),
    status ENUM('active', 'inactive', 'on_trip', 'blocked') DEFAULT 'inactive',
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_phone (phone),
    UNIQUE KEY unique_license (license_number),
    UNIQUE KEY unique_vehicle (vehicle_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create driver_documents table
CREATE TABLE IF NOT EXISTS driver_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    document_type ENUM('license', 'insurance', 'registration', 'permit', 'other') NOT NULL,
    document_number VARCHAR(100),
    expiry_date DATE,
    document_url VARCHAR(255),
    status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_document (driver_id, document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create driver_trips table
CREATE TABLE IF NOT EXISTS driver_trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    booking_id INT NOT NULL,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    status ENUM('assigned', 'started', 'completed', 'cancelled') DEFAULT 'assigned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    UNIQUE KEY unique_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create driver_ratings table
CREATE TABLE IF NOT EXISTS driver_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    booking_id INT NOT NULL,
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    UNIQUE KEY unique_booking_rating (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add indexes for better performance
CREATE INDEX idx_driver_status ON drivers(status);
CREATE INDEX idx_driver_location ON drivers(location);
CREATE INDEX idx_trip_status ON driver_trips(status);
CREATE INDEX idx_trip_dates ON driver_trips(start_time, end_time); 