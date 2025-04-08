
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

// Create logs directory
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Set up log file
$logFile = $logDir . '/database_fix_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Fix database attempt started\n", FILE_APPEND);

// Function to send JSON response
function sendJsonResponse($status, $message, $data = []) {
    $response = [
        'status' => $status,
        'message' => $message,
        'timestamp' => time()
    ];
    
    if (!empty($data)) {
        $response = array_merge($response, $data);
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}

// Function to log messages
function logMessage($message) {
    global $logFile, $timestamp;
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

try {
    // Try to include the config file, if it exists
    if (file_exists('../../config.php')) {
        require_once '../../config.php';
    } 
    
    // Check for utils/database.php
    if (file_exists('../utils/database.php')) {
        require_once '../utils/database.php';
    } else {
        // Fallback database function
        function getDbConnection() {
            // Database credentials
            $dbHost = 'localhost';
            $dbName = 'u644605165_db_be';
            $dbUser = 'u644605165_usr_be';
            $dbPass = 'Vizag@1213';
            
            try {
                // Create connection
                $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
                
                // Check connection
                if ($conn->connect_error) {
                    throw new Exception("Connection failed: " . $conn->connect_error);
                }
                
                // Set charset
                $conn->set_charset("utf8mb4");
                
                // Set collation to ensure consistency
                $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
                
                return $conn;
            } catch (Exception $e) {
                logMessage("Database connection error: " . $e->getMessage());
                return null;
            }
        }
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Failed to connect to database. Check credentials.");
    }
    
    logMessage("Successfully connected to database");
    
    // Check if vehicles table exists
    $tablesResult = $conn->query("SHOW TABLES LIKE 'vehicles'");
    $vehiclesTableExists = ($tablesResult && $tablesResult->num_rows > 0);
    
    logMessage("Vehicles table exists: " . ($vehiclesTableExists ? 'Yes' : 'No'));
    
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
                capacity INT DEFAULT 4,
                luggage_capacity INT DEFAULT 2,
                ac TINYINT DEFAULT 1,
                image VARCHAR(255) DEFAULT '/cars/sedan.png',
                amenities TEXT,
                description TEXT,
                is_active TINYINT DEFAULT 1,
                base_price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 700,
                driver_allowance DECIMAL(10,2) DEFAULT 250,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createVehiclesTable)) {
            throw new Exception("Failed to create vehicles table: " . $conn->error);
        }
        
        $fixed[] = "Created vehicles table";
        logMessage("Successfully created vehicles table");
    } else {
        // Table exists, check its structure
        $missingColumns = [];
        
        // Define expected columns and their definitions
        $expectedColumns = [
            'id' => 'VARCHAR(50) NOT NULL',
            'vehicle_id' => 'VARCHAR(50) NOT NULL',
            'name' => 'VARCHAR(100) NOT NULL',
            'category' => "VARCHAR(50) DEFAULT 'Standard'",
            'capacity' => 'INT DEFAULT 4',
            'luggage_capacity' => 'INT DEFAULT 2',
            'base_price' => 'DECIMAL(10,2) DEFAULT 0',
            'price_per_km' => 'DECIMAL(10,2) DEFAULT 0',
            'image' => "VARCHAR(255) DEFAULT '/cars/sedan.png'",
            'description' => 'TEXT',
            'amenities' => 'TEXT',
            'ac' => 'TINYINT DEFAULT 1',
            'is_active' => 'TINYINT DEFAULT 1',
            'night_halt_charge' => 'DECIMAL(10,2) DEFAULT 700',
            'driver_allowance' => 'DECIMAL(10,2) DEFAULT 250'
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
                        logMessage("Added column $column to vehicles table");
                    } else {
                        logMessage("Failed to add column $column: " . $conn->error);
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
                id INT NOT NULL AUTO_INCREMENT,
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
        logMessage("Successfully created airport_transfer_fares table");
    }
    
    // Check if vehicle_pricing table exists
    $vpTableResult = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    $vpTableExists = ($vpTableResult && $vpTableResult->num_rows > 0);
    
    if (!$vpTableExists) {
        $createVPTable = "
            CREATE TABLE IF NOT EXISTS vehicle_pricing (
                id INT NOT NULL AUTO_INCREMENT,
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
        logMessage("Successfully created vehicle_pricing table");
    }
    
    // Check for vehicles in the database
    $vehiclesCountResult = $conn->query("SELECT COUNT(*) as count FROM vehicles");
    $vehiclesCount = 0;
    if ($vehiclesCountResult && $vehiclesResult = $vehiclesCountResult->fetch_assoc()) {
        $vehiclesCount = $vehiclesResult['count'];
    }
    
    logMessage("Found $vehiclesCount vehicles in database");
    
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
                logMessage("Added $insertCount default vehicles");
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
            logMessage("Synced $affected vehicles with airport_transfer_fares table");
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
            logMessage("Synced $affected vehicles with vehicle_pricing table");
        }
    }
    
    // Generate and update the persistent vehicle cache
    $persistentCacheDir = dirname(__FILE__) . '/../../cache';
    if (!file_exists($persistentCacheDir)) {
        mkdir($persistentCacheDir, 0755, true);
    }
    
    $persistentCacheFile = $persistentCacheDir . '/vehicles_persistent.json';
    
    // Get all vehicles
    $vehiclesResult = $conn->query("SELECT * FROM vehicles");
    if ($vehiclesResult) {
        $vehicles = [];
        
        while ($row = $vehiclesResult->fetch_assoc()) {
            // Parse amenities field if it exists
            $amenities = ['AC'];
            if (!empty($row['amenities'])) {
                $parsedAmenities = json_decode($row['amenities'], true);
                if (is_array($parsedAmenities)) {
                    $amenities = $parsedAmenities;
                }
            }
            
            // Create a vehicle object in the format expected by frontend
            $vehicle = [
                'id' => $row['id'],
                'vehicleId' => $row['vehicle_id'],
                'name' => $row['name'],
                'capacity' => (int)$row['capacity'],
                'luggageCapacity' => (int)$row['luggage_capacity'],
                'price' => (float)$row['base_price'],
                'basePrice' => (float)$row['base_price'],
                'pricePerKm' => (float)$row['price_per_km'],
                'image' => $row['image'],
                'amenities' => $amenities,
                'description' => $row['description'],
                'ac' => (bool)(int)$row['ac'],
                'nightHaltCharge' => (float)$row['night_halt_charge'],
                'driverAllowance' => (float)$row['driver_allowance'],
                'isActive' => (bool)(int)$row['is_active']
            ];
            
            $vehicles[] = $vehicle;
        }
        
        // Save to persistent cache
        if (!empty($vehicles) && file_put_contents($persistentCacheFile, json_encode($vehicles, JSON_PRETTY_PRINT))) {
            $fixed[] = "Updated vehicle persistent cache with " . count($vehicles) . " vehicles";
            logMessage("Updated vehicle persistent cache with " . count($vehicles) . " vehicles");
        }
    }
    
    // Close the database connection
    $conn->close();
    
    // Return success response with details of what was fixed
    sendJsonResponse('success', 'Database fix completed successfully', [
        'fixes' => $fixed,
        'count' => count($fixed)
    ]);
    
    logMessage("Fix database completed successfully");
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    sendJsonResponse('error', $e->getMessage());
}
