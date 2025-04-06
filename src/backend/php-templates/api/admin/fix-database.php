
<?php
/**
 * Fix database tables and structure
 * This script recreates necessary tables if they're missing or have structure issues
 */

// Set error handling to catch issues
ini_set('display_errors', 0);
error_reporting(E_ALL);

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

// Log the fix attempt
$logFile = __DIR__ . '/../../logs/database_fix_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Create log directory if it doesn't exist
if (!file_exists(dirname($logFile))) {
    mkdir(dirname($logFile), 0777, true);
}

file_put_contents($logFile, "[$timestamp] Fix database attempt started\n", FILE_APPEND);

try {
    // Connect to database - using direct credentials to ensure connection
    $host = 'localhost';
    $dbname = 'u644605165_db_be';
    $username = 'u644605165_usr_be';
    $password = 'Vizag@1213';
    
    $conn = new mysqli($host, $username, $password, $dbname);
    
    if ($conn->connect_error) {
        throw new Exception("Failed to connect to database: " . $conn->connect_error);
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
                night_halt_charge DECIMAL(10,2) DEFAULT 0,
                driver_allowance DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if ($conn->query($createVehiclesTable)) {
            $fixed[] = "Created vehicles table";
            file_put_contents($logFile, "[$timestamp] Successfully created vehicles table\n", FILE_APPEND);
        } else {
            throw new Exception("Failed to create vehicles table: " . $conn->error);
        }
    }
    
    // Check for airport_transfer_fares table and create/fix if needed
    $airportTableResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    $airportTableExists = ($airportTableResult && $airportTableResult->num_rows > 0);
    
    if (!$airportTableExists) {
        $createAirportTable = "
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
                night_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
                extra_waiting_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if ($conn->query($createAirportTable)) {
            $fixed[] = "Created airport_transfer_fares table";
            file_put_contents($logFile, "[$timestamp] Successfully created airport_transfer_fares table\n", FILE_APPEND);
        } else {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
    } else {
        // Check if columns night_charges and extra_waiting_charges exist
        $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'night_charges'");
        $nightChargesExists = ($columnsResult && $columnsResult->num_rows > 0);
        
        if (!$nightChargesExists) {
            if ($conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) NOT NULL DEFAULT 0")) {
                $fixed[] = "Added night_charges column to airport_transfer_fares";
            }
        }
        
        $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
        $waitingChargesExists = ($columnsResult && $columnsResult->num_rows > 0);
        
        if (!$waitingChargesExists) {
            if ($conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) NOT NULL DEFAULT 0")) {
                $fixed[] = "Added extra_waiting_charges column to airport_transfer_fares";
            }
        }
        
        // Make sure the night_charges and extra_waiting_charges are NOT NULL
        $conn->query("ALTER TABLE airport_transfer_fares MODIFY night_charges DECIMAL(10,2) NOT NULL DEFAULT 0");
        $conn->query("ALTER TABLE airport_transfer_fares MODIFY extra_waiting_charges DECIMAL(10,2) NOT NULL DEFAULT 0");
        $fixed[] = "Ensured airport_transfer_fares columns have NOT NULL constraints";
    }
    
    // Check for local_package_fares table and create/fix if needed
    $localTableResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    $localTableExists = ($localTableResult && $localTableResult->num_rows > 0);
    
    if (!$localTableExists) {
        $createLocalTable = "
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if ($conn->query($createLocalTable)) {
            $fixed[] = "Created local_package_fares table";
        } else {
            throw new Exception("Failed to create local_package_fares table: " . $conn->error);
        }
    }
    
    // Return success response
    $response = [
        'status' => 'success',
        'message' => 'Database tables fixed successfully',
        'fixed' => $fixed,
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    file_put_contents($logFile, "[$timestamp] Fix completed successfully: " . json_encode($fixed) . "\n", FILE_APPEND);
    
} catch (Exception $e) {
    // Log error
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    $response = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ];
    
    echo json_encode($response);
}
