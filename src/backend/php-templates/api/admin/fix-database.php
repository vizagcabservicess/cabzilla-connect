
<?php
/**
 * Fix Database API
 * 
 * This endpoint checks and repairs database tables, ensuring all required tables
 * and columns exist and have the correct structure.
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
require_once dirname(__FILE__) . '/../../config.php';

// Log file setup
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/database_fix_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

file_put_contents($logFile, "[$timestamp] Fix database request received\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Define required tables and their creation queries
    $requiredTables = [
        'vehicles' => "
            CREATE TABLE IF NOT EXISTS vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                capacity INT DEFAULT 4,
                luggage_capacity INT DEFAULT 2,
                price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(5,2) DEFAULT 0,
                image VARCHAR(255),
                description TEXT,
                amenities TEXT,
                ac BOOLEAN DEFAULT 1,
                night_halt_charge DECIMAL(10,2) DEFAULT 0,
                driver_allowance DECIMAL(10,2) DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ",
        'local_package_fares' => "
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) DEFAULT 0,
                price_extra_km DECIMAL(5,2) DEFAULT 0,
                price_extra_hour DECIMAL(5,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ",
        'airport_transfer_fares' => "
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
                night_charges DECIMAL(10,2) DEFAULT 0,
                extra_waiting_charges DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ",
        'outstation_fares' => "
            CREATE TABLE IF NOT EXISTS outstation_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) DEFAULT 0,
                price_per_km DECIMAL(5,2) DEFAULT 0,
                driver_allowance DECIMAL(10,2) DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 0,
                round_trip_base_price DECIMAL(10,2) DEFAULT 0,
                round_trip_price_per_km DECIMAL(5,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        "
    ];
    
    // Check and fix required tables
    $fixedTables = [];
    $existingTables = [];
    
    foreach ($requiredTables as $tableName => $createQuery) {
        // Check if table exists
        $tableResult = $conn->query("SHOW TABLES LIKE '$tableName'");
        $tableExists = $tableResult && $tableResult->num_rows > 0;
        
        if (!$tableExists) {
            // Create table if it doesn't exist
            if ($conn->query($createQuery)) {
                $fixedTables[] = $tableName;
                file_put_contents($logFile, "[$timestamp] Created table: $tableName\n", FILE_APPEND);
            } else {
                file_put_contents($logFile, "[$timestamp] Failed to create table: $tableName - " . $conn->error . "\n", FILE_APPEND);
            }
        } else {
            $existingTables[] = $tableName;
            file_put_contents($logFile, "[$timestamp] Table exists: $tableName\n", FILE_APPEND);
        }
    }
    
    // Check and fix specific columns
    
    // 1. Check airport_transfer_fares has night_charges and extra_waiting_charges
    $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'night_charges'");
    if ($columnsResult && $columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added night_charges column to airport_transfer_fares\n", FILE_APPEND);
        $fixedTables[] = "airport_transfer_fares (added night_charges)";
    }
    
    $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
    if ($columnsResult && $columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added extra_waiting_charges column to airport_transfer_fares\n", FILE_APPEND);
        $fixedTables[] = "airport_transfer_fares (added extra_waiting_charges)";
    }
    
    // 2. Check outstation_fares has round_trip fields
    $columnsResult = $conn->query("SHOW COLUMNS FROM outstation_fares LIKE 'round_trip_base_price'");
    if ($columnsResult && $columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE outstation_fares ADD COLUMN round_trip_base_price DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added round_trip_base_price column to outstation_fares\n", FILE_APPEND);
        $fixedTables[] = "outstation_fares (added round_trip_base_price)";
    }
    
    $columnsResult = $conn->query("SHOW COLUMNS FROM outstation_fares LIKE 'round_trip_price_per_km'");
    if ($columnsResult && $columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE outstation_fares ADD COLUMN round_trip_price_per_km DECIMAL(5,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added round_trip_price_per_km column to outstation_fares\n", FILE_APPEND);
        $fixedTables[] = "outstation_fares (added round_trip_price_per_km)";
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Database tables checked and fixed successfully',
        'fixed' => $fixedTables,
        'existing' => $existingTables,
        'timestamp' => time()
    ]);
    
    file_put_contents($logFile, "[$timestamp] Database fix completed successfully\n", FILE_APPEND);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
