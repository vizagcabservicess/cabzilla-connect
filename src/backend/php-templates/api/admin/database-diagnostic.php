
<?php
/**
 * Database Diagnostic and Repair Tool
 * 
 * This script performs diagnostics on the database structure and data,
 * identifies issues, and can repair common problems.
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log diagnostic run
$timestamp = date('Y-m-d H:i:s');
error_log("[$timestamp] Running database-diagnostic.php - Params: " . json_encode($_GET), 3, $logDir . '/database-diagnostic.log');

// Initialize response array
$response = [
    'status' => 'healthy',
    'timestamp' => time(),
    'issues' => [],
    'tables' => [],
    'php_info' => [],
    'server_info' => []
];

// Try to connect to the database
try {
    // First check if config.php exists
    if (file_exists(__DIR__ . '/../../config.php')) {
        require_once __DIR__ . '/../../config.php';
        $conn = getDbConnection();
        $response['debug'][] = "Connected via config.php";
    } else {
        // Fallback to hardcoded credentials
        $host = 'localhost';
        $dbname = 'u644605165_new_bookingdb';
        $username = 'u644605165_new_bookingusr';
        $password = 'Vizag@1213';
        
        $conn = new mysqli($host, $username, $password, $dbname);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        $response['debug'][] = "Connected via hardcoded credentials";
    }
    
    // Check if connection is successful
    if (!$conn) {
        throw new Exception("Failed to establish database connection");
    }
    
    // Check for repair mode
    $repairMode = isset($_GET['repair']) && $_GET['repair'] === 'true';
    $initializeMode = isset($_GET['initialize']) && $_GET['initialize'] === 'true';
    
    // Get list of tables
    $tables = [];
    $tablesResult = $conn->query("SHOW TABLES");
    
    if ($tablesResult) {
        while ($row = $tablesResult->fetch_row()) {
            $tables[] = $row[0];
        }
    }
    
    // Check each key table
    $requiredTables = [
        'vehicle_types',
        'vehicle_pricing',
        'local_package_fares',
        'airport_transfer_fares'
    ];
    
    foreach ($requiredTables as $table) {
        if (!in_array($table, $tables)) {
            $response['status'] = 'issues';
            $response['issues'][] = "Table '$table' does not exist";
            
            // Create missing tables in repair/initialize mode
            if ($repairMode || $initializeMode) {
                createTable($conn, $table);
                $response['issues'][] = "Created missing table '$table'";
                error_log("[$timestamp] Created missing table '$table'", 3, $logDir . '/database-diagnostic.log');
            }
        }
    }
    
    // Check structure of each table
    foreach ($tables as $table) {
        $columnsResult = $conn->query("SHOW COLUMNS FROM `$table`");
        $columns = [];
        
        if ($columnsResult) {
            while ($column = $columnsResult->fetch_assoc()) {
                $columns[] = $column['Field'];
            }
        }
        
        // Get row count
        $countResult = $conn->query("SELECT COUNT(*) as count FROM `$table`");
        $rowCount = 0;
        
        if ($countResult && $row = $countResult->fetch_assoc()) {
            $rowCount = (int)$row['count'];
        }
        
        // Store table info
        $response['tables'][$table] = [
            'columns' => $columns,
            'row_count' => $rowCount
        ];
        
        // Check for issues with specific tables
        if ($table === 'vehicle_pricing') {
            checkVehiclePricingTable($conn, $table, $columns, $rowCount, $response, $repairMode);
        } else if ($table === 'vehicle_types') {
            checkVehicleTypesTable($conn, $table, $columns, $rowCount, $response, $repairMode);
        } else if ($table === 'local_package_fares') {
            checkLocalPackageFaresTable($conn, $table, $columns, $rowCount, $response, $repairMode);
        } else if ($table === 'airport_transfer_fares') {
            checkAirportTransferFaresTable($conn, $table, $columns, $rowCount, $response, $repairMode);
        }
    }
    
    // PHP information
    $response['php_info'] = [
        'version' => phpversion(),
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'post_max_size' => ini_get('post_max_size')
    ];
    
    // Server information
    $response['server_info'] = [
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'http_host' => $_SERVER['HTTP_HOST'] ?? 'Unknown'
    ];
    
    // Initialize the database if requested
    if ($initializeMode) {
        initializeDatabase($conn, $response);
    }
    
    // Success response
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
    
    error_log("[$timestamp] Error in database diagnostic: " . $e->getMessage(), 3, $logDir . '/database-diagnostic.log');
}

/**
 * Check the vehicle_pricing table
 */
function checkVehiclePricingTable($conn, $table, $columns, $rowCount, &$response, $repairMode) {
    $issues = [];
    
    // Check for critical columns
    if (!in_array('vehicle_id', $columns)) {
        $issues[] = "Table '$table' missing 'vehicle_id' column";
        
        if ($repairMode) {
            // Try to add the missing column
            $addColumnQuery = "ALTER TABLE `$table` ADD COLUMN `vehicle_id` VARCHAR(50) NOT NULL DEFAULT '' AFTER `id`";
            if ($conn->query($addColumnQuery)) {
                $issues[] = "Added missing 'vehicle_id' column to '$table'";
                
                // If the table has vehicle_type column, copy values to vehicle_id
                if (in_array('vehicle_type', $columns)) {
                    $updateQuery = "UPDATE `$table` SET `vehicle_id` = `vehicle_type` WHERE `vehicle_id` = ''";
                    $conn->query($updateQuery);
                    $issues[] = "Copied values from 'vehicle_type' to 'vehicle_id' in '$table'";
                }
            }
        }
    }
    
    if (!in_array('vehicle_type', $columns) && in_array('vehicle_id', $columns)) {
        $issues[] = "Table '$table' has 'vehicle_id' but missing 'vehicle_type' column";
        
        if ($repairMode) {
            // Try to add the missing column
            $addColumnQuery = "ALTER TABLE `$table` ADD COLUMN `vehicle_type` VARCHAR(50) NOT NULL DEFAULT '' AFTER `id`";
            if ($conn->query($addColumnQuery)) {
                $issues[] = "Added missing 'vehicle_type' column to '$table'";
                
                // Copy values from vehicle_id to vehicle_type
                $updateQuery = "UPDATE `$table` SET `vehicle_type` = `vehicle_id` WHERE `vehicle_type` = ''";
                $conn->query($updateQuery);
                $issues[] = "Copied values from 'vehicle_id' to 'vehicle_type' in '$table'";
            }
        }
    }
    
    // Check for empty vehicle_id values
    $emptyIdResult = $conn->query("SELECT COUNT(*) as count FROM `$table` WHERE `vehicle_id` = '' OR `vehicle_id` IS NULL");
    if ($emptyIdResult && $row = $emptyIdResult->fetch_assoc()) {
        $emptyCount = (int)$row['count'];
        
        if ($emptyCount > 0) {
            $issues[] = "Table '$table' has $emptyCount rows with empty vehicle_id";
            
            if ($repairMode) {
                // Delete rows with empty vehicle_id
                $deleteQuery = "DELETE FROM `$table` WHERE `vehicle_id` = '' OR `vehicle_id` IS NULL";
                if ($conn->query($deleteQuery)) {
                    $issues[] = "Deleted $emptyCount rows with empty vehicle_id from '$table'";
                }
            }
        }
    }
    
    if (!empty($issues)) {
        $response['status'] = 'issues';
        $response['issues'] = array_merge($response['issues'], $issues);
    }
}

/**
 * Check the vehicle_types table
 */
function checkVehicleTypesTable($conn, $table, $columns, $rowCount, &$response, $repairMode) {
    $issues = [];
    
    // Check for critical columns
    if (!in_array('vehicle_id', $columns)) {
        $issues[] = "Table '$table' missing 'vehicle_id' column";
        
        if ($repairMode) {
            // Try to add the missing column
            $addColumnQuery = "ALTER TABLE `$table` ADD COLUMN `vehicle_id` VARCHAR(50) NOT NULL DEFAULT '' AFTER `id`";
            if ($conn->query($addColumnQuery)) {
                $issues[] = "Added missing 'vehicle_id' column to '$table'";
            }
        }
    }
    
    // Check for empty vehicle_id values
    $emptyIdResult = $conn->query("SELECT COUNT(*) as count FROM `$table` WHERE `vehicle_id` = '' OR `vehicle_id` IS NULL");
    if ($emptyIdResult && $row = $emptyIdResult->fetch_assoc()) {
        $emptyCount = (int)$row['count'];
        
        if ($emptyCount > 0) {
            $issues[] = "Table '$table' has $emptyCount rows with empty vehicle_id";
            
            if ($repairMode) {
                // Delete rows with empty vehicle_id
                $deleteQuery = "DELETE FROM `$table` WHERE `vehicle_id` = '' OR `vehicle_id` IS NULL";
                if ($conn->query($deleteQuery)) {
                    $issues[] = "Deleted $emptyCount rows with empty vehicle_id from '$table'";
                }
            }
        }
    }
    
    if ($rowCount === 0) {
        $issues[] = "Table '$table' is empty";
        
        if ($repairMode) {
            // Add default vehicles
            $defaultVehicles = [
                ['sedan', 'Sedan', 4, 2],
                ['suv', 'SUV', 6, 3],
                ['ertiga', 'Ertiga', 6, 3],
                ['innova', 'Innova', 7, 3],
                ['innova_crysta', 'Innova Crysta', 7, 3],
                ['luxury', 'Luxury Sedan', 4, 2],
                ['tempo', 'Tempo Traveller', 12, 6]
            ];
            
            foreach ($defaultVehicles as $vehicle) {
                $insertQuery = "INSERT INTO `$table` (`vehicle_id`, `name`, `capacity`, `luggage_capacity`, `is_active`) 
                                VALUES (?, ?, ?, ?, 1)
                                ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `capacity` = VALUES(`capacity`), 
                                `luggage_capacity` = VALUES(`luggage_capacity`), `is_active` = 1";
                
                $stmt = $conn->prepare($insertQuery);
                $stmt->bind_param("ssii", $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3]);
                $stmt->execute();
            }
            
            $issues[] = "Added default vehicles to '$table'";
        }
    }
    
    if (!empty($issues)) {
        $response['status'] = 'issues';
        $response['issues'] = array_merge($response['issues'], $issues);
    }
}

/**
 * Check the local_package_fares table
 */
function checkLocalPackageFaresTable($conn, $table, $columns, $rowCount, &$response, $repairMode) {
    $issues = [];
    
    // Check for critical columns
    if (!in_array('vehicle_id', $columns)) {
        $issues[] = "Table '$table' missing 'vehicle_id' column";
        
        if ($repairMode) {
            // Try to add the missing column
            $addColumnQuery = "ALTER TABLE `$table` ADD COLUMN `vehicle_id` VARCHAR(50) NOT NULL DEFAULT '' AFTER `id`";
            if ($conn->query($addColumnQuery)) {
                $issues[] = "Added missing 'vehicle_id' column to '$table'";
            }
        }
    }
    
    // Check for empty vehicle_id values
    $emptyIdResult = $conn->query("SELECT COUNT(*) as count FROM `$table` WHERE `vehicle_id` = '' OR `vehicle_id` IS NULL");
    if ($emptyIdResult && $row = $emptyIdResult->fetch_assoc()) {
        $emptyCount = (int)$row['count'];
        
        if ($emptyCount > 0) {
            $issues[] = "Table '$table' has $emptyCount rows with empty vehicle_id";
            
            if ($repairMode) {
                // Delete rows with empty vehicle_id
                $deleteQuery = "DELETE FROM `$table` WHERE `vehicle_id` = '' OR `vehicle_id` IS NULL";
                if ($conn->query($deleteQuery)) {
                    $issues[] = "Deleted $emptyCount rows with empty vehicle_id from '$table'";
                }
            }
        }
    }
    
    if (!empty($issues)) {
        $response['status'] = 'issues';
        $response['issues'] = array_merge($response['issues'], $issues);
    }
}

/**
 * Check the airport_transfer_fares table
 */
function checkAirportTransferFaresTable($conn, $table, $columns, $rowCount, &$response, $repairMode) {
    $issues = [];
    
    // Check for critical columns
    if (!in_array('vehicle_id', $columns)) {
        $issues[] = "Table '$table' missing 'vehicle_id' column";
        
        if ($repairMode) {
            // Try to add the missing column
            $addColumnQuery = "ALTER TABLE `$table` ADD COLUMN `vehicle_id` VARCHAR(50) NOT NULL DEFAULT '' AFTER `id`";
            if ($conn->query($addColumnQuery)) {
                $issues[] = "Added missing 'vehicle_id' column to '$table'";
            }
        }
    }
    
    // Check for empty vehicle_id values
    $emptyIdResult = $conn->query("SELECT COUNT(*) as count FROM `$table` WHERE `vehicle_id` = '' OR `vehicle_id` IS NULL");
    if ($emptyIdResult && $row = $emptyIdResult->fetch_assoc()) {
        $emptyCount = (int)$row['count'];
        
        if ($emptyCount > 0) {
            $issues[] = "Table '$table' has $emptyCount rows with empty vehicle_id";
            
            if ($repairMode) {
                // Delete rows with empty vehicle_id
                $deleteQuery = "DELETE FROM `$table` WHERE `vehicle_id` = '' OR `vehicle_id` IS NULL";
                if ($conn->query($deleteQuery)) {
                    $issues[] = "Deleted $emptyCount rows with empty vehicle_id from '$table'";
                }
            }
        }
    }
    
    if (!empty($issues)) {
        $response['status'] = 'issues';
        $response['issues'] = array_merge($response['issues'], $issues);
    }
}

/**
 * Create a table if it doesn't exist
 */
function createTable($conn, $table) {
    switch ($table) {
        case 'vehicle_types':
            $sql = "
                CREATE TABLE IF NOT EXISTS `vehicle_types` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `vehicle_id` VARCHAR(50) NOT NULL,
                    `name` VARCHAR(100) NOT NULL,
                    `capacity` INT NOT NULL DEFAULT 4,
                    `luggage_capacity` INT NOT NULL DEFAULT 2,
                    `ac` TINYINT(1) NOT NULL DEFAULT 1,
                    `image` VARCHAR(255) DEFAULT '/cars/sedan.png',
                    `amenities` TEXT DEFAULT NULL,
                    `description` TEXT DEFAULT NULL,
                    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (`vehicle_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            break;
            
        case 'vehicle_pricing':
            $sql = "
                CREATE TABLE IF NOT EXISTS `vehicle_pricing` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `vehicle_id` VARCHAR(50) NOT NULL,
                    `vehicle_type` VARCHAR(50) NOT NULL,
                    `trip_type` ENUM('local', 'outstation', 'airport') NOT NULL,
                    `base_fare` DECIMAL(10,2) DEFAULT 0,
                    `price_per_km` DECIMAL(10,2) DEFAULT 0,
                    `night_halt_charge` DECIMAL(10,2) DEFAULT 0,
                    `driver_allowance` DECIMAL(10,2) DEFAULT 0,
                    `local_package_4hr` DECIMAL(10,2) DEFAULT 0,
                    `local_package_8hr` DECIMAL(10,2) DEFAULT 0,
                    `local_package_10hr` DECIMAL(10,2) DEFAULT 0,
                    `extra_km_charge` DECIMAL(10,2) DEFAULT 0,
                    `extra_hour_charge` DECIMAL(10,2) DEFAULT 0,
                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (`vehicle_id`, `trip_type`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            break;
            
        case 'local_package_fares':
            $sql = "
                CREATE TABLE IF NOT EXISTS `local_package_fares` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `vehicle_id` VARCHAR(50) NOT NULL,
                    `price_4hrs_40km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `price_8hrs_80km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `price_10hrs_100km` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `price_extra_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
                    `price_extra_hour` DECIMAL(5,2) NOT NULL DEFAULT 0,
                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (`vehicle_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            break;
            
        case 'airport_transfer_fares':
            $sql = "
                CREATE TABLE IF NOT EXISTS `airport_transfer_fares` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `vehicle_id` VARCHAR(50) NOT NULL,
                    `base_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `price_per_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
                    `pickup_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `drop_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `tier1_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `tier2_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `tier3_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `tier4_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
                    `extra_km_charge` DECIMAL(5,2) NOT NULL DEFAULT 0,
                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (`vehicle_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            break;
            
        default:
            return false;
    }
    
    return $conn->query($sql);
}

/**
 * Initialize the database with default data
 */
function initializeDatabase($conn, &$response) {
    // Add default vehicles if vehicle_types is empty
    $countResult = $conn->query("SELECT COUNT(*) as count FROM vehicle_types");
    if ($countResult && $row = $countResult->fetch_assoc() && (int)$row['count'] === 0) {
        // Add default vehicles
        $defaultVehicles = [
            ['sedan', 'Sedan', 4, 2],
            ['suv', 'SUV', 6, 3],
            ['ertiga', 'Ertiga', 6, 3],
            ['innova', 'Innova', 7, 3],
            ['innova_crysta', 'Innova Crysta', 7, 3],
            ['luxury', 'Luxury Sedan', 4, 2],
            ['tempo', 'Tempo Traveller', 12, 6]
        ];
        
        foreach ($defaultVehicles as $vehicle) {
            $insertQuery = "INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, is_active) 
                            VALUES (?, ?, ?, ?, 1)
                            ON DUPLICATE KEY UPDATE name = VALUES(name), capacity = VALUES(capacity), 
                            luggage_capacity = VALUES(luggage_capacity), is_active = 1";
            
            $stmt = $conn->prepare($insertQuery);
            $stmt->bind_param("ssii", $vehicle[0], $vehicle[1], $vehicle[2], $vehicle[3]);
            $stmt->execute();
        }
        
        $response['issues'][] = "Added default vehicles to 'vehicle_types'";
    }
    
    // Remove any empty vehicle_id records
    $conn->query("DELETE FROM vehicle_types WHERE vehicle_id = '' OR vehicle_id IS NULL");
    $conn->query("DELETE FROM vehicle_pricing WHERE vehicle_id = '' OR vehicle_id IS NULL");
    $conn->query("DELETE FROM local_package_fares WHERE vehicle_id = '' OR vehicle_id IS NULL");
    $conn->query("DELETE FROM airport_transfer_fares WHERE vehicle_id = '' OR vehicle_id IS NULL");
    
    $response['issues'][] = "Removed records with empty vehicle_id from all tables";
    
    // If vehicle_type exists in vehicle_pricing but vehicle_id doesn't
    $conn->query("UPDATE vehicle_pricing SET vehicle_id = vehicle_type WHERE (vehicle_id = '' OR vehicle_id IS NULL) AND vehicle_type != ''");
    
    // If vehicle_id exists in vehicle_pricing but vehicle_type doesn't
    $conn->query("UPDATE vehicle_pricing SET vehicle_type = vehicle_id WHERE (vehicle_type = '' OR vehicle_type IS NULL) AND vehicle_id != ''");
    
    $response['issues'][] = "Synchronized vehicle_id and vehicle_type in vehicle_pricing table";
    
    // Update the response status
    $response['status'] = 'success';
    $response['message'] = 'Database initialized successfully';
}
