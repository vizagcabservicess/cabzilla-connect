
<?php
/**
 * This is a utility script for setting up the driver management tables.
 * It should be executed once to create the necessary tables if they don't exist.
 */
require_once '../../config.php';

// Connect to database
$conn = getDbConnection();

try {
    // Create drivers table if it doesn't exist
    $query = "
    CREATE TABLE IF NOT EXISTS drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        vehicle_type VARCHAR(50),
        vehicle_number VARCHAR(20),
        status ENUM('Available', 'Busy', 'Offline') DEFAULT 'Available',
        location VARCHAR(100),
        rating DECIMAL(3,1) DEFAULT 0,
        rides INT DEFAULT 0,
        earnings DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
    ";
    
    $conn->query($query);
    
    // CREATE LOCAL PACKAGE FARES TABLE WITH CORRECTED COLUMN NAMES
    $local_fares_query = "
    CREATE TABLE IF NOT EXISTS local_package_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY vehicle_id (vehicle_id)
    ) ENGINE=InnoDB;
    ";
    
    $conn->query($local_fares_query);
    
    // CREATE AIRPORT TRANSFER FARES TABLE IF IT DOESN'T EXIST
    $airport_fares_query = "
    CREATE TABLE IF NOT EXISTS airport_transfer_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY vehicle_id (vehicle_id)
    ) ENGINE=InnoDB;
    ";
    
    $conn->query($airport_fares_query);
    
    // CREATE OUTSTATION FARES TABLE IF IT DOESN'T EXIST
    $outstation_fares_query = "
    CREATE TABLE IF NOT EXISTS outstation_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
        roundtrip_base_price DECIMAL(10,2) DEFAULT NULL,
        roundtrip_price_per_km DECIMAL(5,2) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY vehicle_id (vehicle_id)
    ) ENGINE=InnoDB;
    ";
    
    $conn->query($outstation_fares_query);
    
    // Insert sample data if the drivers table is empty
    $result = $conn->query("SELECT COUNT(*) as count FROM drivers");
    $row = $result->fetch_assoc();
    
    if ($row['count'] == 0) {
        // Insert sample drivers
        $conn->query("
            INSERT INTO drivers (name, phone, email, vehicle_type, vehicle_number, status, location, rating, rides, earnings) VALUES
            ('Rajesh Kumar', '9876543210', 'rajesh@example.com', 'Sedan', 'AP 31 XX 1234', 'Available', 'Hyderabad Central', 4.8, 352, 120000),
            ('Pavan Reddy', '8765432109', 'pavan@example.com', 'SUV', 'AP 32 XX 5678', 'Busy', 'Gachibowli', 4.6, 215, 85500),
            ('Suresh Verma', '7654321098', 'suresh@example.com', 'Sedan', 'AP 33 XX 9012', 'Offline', 'Offline', 4.5, 180, 72000),
            ('Venkatesh S', '9876543211', 'venkat@example.com', 'Hatchback', 'AP 34 XX 3456', 'Available', 'Kukatpally', 4.7, 298, 110000),
            ('Ramesh Babu', '8765432108', 'ramesh@example.com', 'Tempo', 'AP 35 XX 7890', 'Busy', 'Ameerpet', 4.4, 175, 65000)
        ");
        
        echo "Sample drivers added.\n";
    }
    
    // Add sample data to local_package_fares if it's empty
    $local_result = $conn->query("SELECT COUNT(*) as count FROM local_package_fares");
    $local_row = $local_result->fetch_assoc();
    
    if ($local_row['count'] == 0) {
        // Insert default local package fares
        $conn->query("
            INSERT INTO local_package_fares (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) VALUES
            ('sedan', 1200, 2200, 2500, 14, 250),
            ('ertiga', 1500, 2700, 3000, 18, 250),
            ('innova_crysta', 1800, 3000, 3500, 20, 250),
            ('tempo', 3000, 4500, 5500, 22, 300),
            ('luxury', 3500, 5500, 6500, 25, 300)
        ");
        
        echo "Sample local package fares added.\n";
    }
    
    // Add sample data to airport_transfer_fares if it's empty
    $airport_result = $conn->query("SELECT COUNT(*) as count FROM airport_transfer_fares");
    $airport_row = $airport_result->fetch_assoc();
    
    if ($airport_row['count'] == 0) {
        // Insert default airport transfer fares
        $conn->query("
            INSERT INTO airport_transfer_fares (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                                              tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) VALUES
            ('sedan', 3000, 12, 800, 800, 600, 800, 1000, 1200, 12),
            ('ertiga', 3500, 15, 1000, 1000, 800, 1000, 1200, 1400, 15),
            ('innova_crysta', 4000, 17, 1200, 1200, 1000, 1200, 1400, 1600, 17),
            ('tempo', 6000, 19, 2000, 2000, 1600, 1800, 2000, 2500, 19),
            ('luxury', 7000, 22, 2500, 2500, 2000, 2200, 2500, 3000, 22)
        ");
        
        echo "Sample airport transfer fares added.\n";
    }
    
    // Add sample data to outstation_fares if it's empty
    $outstation_result = $conn->query("SELECT COUNT(*) as count FROM outstation_fares");
    $outstation_row = $outstation_result->fetch_assoc();
    
    if ($outstation_row['count'] == 0) {
        // Insert default outstation fares
        $conn->query("
            INSERT INTO outstation_fares (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                                        roundtrip_base_price, roundtrip_price_per_km) VALUES
            ('sedan', 4200, 14, 700, 250, 4000, 12),
            ('ertiga', 5400, 18, 1000, 250, 5000, 15),
            ('innova_crysta', 6000, 20, 1000, 250, 5600, 17),
            ('tempo', 9000, 22, 1500, 300, 8500, 19),
            ('luxury', 10500, 25, 1500, 300, 10000, 22)
        ");
        
        echo "Sample outstation fares added.\n";
    }
    
    echo "Database setup complete.";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
