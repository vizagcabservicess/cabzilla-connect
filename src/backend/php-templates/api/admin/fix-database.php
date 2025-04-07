
<?php
/**
 * Fix database tables and structure
 * This script recreates necessary tables if they're missing or have structure issues
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Load configuration
require_once dirname(__FILE__) . '/../../config.php';

// Load utilities
require_once dirname(__FILE__) . '/../utils/response.php';

// Log the fix attempt
$logFile = LOG_DIR . '/database_fix_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Fix database attempt started\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Failed to connect to database. Check credentials.");
    }
    
    // Log successful connection
    file_put_contents($logFile, "[$timestamp] Successfully connected to database\n", FILE_APPEND);
    
    // Check if vehicles table exists
    $tablesResult = $conn->query("SHOW TABLES LIKE 'vehicles'");
    $vehiclesTableExists = ($tablesResult && $tablesResult->num_rows > 0);
    
    file_put_contents($logFile, "[$timestamp] Vehicles table exists: " . ($vehiclesTableExists ? 'Yes' : 'No') . "\n", FILE_APPEND);
    
    // Array to track what was fixed
    $fixed = [];
    
    // Create or recreate vehicles table if needed
    if (!$vehiclesTableExists) {
        $createVehiclesTable = "
            CREATE TABLE IF NOT EXISTS vehicles (
                id VARCHAR(50) NOT NULL,
                vehicle_id VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) DEFAULT 'Standard',
                capacity INT(11) DEFAULT 4,
                luggage_capacity INT(11) DEFAULT 2,
                base_price DECIMAL(10,2) DEFAULT 0.00,
                price_per_km DECIMAL(5,2) DEFAULT 0.00,
                image VARCHAR(255) DEFAULT '',
                description TEXT,
                amenities TEXT,
                ac TINYINT(1) DEFAULT 1,
                is_active TINYINT(1) DEFAULT 1,
                night_halt_charge DECIMAL(10,2) DEFAULT 0.00,
                driver_allowance DECIMAL(10,2) DEFAULT 0.00,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createVehiclesTable)) {
            throw new Exception("Failed to create vehicles table: " . $conn->error);
        }
        
        $fixed[] = "Created vehicles table";
        file_put_contents($logFile, "[$timestamp] Successfully created vehicles table\n", FILE_APPEND);
    } else {
        // Table exists, check its structure
        $missingColumns = [];
        
        // Define expected columns and their definitions
        $expectedColumns = [
            'id' => 'VARCHAR(50) NOT NULL',
            'vehicle_id' => 'VARCHAR(50) NOT NULL',
            'name' => 'VARCHAR(100) NOT NULL',
            'category' => "VARCHAR(50) DEFAULT 'Standard'",
            'capacity' => 'INT(11) DEFAULT 4',
            'luggage_capacity' => 'INT(11) DEFAULT 2',
            'base_price' => 'DECIMAL(10,2) DEFAULT 0.00',
            'price_per_km' => 'DECIMAL(5,2) DEFAULT 0.00',
            'image' => "VARCHAR(255) DEFAULT ''",
            'description' => 'TEXT',
            'amenities' => 'TEXT',
            'ac' => 'TINYINT(1) DEFAULT 1',
            'is_active' => 'TINYINT(1) DEFAULT 1',
            'night_halt_charge' => 'DECIMAL(10,2) DEFAULT 0.00',
            'driver_allowance' => 'DECIMAL(10,2) DEFAULT 0.00'
        ];
        
        // Get existing columns
        $columns = [];
        $columnsResult = $conn->query("DESCRIBE vehicles");
        if ($columnsResult) {
            while ($column = $columnsResult->fetch_assoc()) {
                $columns[$column['Field']] = true;
            }
            
            // Check for missing columns
            foreach ($expectedColumns as $column => $definition) {
                if (!isset($columns[$column])) {
                    $missingColumns[] = $column;
                    
                    // Add the missing column
                    $query = "ALTER TABLE vehicles ADD COLUMN $column $definition";
                    if ($conn->query($query)) {
                        $fixed[] = "Added column $column to vehicles table";
                        file_put_contents($logFile, "[$timestamp] Added column $column to vehicles table\n", FILE_APPEND);
                    } else {
                        file_put_contents($logFile, "[$timestamp] Failed to add column $column: " . $conn->error . "\n", FILE_APPEND);
                    }
                }
            }
        }
    }
    
    // Check if airport_transfer_fares table exists
    $airportTableResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    $airportTableExists = ($airportTableResult && $airportTableResult->num_rows > 0);
    
    if (!$airportTableExists) {
        $createAirportTable = "
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createAirportTable)) {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
        
        $fixed[] = "Created airport_transfer_fares table";
        file_put_contents($logFile, "[$timestamp] Successfully created airport_transfer_fares table\n", FILE_APPEND);
    }
    
    // Check if vehicle_pricing table exists
    $vpTableResult = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    $vpTableExists = ($vpTableResult && $vpTableResult->num_rows > 0);
    
    if (!$vpTableExists) {
        $createVPTable = "
            CREATE TABLE IF NOT EXISTS vehicle_pricing (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                trip_type VARCHAR(20) NOT NULL,
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createVPTable)) {
            throw new Exception("Failed to create vehicle_pricing table: " . $conn->error);
        }
        
        $fixed[] = "Created vehicle_pricing table";
        file_put_contents($logFile, "[$timestamp] Successfully created vehicle_pricing table\n", FILE_APPEND);
    }
    
    // Check for vehicles in the database
    $vehiclesCountResult = $conn->query("SELECT COUNT(*) as count FROM vehicles");
    $vehiclesCount = 0;
    if ($vehiclesCountResult && $vehiclesResult = $vehiclesCountResult->fetch_assoc()) {
        $vehiclesCount = $vehiclesResult['count'];
    }
    
    file_put_contents($logFile, "[$timestamp] Found $vehiclesCount vehicles in database\n", FILE_APPEND);
    
    // If no vehicles exist, create default ones
    if ($vehiclesCount == 0) {
        // Add default vehicles
        $defaultVehicles = [
            ['sedan', 'sedan', 'Sedan', 'Standard', 4, 2],
            ['ertiga', 'ertiga', 'Ertiga', 'Standard', 6, 3],
            ['innova_crysta', 'innova_crysta', 'Innova Crysta', 'Premium', 6, 4],
            ['toyota', 'toyota', 'Toyota', 'Premium', 4, 2],
            ['tempo_traveller', 'tempo_traveller', 'Tempo Traveller', 'Group', 12, 10]
        ];
        
        $insertVehicleStmt = $conn->prepare("INSERT INTO vehicles (id, vehicle_id, name, category, capacity, luggage_capacity, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
        
        if ($insertVehicleStmt) {
            $insertCount = 0;
            foreach ($defaultVehicles as $vehicle) {
                $insertVehicleStmt->bind_param("ssssii", $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5]);
                if ($insertVehicleStmt->execute()) {
                    $insertCount++;
                }
            }
            
            if ($insertCount > 0) {
                $fixed[] = "Added $insertCount default vehicles";
                file_put_contents($logFile, "[$timestamp] Added $insertCount default vehicles\n", FILE_APPEND);
            }
        }
    }
    
    // Sync airport fares with vehicles
    $syncQuery = "
        INSERT IGNORE INTO airport_transfer_fares (vehicle_id)
        SELECT vehicle_id FROM vehicles WHERE is_active = 1
    ";
    
    if ($conn->query($syncQuery)) {
        $affected = $conn->affected_rows;
        if ($affected > 0) {
            $fixed[] = "Synced $affected vehicles with airport_transfer_fares table";
            file_put_contents($logFile, "[$timestamp] Synced $affected vehicles with airport_transfer_fares table\n", FILE_APPEND);
        }
    }
    
    // Sync vehicle_pricing with vehicles
    $syncVPQuery = "
        INSERT IGNORE INTO vehicle_pricing (vehicle_id, trip_type)
        SELECT vehicle_id, 'airport' FROM vehicles WHERE is_active = 1
    ";
    
    if ($conn->query($syncVPQuery)) {
        $affected = $conn->affected_rows;
        if ($affected > 0) {
            $fixed[] = "Synced $affected vehicles with vehicle_pricing table";
            file_put_contents($logFile, "[$timestamp] Synced $affected vehicles with vehicle_pricing table\n", FILE_APPEND);
        }
    }
    
    // Also trigger the more detailed sync airport fares script
    if (file_exists(__DIR__ . '/sync-airport-fares.php')) {
        file_put_contents($logFile, "[$timestamp] Triggering sync-airport-fares.php script\n", FILE_APPEND);
        include_once __DIR__ . '/sync-airport-fares.php';
    }
    
    // Close the database connection
    $conn->close();
    
    // Return success response with details of what was fixed
    sendSuccessResponse([
        'fixes' => $fixed,
        'count' => count($fixed)
    ], 'Database fix completed successfully');
    
    file_put_contents($logFile, "[$timestamp] Fix database completed successfully\n", FILE_APPEND);
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    sendErrorResponse($e->getMessage());
}
