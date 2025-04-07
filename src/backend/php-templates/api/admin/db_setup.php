
<?php
/**
 * Database setup script
 * Ensures all necessary tables exist with proper structure and collation
 */

// Include the database utilities
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../../config.php';

// Function to create or update the vehicles table
function setupVehiclesTable($conn) {
    $conn->query("
        CREATE TABLE IF NOT EXISTS vehicles (
            id VARCHAR(50) NOT NULL,
            vehicle_id VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            capacity INT NOT NULL DEFAULT 4,
            luggage_capacity INT NOT NULL DEFAULT 2,
            price DECIMAL(10,2) NOT NULL DEFAULT 0,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            image VARCHAR(255),
            amenities TEXT,
            description TEXT,
            ac TINYINT(1) NOT NULL DEFAULT 1,
            night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
            driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Fix collation if needed
    $conn->query("ALTER TABLE vehicles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
}

// Function to create or update the vehicle_pricing table
function setupVehiclePricingTable($conn) {
    $conn->query("
        CREATE TABLE IF NOT EXISTS vehicle_pricing (
            id INT(11) NOT NULL AUTO_INCREMENT,
            vehicle_id VARCHAR(50) NOT NULL,
            trip_type VARCHAR(50) NOT NULL,
            base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
            night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
            airport_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            airport_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            airport_pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            airport_drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            airport_tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            airport_tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            airport_tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            airport_tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            airport_extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Fix collation if needed
    $conn->query("ALTER TABLE vehicle_pricing CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
}

// Function to create or update the airport_transfer_fares table
function setupAirportTransferFaresTable($conn) {
    $conn->query("
        CREATE TABLE IF NOT EXISTS airport_transfer_fares (
            id INT(11) NOT NULL AUTO_INCREMENT,
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
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Fix collation if needed
    $conn->query("ALTER TABLE airport_transfer_fares CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
}

// Function to create or update the vehicle_types table
function setupVehicleTypesTable($conn) {
    $conn->query("
        CREATE TABLE IF NOT EXISTS vehicle_types (
            id INT(11) NOT NULL AUTO_INCREMENT,
            vehicle_id VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            capacity INT NOT NULL DEFAULT 4,
            luggage_capacity INT NOT NULL DEFAULT 2,
            ac TINYINT(1) NOT NULL DEFAULT 1,
            image VARCHAR(255),
            amenities TEXT,
            description TEXT,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Fix collation if needed
    $conn->query("ALTER TABLE vehicle_types CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
}

// Main function to set up all tables
function setupAllTables() {
    $conn = getDbConnection();
    if (!$conn) {
        return false;
    }
    
    // Set charset and collation explicitly
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
    
    // Set up each table
    setupVehiclesTable($conn);
    setupVehiclePricingTable($conn);
    setupAirportTransferFaresTable($conn);
    setupVehicleTypesTable($conn);
    
    // Sync data between tables to ensure consistency
    syncTablesData($conn);
    
    $conn->close();
    return true;
}

// Function to sync data between tables
function syncTablesData($conn) {
    // Sync between vehicle_types and vehicles
    $conn->query("
        INSERT IGNORE INTO vehicles (id, vehicle_id, name, capacity, luggage_capacity, is_active)
        SELECT vehicle_id, vehicle_id, name, capacity, luggage_capacity, is_active
        FROM vehicle_types
    ");
    
    $conn->query("
        INSERT IGNORE INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, is_active)
        SELECT vehicle_id, name, capacity, luggage_capacity, is_active
        FROM vehicles
    ");
    
    // Make sure every vehicle has an entry in airport_transfer_fares
    $conn->query("
        INSERT IGNORE INTO airport_transfer_fares (vehicle_id, base_price, price_per_km)
        SELECT vehicle_id, 0, 0
        FROM vehicles
        WHERE vehicle_id NOT IN (SELECT vehicle_id FROM airport_transfer_fares)
    ");
    
    // Make sure every vehicle has an entry in vehicle_pricing for airport trip type
    $conn->query("
        INSERT IGNORE INTO vehicle_pricing (vehicle_id, trip_type, base_fare, price_per_km)
        SELECT vehicle_id, 'airport', 0, 0
        FROM vehicles
        WHERE vehicle_id NOT IN (
            SELECT vehicle_id FROM vehicle_pricing WHERE trip_type = 'airport'
        )
    ");
    
    // Sync from airport_transfer_fares to vehicle_pricing
    $conn->query("
        UPDATE vehicle_pricing vp
        JOIN airport_transfer_fares atf ON vp.vehicle_id = atf.vehicle_id
        SET 
            vp.airport_base_price = atf.base_price,
            vp.airport_price_per_km = atf.price_per_km,
            vp.airport_pickup_price = atf.pickup_price,
            vp.airport_drop_price = atf.drop_price,
            vp.airport_tier1_price = atf.tier1_price,
            vp.airport_tier2_price = atf.tier2_price,
            vp.airport_tier3_price = atf.tier3_price,
            vp.airport_tier4_price = atf.tier4_price,
            vp.airport_extra_km_charge = atf.extra_km_charge,
            vp.updated_at = NOW()
        WHERE vp.trip_type = 'airport' AND (
            vp.airport_base_price != atf.base_price OR
            vp.airport_price_per_km != atf.price_per_km OR
            vp.airport_pickup_price != atf.pickup_price OR
            vp.airport_drop_price != atf.drop_price OR
            vp.airport_tier1_price != atf.tier1_price OR
            vp.airport_tier2_price != atf.tier2_price OR
            vp.airport_tier3_price != atf.tier3_price OR
            vp.airport_tier4_price != atf.tier4_price OR
            vp.airport_extra_km_charge != atf.extra_km_charge
        )
    ");
}

// Run the setup when this script is included
setupAllTables();
