
<?php
/**
 * fix-database-tables.php - Fix database issues
 * 
 * This script fixes common database issues such as NULL values in critical fields
 * and ensures proper table structure.
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Error reporting
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Response array
$response = [
    'status' => 'error',
    'message' => 'Unknown error occurred',
    'details' => [
        'tables_fixed' => [],
        'vehicle_pricing_entries' => [],
        'tables_failed' => [],
        'errors' => []
    ],
    'timestamp' => time()
];

try {
    // Define database connection - FIXED credentials with proper escaping 
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    // Make sure the password is properly escaped
    $dbPass = 'Vizag@1213';
    
    // Create connection with retry logic
    $maxRetries = 3;
    $connected = false;
    $lastError = null;
    
    for ($retryCount = 0; $retryCount < $maxRetries && !$connected; $retryCount++) {
        try {
            // Create the connection
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
            // Check connection
            if ($conn->connect_error) {
                throw new Exception("Database connection failed: " . $conn->connect_error);
            }
            
            // Test the connection with a simple query
            $testResult = $conn->query("SELECT 1");
            if (!$testResult) {
                throw new Exception("Database connection test failed");
            }
            
            $connected = true;
            break;
        } catch (Exception $e) {
            $lastError = $e;
            if ($retryCount < $maxRetries - 1) {
                // Wait before retrying
                usleep(500000); // 500ms
            }
        }
    }
    
    if (!$connected) {
        throw new Exception("Failed to connect to database after {$maxRetries} attempts: " . $lastError->getMessage());
    }
    
    // Enable logging
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . '/fix-database.log';
    error_log(date('Y-m-d H:i:s') . " - Starting database fix\n", 3, $logFile);
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Fix 1: Check if vehicles table exists and fix night_halt_charge and driver_allowance fields
        if ($conn->query("SHOW TABLES LIKE 'vehicles'")->num_rows > 0) {
            error_log(date('Y-m-d H:i:s') . " - Fixing vehicles table\n", 3, $logFile);
            
            // Ensure night_halt_charge and driver_allowance are NOT NULL with DEFAULT values
            $conn->query("
                ALTER TABLE vehicles 
                MODIFY night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                MODIFY driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250
            ");
            
            // Update any NULL values in vehicles table
            $updateResult = $conn->query("UPDATE vehicles SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
            $updateResult2 = $conn->query("UPDATE vehicles SET driver_allowance = 250 WHERE driver_allowance IS NULL");
            
            $response['details']['tables_fixed'][] = 'vehicles table - NULL values fixed in night_halt_charge and driver_allowance';
        } else {
            // Create vehicles table if it doesn't exist
            $createVehiclesTable = "
                CREATE TABLE IF NOT EXISTS vehicles (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    capacity INT NOT NULL DEFAULT 4,
                    luggage_capacity INT NOT NULL DEFAULT 2,
                    ac BOOLEAN NOT NULL DEFAULT TRUE,
                    image VARCHAR(255),
                    amenities TEXT,
                    description TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                    price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
                    night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                    driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            
            if ($conn->query($createVehiclesTable)) {
                $response['details']['tables_fixed'][] = "Created vehicles table";
                error_log(date('Y-m-d H:i:s') . " - Created vehicles table\n", 3, $logFile);
            } else {
                $response['details']['tables_failed'][] = "Failed to create vehicles table: " . $conn->error;
                error_log(date('Y-m-d H:i:s') . " - Failed to create vehicles table: " . $conn->error . "\n", 3, $logFile);
            }
        }
        
        // Fix 2: Check if outstation_fares table exists and fix its columns
        if ($conn->query("SHOW TABLES LIKE 'outstation_fares'")->num_rows > 0) {
            error_log(date('Y-m-d H:i:s') . " - Fixing outstation_fares table\n", 3, $logFile);
            
            // Ensure night_halt_charge and driver_allowance are NOT NULL with DEFAULT values
            $conn->query("
                ALTER TABLE outstation_fares 
                MODIFY night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                MODIFY driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250
            ");
            
            // Update any NULL values in outstation_fares table
            $conn->query("UPDATE outstation_fares SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
            $conn->query("UPDATE outstation_fares SET driver_allowance = 250 WHERE driver_allowance IS NULL");
            
            $response['details']['tables_fixed'][] = 'outstation_fares table - NULL values fixed in night_halt_charge and driver_allowance';
        }
        
        // Fix 3: Create and check airport_transfer_fares table
        if ($conn->query("SHOW TABLES LIKE 'airport_transfer_fares'")->num_rows > 0) {
            error_log(date('Y-m-d H:i:s') . " - Airport transfer fares table exists, checking structure\n", 3, $logFile);
            
            // Check if all required columns exist
            $requiredColumns = [
                'vehicle_id', 'base_price', 'price_per_km', 'pickup_price', 'drop_price',
                'tier1_price', 'tier2_price', 'tier3_price', 'tier4_price', 'extra_km_charge'
            ];
            
            $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares");
            $existingColumns = [];
            while ($columnRow = $columnsResult->fetch_assoc()) {
                $existingColumns[] = $columnRow['Field'];
            }
            
            $missingColumns = array_diff($requiredColumns, $existingColumns);
            
            if (!empty($missingColumns)) {
                error_log(date('Y-m-d H:i:s') . " - Missing columns in airport_transfer_fares: " . implode(', ', $missingColumns) . "\n", 3, $logFile);
                
                // Add missing columns
                foreach ($missingColumns as $missingColumn) {
                    $dataType = "DECIMAL(10,2) NOT NULL DEFAULT 0";
                    if ($missingColumn === 'vehicle_id') {
                        $dataType = "VARCHAR(50) NOT NULL";
                    } else if ($missingColumn === 'price_per_km' || $missingColumn === 'extra_km_charge') {
                        $dataType = "DECIMAL(5,2) NOT NULL DEFAULT 0";
                    }
                    
                    $alterQuery = "ALTER TABLE airport_transfer_fares ADD COLUMN $missingColumn $dataType";
                    if ($conn->query($alterQuery)) {
                        $response['details']['tables_fixed'][] = "Added missing column $missingColumn to airport_transfer_fares";
                        error_log(date('Y-m-d H:i:s') . " - Added missing column $missingColumn to airport_transfer_fares\n", 3, $logFile);
                    } else {
                        $response['details']['tables_failed'][] = "Failed to add column $missingColumn to airport_transfer_fares: " . $conn->error;
                        error_log(date('Y-m-d H:i:s') . " - Failed to add column $missingColumn: " . $conn->error . "\n", 3, $logFile);
                    }
                }
            }
        } else {
            // Create airport_transfer_fares table if it doesn't exist
            $createAirportFaresTable = "
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
            
            if ($conn->query($createAirportFaresTable)) {
                $response['details']['tables_fixed'][] = "Created airport_transfer_fares table";
                error_log(date('Y-m-d H:i:s') . " - Created airport_transfer_fares table\n", 3, $logFile);
            } else {
                $response['details']['tables_failed'][] = "Failed to create airport_transfer_fares table: " . $conn->error;
                error_log(date('Y-m-d H:i:s') . " - Failed to create airport_transfer_fares table: " . $conn->error . "\n", 3, $logFile);
            }
        }
        
        // Fix 4: Create and check vehicle_pricing table
        if ($conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0) {
            error_log(date('Y-m-d H:i:s') . " - Vehicle pricing table exists, checking airport columns\n", 3, $logFile);
            
            // Check if all required airport columns exist
            $airportColumns = [
                'airport_base_price', 'airport_price_per_km', 'airport_pickup_price', 'airport_drop_price',
                'airport_tier1_price', 'airport_tier2_price', 'airport_tier3_price', 'airport_tier4_price', 
                'airport_extra_km_charge'
            ];
            
            $columnsResult = $conn->query("SHOW COLUMNS FROM vehicle_pricing");
            $existingColumns = [];
            while ($columnRow = $columnsResult->fetch_assoc()) {
                $existingColumns[] = $columnRow['Field'];
            }
            
            $missingColumns = array_diff($airportColumns, $existingColumns);
            
            if (!empty($missingColumns)) {
                error_log(date('Y-m-d H:i:s') . " - Missing columns in vehicle_pricing: " . implode(', ', $missingColumns) . "\n", 3, $logFile);
                
                // Add missing columns
                foreach ($missingColumns as $missingColumn) {
                    $dataType = "DECIMAL(10,2) NOT NULL DEFAULT 0";
                    if ($missingColumn === 'airport_price_per_km' || $missingColumn === 'airport_extra_km_charge') {
                        $dataType = "DECIMAL(5,2) NOT NULL DEFAULT 0";
                    }
                    
                    $alterQuery = "ALTER TABLE vehicle_pricing ADD COLUMN $missingColumn $dataType";
                    if ($conn->query($alterQuery)) {
                        $response['details']['tables_fixed'][] = "Added missing column $missingColumn to vehicle_pricing";
                        error_log(date('Y-m-d H:i:s') . " - Added missing column $missingColumn to vehicle_pricing\n", 3, $logFile);
                    } else {
                        $response['details']['tables_failed'][] = "Failed to add column $missingColumn to vehicle_pricing: " . $conn->error;
                        error_log(date('Y-m-d H:i:s') . " - Failed to add column $missingColumn: " . $conn->error . "\n", 3, $logFile);
                    }
                }
            }
        } else {
            // Create vehicle_pricing table if it doesn't exist
            $createVehiclePricingTable = "
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
            
            if ($conn->query($createVehiclePricingTable)) {
                $response['details']['tables_fixed'][] = "Created vehicle_pricing table";
                error_log(date('Y-m-d H:i:s') . " - Created vehicle_pricing table\n", 3, $logFile);
            } else {
                $response['details']['tables_failed'][] = "Failed to create vehicle_pricing table: " . $conn->error;
                error_log(date('Y-m-d H:i:s') . " - Failed to create vehicle_pricing table: " . $conn->error . "\n", 3, $logFile);
            }
        }
        
        // Fix 5: Ensure all vehicles have corresponding entries in pricing tables
        $vehiclesResult = $conn->query("SELECT id, vehicle_id FROM vehicles");
        if ($vehiclesResult) {
            while ($vehicle = $vehiclesResult->fetch_assoc()) {
                $vehicleId = $vehicle['vehicle_id'] ?? $vehicle['id'];
                
                // Check airport_transfer_fares
                $checkAirport = $conn->query("SELECT COUNT(*) as count FROM airport_transfer_fares WHERE vehicle_id = '$vehicleId'");
                if ($checkAirport) {
                    $airportCount = $checkAirport->fetch_assoc()['count'];
                    
                    if ($airportCount == 0) {
                        // Create entry with default values
                        $insertAirport = $conn->query("
                            INSERT INTO airport_transfer_fares (
                                vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                                tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge,
                                created_at, updated_at
                            ) VALUES (
                                '$vehicleId', 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW()
                            )
                        ");
                        
                        if ($insertAirport) {
                            $response['details']['vehicle_pricing_entries'][] = "Created airport transfer pricing for $vehicleId";
                            error_log(date('Y-m-d H:i:s') . " - Created airport transfer pricing for $vehicleId\n", 3, $logFile);
                        }
                    }
                }
                
                // Check vehicle_pricing for airport entries
                $checkVPAirport = $conn->query("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_id = '$vehicleId' AND trip_type = 'airport'");
                if ($checkVPAirport) {
                    $vpAirportCount = $checkVPAirport->fetch_assoc()['count'];
                    
                    if ($vpAirportCount == 0) {
                        // Create entry with default values
                        $insertVPAirport = $conn->query("
                            INSERT INTO vehicle_pricing (
                                vehicle_id, trip_type, airport_base_price, airport_price_per_km, airport_pickup_price,
                                airport_drop_price, airport_tier1_price, airport_tier2_price, airport_tier3_price,
                                airport_tier4_price, airport_extra_km_charge, created_at, updated_at
                            ) VALUES (
                                '$vehicleId', 'airport', 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW()
                            )
                        ");
                        
                        if ($insertVPAirport) {
                            $response['details']['vehicle_pricing_entries'][] = "Created vehicle_pricing airport entry for $vehicleId";
                            error_log(date('Y-m-d H:i:s') . " - Created vehicle_pricing airport entry for $vehicleId\n", 3, $logFile);
                        }
                    }
                }
            }
        }
        
        // Fix 6: Sync data between airport_transfer_fares and vehicle_pricing tables
        $syncQuery = "
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
            WHERE 
                vp.trip_type = 'airport'
        ";
        
        if ($conn->query($syncQuery)) {
            $response['details']['tables_fixed'][] = "Synced data between airport_transfer_fares and vehicle_pricing tables";
            error_log(date('Y-m-d H:i:s') . " - Synced data between airport_transfer_fares and vehicle_pricing tables\n", 3, $logFile);
        } else {
            $response['details']['tables_failed'][] = "Failed to sync between tables: " . $conn->error;
            error_log(date('Y-m-d H:i:s') . " - Failed to sync between tables: " . $conn->error . "\n", 3, $logFile);
        }
        
        // Commit all changes
        $conn->commit();
        
        // Success response
        $response['status'] = 'success';
        $response['message'] = 'Database tables fixed successfully';
        
    } catch (Exception $e) {
        // Roll back transaction on error
        $conn->rollback();
        throw $e;
    }
    
    // Close connection
    $conn->close();
    
} catch (Exception $e) {
    $errorMessage = "Error fixing database tables: " . $e->getMessage();
    error_log(date('Y-m-d H:i:s') . " - $errorMessage\n", 3, $logFile ?? null);
    
    $response['status'] = 'error';
    $response['message'] = $errorMessage;
    $response['details']['errors'][] = $e->getMessage();
}

// Send response
echo json_encode($response, JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_PRETTY_PRINT);
exit;
