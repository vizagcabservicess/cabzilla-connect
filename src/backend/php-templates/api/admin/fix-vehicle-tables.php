
<?php
// fix-vehicle-tables.php - Fix and repair vehicle database tables

// Set comprehensive CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, *');
header('Access-Control-Expose-Headers: *');
header('X-API-Version: 1.0.1');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database configuration
require_once __DIR__ . '/../../config.php';

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // 1. Create vehicles table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                capacity INT DEFAULT 4,
                luggage_capacity INT DEFAULT 2,
                base_price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 700,
                driver_allowance DECIMAL(10,2) DEFAULT 250,
                ac TINYINT(1) DEFAULT 1,
                image VARCHAR(255) DEFAULT '/cars/sedan.png',
                amenities TEXT,
                description TEXT,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");
        
        // 2. Create vehicle_types table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicle_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                capacity INT DEFAULT 4,
                luggage_capacity INT DEFAULT 2,
                base_price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 700,
                driver_allowance DECIMAL(10,2) DEFAULT 250,
                ac TINYINT(1) DEFAULT 1,
                image VARCHAR(255) DEFAULT '/cars/sedan.png',
                amenities TEXT,
                description TEXT,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");
        
        // 3. Create vehicle_pricing table if it doesn't exist
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicle_pricing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                trip_type VARCHAR(50) DEFAULT 'all',
                base_fare DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 700,
                driver_allowance DECIMAL(10,2) DEFAULT 250,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
            )
        ");
        
        // Add missing columns to vehicle tables if they don't exist
        $vehicleTables = ['vehicles', 'vehicle_types'];
        $columns = [
            'night_halt_charge' => 'DECIMAL(10,2) DEFAULT 700',
            'driver_allowance' => 'DECIMAL(10,2) DEFAULT 250',
            'base_price' => 'DECIMAL(10,2) DEFAULT 0',
            'price_per_km' => 'DECIMAL(10,2) DEFAULT 0'
        ];
        
        foreach ($vehicleTables as $table) {
            foreach ($columns as $column => $definition) {
                // Check if column exists
                $result = $conn->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
                if (!$result || $result->num_rows === 0) {
                    $conn->query("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
                }
            }
        }
        
        // Synchronize data between tables
        $conn->query("
            INSERT INTO vehicles (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active)
            SELECT vt.vehicle_id, vt.name, vt.capacity, vt.luggage_capacity, vt.ac, vt.image, vt.amenities, vt.description, vt.is_active
            FROM vehicle_types vt
            LEFT JOIN vehicles v ON vt.vehicle_id = v.vehicle_id
            WHERE v.vehicle_id IS NULL
            ON DUPLICATE KEY UPDATE updated_at = NOW()
        ");
        
        // Commit the transaction
        $conn->commit();
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle tables created and fixed successfully',
            'tables_created' => ['vehicles', 'vehicle_types', 'vehicle_pricing'],
            'columns_added' => $columns
        ]);
        
    } catch (Exception $e) {
        // Rollback the transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    // Log and return error response
    error_log("Error fixing vehicle tables: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fix vehicle tables: ' . $e->getMessage()
    ]);
}
