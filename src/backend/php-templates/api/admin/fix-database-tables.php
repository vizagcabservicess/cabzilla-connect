
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

// Disable displaying errors directly, but log them
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Create log directory
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Set error log file
$logFile = $logDir . '/fix-database.log';
ini_set('error_log', $logFile);

// Initialize response
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

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/fix-database.log');
}

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
    
    // Log success
    logMessage("Database connection successful");
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Fix 1: Check if vehicles table exists and fix night_halt_charge and driver_allowance fields
        if ($conn->query("SHOW TABLES LIKE 'vehicles'")->num_rows > 0) {
            logMessage("Fixing vehicles table");
            
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
        }
        
        // Fix 2: Check if outstation_fares table exists and fix its columns
        if ($conn->query("SHOW TABLES LIKE 'outstation_fares'")->num_rows > 0) {
            logMessage("Fixing outstation_fares table");
            
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
        
        // Fix 3: Look for other tables with these columns and fix there too
        $tables = [];
        $tablesResult = $conn->query("SHOW TABLES");
        while ($table = $tablesResult->fetch_array(MYSQLI_NUM)) {
            $tables[] = $table[0];
        }
        
        foreach ($tables as $table) {
            $columnsResult = $conn->query("SHOW COLUMNS FROM `$table`");
            $columns = [];
            while ($column = $columnsResult->fetch_assoc()) {
                $columns[] = $column['Field'];
            }
            
            if (in_array('night_halt_charge', $columns)) {
                logMessage("Found night_halt_charge in $table, fixing");
                $conn->query("UPDATE `$table` SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
                $response['details']['tables_fixed'][] = "$table - NULL values fixed in night_halt_charge";
            }
            
            if (in_array('driver_allowance', $columns)) {
                logMessage("Found driver_allowance in $table, fixing");
                $conn->query("UPDATE `$table` SET driver_allowance = 250 WHERE driver_allowance IS NULL");
                $response['details']['tables_fixed'][] = "$table - NULL values fixed in driver_allowance";
            }
        }
        
        // Fix 4: Ensure all vehicles have corresponding entries in pricing tables
        $vehiclesResult = $conn->query("SELECT id, vehicle_id FROM vehicles");
        while ($vehicle = $vehiclesResult->fetch_assoc()) {
            $vehicleId = $vehicle['id'] ?? $vehicle['vehicle_id'];
            
            // Check outstation_fares
            $checkOutstation = $conn->query("SELECT COUNT(*) as count FROM outstation_fares WHERE vehicle_id = '$vehicleId'");
            $outstationCount = $checkOutstation->fetch_assoc()['count'];
            
            if ($outstationCount == 0) {
                // Create entry with default values
                $insertOutstation = $conn->query("
                    INSERT INTO outstation_fares (
                        vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                        roundtrip_base_price, roundtrip_price_per_km, created_at, updated_at
                    ) VALUES (
                        '$vehicleId', 3000, 15, 700, 250, 2850, 12.75, NOW(), NOW()
                    )
                ");
                
                if ($insertOutstation) {
                    $response['details']['vehicle_pricing_entries'][] = "Created outstation pricing for $vehicleId";
                }
            }
            
            // Check local_package_fares
            $checkLocal = $conn->query("SELECT COUNT(*) as count FROM local_package_fares WHERE vehicle_id = '$vehicleId'");
            $localCount = $checkLocal->fetch_assoc()['count'];
            
            if ($localCount == 0) {
                // Create entry with default values
                $insertLocal = $conn->query("
                    INSERT INTO local_package_fares (
                        vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                        price_extra_km, price_extra_hour, created_at, updated_at
                    ) VALUES (
                        '$vehicleId', 1200, 2200, 2500, 14, 250, NOW(), NOW()
                    )
                ");
                
                if ($insertLocal) {
                    $response['details']['vehicle_pricing_entries'][] = "Created local package pricing for $vehicleId";
                }
            }
            
            // Check airport_transfer_fares
            $checkAirport = $conn->query("SELECT COUNT(*) as count FROM airport_transfer_fares WHERE vehicle_id = '$vehicleId'");
            $airportCount = $checkAirport->fetch_assoc()['count'];
            
            if ($airportCount == 0) {
                // Create entry with default values
                $insertAirport = $conn->query("
                    INSERT INTO airport_transfer_fares (
                        vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                        tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge,
                        night_charges, extra_waiting_charges,
                        created_at, updated_at
                    ) VALUES (
                        '$vehicleId', 3000, 12, 800, 800, 600, 800, 1000, 1200, 12, 
                        150, 100, NOW(), NOW()
                    )
                ");
                
                if ($insertAirport) {
                    $response['details']['vehicle_pricing_entries'][] = "Created airport transfer pricing for $vehicleId";
                }
            } else {
                // Check if night_charges and extra_waiting_charges columns exist
                $airportColumnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'night_charges'");
                if ($airportColumnsResult->num_rows == 0) {
                    // Add night_charges column if it doesn't exist
                    $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) DEFAULT 150");
                    $response['details']['tables_fixed'][] = "Added night_charges column to airport_transfer_fares";
                }
                
                $airportColumnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
                if ($airportColumnsResult->num_rows == 0) {
                    // Add extra_waiting_charges column if it doesn't exist
                    $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) DEFAULT 100");
                    $response['details']['tables_fixed'][] = "Added extra_waiting_charges column to airport_transfer_fares";
                }
            }
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
    logMessage($errorMessage);
    
    $response['status'] = 'error';
    $response['message'] = $errorMessage;
    $response['details']['errors'][] = $e->getMessage();
}

// Send response with JSON_PARTIAL_OUTPUT_ON_ERROR to ensure valid JSON even if there's an error
echo json_encode($response, JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_PRETTY_PRINT);
exit;
