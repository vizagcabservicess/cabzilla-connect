
<?php
/**
 * fix-vehicle-tables.php - Utility script to fix vehicle tables and ensure non-NULL values
 * This script repairs database issues and ensures all required fields have proper default values
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Disable displaying errors directly, but log them
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Set error log file
ini_set('error_log', $logDir . '/php_errors.log');

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/fix-vehicle-tables.log');
}

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time(),
    'actions' => []
];

try {
    // Function for establishing database connection with retry mechanism
    function getDbConnectionWithRetry($maxRetries = 3) {
        $attempts = 0;
        $lastError = null;
        
        while ($attempts < $maxRetries) {
            try {
                $attempts++;
                
                // Try to use database.php utility functions if available
                if (file_exists(dirname(__FILE__) . '/../utils/database.php')) {
                    require_once dirname(__FILE__) . '/../utils/database.php';
                    $conn = getDbConnection();
                    logMessage("Connected to database using database.php utilities on attempt $attempts");
                    
                    // Test connection
                    $testQuery = $conn->query('SELECT 1');
                    if (!$testQuery) {
                        throw new Exception("Database connection test failed on attempt $attempts");
                    }
                    
                    return $conn;
                }
                // Fallback to config if available
                else if (file_exists(dirname(__FILE__) . '/../../config.php')) {
                    require_once dirname(__FILE__) . '/../../config.php';
                    $conn = getDbConnection();
                    logMessage("Connected to database using config.php on attempt $attempts");
                    
                    // Test connection
                    $testQuery = $conn->query('SELECT 1');
                    if (!$testQuery) {
                        throw new Exception("Database connection test failed on attempt $attempts");
                    }
                    
                    return $conn;
                } 
                // Last resort - hardcoded credentials
                else {
                    logMessage("Config files not found, using hardcoded credentials on attempt $attempts");
                    $dbHost = 'localhost';
                    $dbName = 'u644605165_new_bookingdb';
                    $dbUser = 'u644605165_new_bookingusr';
                    $dbPass = 'Vizag@1213';
                    
                    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
                    
                    if ($conn->connect_error) {
                        throw new Exception("Database connection failed: " . $conn->connect_error);
                    }
                    
                    logMessage("Connected to database using hardcoded credentials on attempt $attempts");
                    return $conn;
                }
            } catch (Exception $e) {
                $lastError = $e;
                logMessage("Connection attempt $attempts failed: " . $e->getMessage());
                
                if ($attempts < $maxRetries) {
                    // Wait increasingly longer between retries
                    $sleepTime = pow(2, $attempts - 1) * 500000; // 0.5s, 1s, 2s
                    usleep($sleepTime);
                    logMessage("Retrying connection after $sleepTime microseconds");
                }
            }
        }
        
        // All attempts failed
        throw new Exception("Failed to connect to database after $maxRetries attempts: " . $lastError->getMessage());
    }
    
    // Get database connection with retry
    $conn = getDbConnectionWithRetry(3);
    
    // Set connection options for better stability
    $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 30);
    $conn->query("SET SESSION wait_timeout=300"); // 5 minutes
    $conn->query("SET SESSION interactive_timeout=300"); // 5 minutes
    $conn->query("SET SESSION net_read_timeout=300"); // 5 minutes
    $conn->query("SET SESSION net_write_timeout=300"); // 5 minutes
    
    // Check and fix tables
    $tablesFixed = [];
    
    // Fix vehicles table
    if ($conn->query("SHOW TABLES LIKE 'vehicles'")->num_rows > 0) {
        // Check if night_halt_charge allows NULL values
        $result = $conn->query("DESCRIBE vehicles night_halt_charge");
        $columnInfo = $result->fetch_assoc();
        
        if (strpos(strtoupper($columnInfo['Null']), 'YES') !== false) {
            // Column allows NULL values, modify it
            $conn->query("ALTER TABLE vehicles MODIFY COLUMN night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700");
            $tablesFixed[] = "Modified vehicles.night_halt_charge to NOT NULL with DEFAULT 700";
        }
        
        // Check if driver_allowance allows NULL values
        $result = $conn->query("DESCRIBE vehicles driver_allowance");
        $columnInfo = $result->fetch_assoc();
        
        if (strpos(strtoupper($columnInfo['Null']), 'YES') !== false) {
            // Column allows NULL values, modify it
            $conn->query("ALTER TABLE vehicles MODIFY COLUMN driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250");
            $tablesFixed[] = "Modified vehicles.driver_allowance to NOT NULL with DEFAULT 250";
        }
        
        // Update any NULL values in night_halt_charge to 700
        $conn->query("UPDATE vehicles SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
        $tablesFixed[] = "Fixed NULL night_halt_charge values in vehicles table";
        
        // Update any NULL values in driver_allowance to 250
        $conn->query("UPDATE vehicles SET driver_allowance = 250 WHERE driver_allowance IS NULL");
        $tablesFixed[] = "Fixed NULL driver_allowance values in vehicles table";
    }
    
    // Fix outstation_fares table
    if ($conn->query("SHOW TABLES LIKE 'outstation_fares'")->num_rows > 0) {
        // Check if night_halt_charge allows NULL values
        $result = $conn->query("DESCRIBE outstation_fares night_halt_charge");
        $columnInfo = $result->fetch_assoc();
        
        if (strpos(strtoupper($columnInfo['Null']), 'YES') !== false) {
            // Column allows NULL values, modify it
            $conn->query("ALTER TABLE outstation_fares MODIFY COLUMN night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700");
            $tablesFixed[] = "Modified outstation_fares.night_halt_charge to NOT NULL with DEFAULT 700";
        }
        
        // Check if driver_allowance allows NULL values
        $result = $conn->query("DESCRIBE outstation_fares driver_allowance");
        $columnInfo = $result->fetch_assoc();
        
        if (strpos(strtoupper($columnInfo['Null']), 'YES') !== false) {
            // Column allows NULL values, modify it
            $conn->query("ALTER TABLE outstation_fares MODIFY COLUMN driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250");
            $tablesFixed[] = "Modified outstation_fares.driver_allowance to NOT NULL with DEFAULT 250";
        }
        
        // Update any NULL values in night_halt_charge to 700
        $conn->query("UPDATE outstation_fares SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
        $tablesFixed[] = "Fixed NULL night_halt_charge values in outstation_fares table";
        
        // Update any NULL values in driver_allowance to 250
        $conn->query("UPDATE outstation_fares SET driver_allowance = 250 WHERE driver_allowance IS NULL");
        $tablesFixed[] = "Fixed NULL driver_allowance values in outstation_fares table";
    }
    
    // Fix vehicle_types table if it exists
    if ($conn->query("SHOW TABLES LIKE 'vehicle_types'")->num_rows > 0) {
        // Check if night_halt_charge allows NULL values
        $result = $conn->query("DESCRIBE vehicle_types night_halt_charge");
        if ($result && $result->num_rows > 0) {
            $columnInfo = $result->fetch_assoc();
            
            if (strpos(strtoupper($columnInfo['Null']), 'YES') !== false) {
                // Column allows NULL values, modify it
                $conn->query("ALTER TABLE vehicle_types MODIFY COLUMN night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700");
                $tablesFixed[] = "Modified vehicle_types.night_halt_charge to NOT NULL with DEFAULT 700";
            }
            
            // Update any NULL values in night_halt_charge to 700
            $conn->query("UPDATE vehicle_types SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
            $tablesFixed[] = "Fixed NULL night_halt_charge values in vehicle_types table";
        }
        
        // Check if driver_allowance allows NULL values
        $result = $conn->query("DESCRIBE vehicle_types driver_allowance");
        if ($result && $result->num_rows > 0) {
            $columnInfo = $result->fetch_assoc();
            
            if (strpos(strtoupper($columnInfo['Null']), 'YES') !== false) {
                // Column allows NULL values, modify it
                $conn->query("ALTER TABLE vehicle_types MODIFY COLUMN driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250");
                $tablesFixed[] = "Modified vehicle_types.driver_allowance to NOT NULL with DEFAULT 250";
            }
            
            // Update any NULL values in driver_allowance to 250
            $conn->query("UPDATE vehicle_types SET driver_allowance = 250 WHERE driver_allowance IS NULL");
            $tablesFixed[] = "Fixed NULL driver_allowance values in vehicle_types table";
        }
    }
    
    // Fix vehicle_pricing table if it exists
    if ($conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0) {
        // Check if night_halt_charge exists and allows NULL values
        $result = $conn->query("DESCRIBE vehicle_pricing night_halt_charge");
        if ($result && $result->num_rows > 0) {
            $columnInfo = $result->fetch_assoc();
            
            if (strpos(strtoupper($columnInfo['Null']), 'YES') !== false) {
                // Column allows NULL values, modify it
                $conn->query("ALTER TABLE vehicle_pricing MODIFY COLUMN night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700");
                $tablesFixed[] = "Modified vehicle_pricing.night_halt_charge to NOT NULL with DEFAULT 700";
            }
            
            // Update any NULL values in night_halt_charge to 700
            $conn->query("UPDATE vehicle_pricing SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
            $tablesFixed[] = "Fixed NULL night_halt_charge values in vehicle_pricing table";
        }
        
        // Check if driver_allowance exists and allows NULL values
        $result = $conn->query("DESCRIBE vehicle_pricing driver_allowance");
        if ($result && $result->num_rows > 0) {
            $columnInfo = $result->fetch_assoc();
            
            if (strpos(strtoupper($columnInfo['Null']), 'YES') !== false) {
                // Column allows NULL values, modify it
                $conn->query("ALTER TABLE vehicle_pricing MODIFY COLUMN driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250");
                $tablesFixed[] = "Modified vehicle_pricing.driver_allowance to NOT NULL with DEFAULT 250";
            }
            
            // Update any NULL values in driver_allowance to 250
            $conn->query("UPDATE vehicle_pricing SET driver_allowance = 250 WHERE driver_allowance IS NULL");
            $tablesFixed[] = "Fixed NULL driver_allowance values in vehicle_pricing table";
        }
    }
    
    // Ensure db_setup.php is fixed
    if (file_exists(dirname(__FILE__) . '/db_setup.php')) {
        require_once dirname(__FILE__) . '/db_setup.php';
        $tablesFixed[] = "Re-ran database setup script";
    }
    
    // Close the connection
    $conn->close();
    
    // Build success response
    $response = [
        'status' => 'success',
        'message' => 'Database tables fixed successfully',
        'timestamp' => time(),
        'actions' => $tablesFixed
    ];
    
    logMessage("Database tables fixed successfully");
    
} catch (Exception $e) {
    $errorMessage = "Error fixing database tables: " . $e->getMessage();
    $response['message'] = $errorMessage;
    $response['error'] = $e->getMessage();
    logMessage($errorMessage);
}

// Send response - ensure valid JSON even if error occurs
echo json_encode($response, JSON_PARTIAL_OUTPUT_ON_ERROR);
exit;
