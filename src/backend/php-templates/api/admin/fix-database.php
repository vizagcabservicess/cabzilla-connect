
<?php
/**
 * Fix Database Utility
 * 
 * This script fixes common database issues, including column name mismatches
 * between different tables that store fare data.
 */

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Set up log file
$logFile = $logDir . '/fix_database_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log helper function
function logMessage($message) {
    global $logFile, $timestamp;
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Include database utilities
require_once __DIR__ . '/../utils/database.php';

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    logMessage("Database connection successful");
    
    // Array to track operations performed
    $operationsPerformed = [];
    $fixedTables = [];
    
    // Define table structure mappings - each key is a table name, values are [column_name => definition]
    $tableStructures = [
        'local_package_fares' => [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'vehicle_id' => 'VARCHAR(50) NOT NULL',
            'price_4hrs_40km' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_8hrs_80km' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_10hrs_100km' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_extra_km' => 'DECIMAL(5,2) NOT NULL DEFAULT 0',
            'price_extra_hour' => 'DECIMAL(5,2) NOT NULL DEFAULT 0',
            'created_at' => 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ],
        'vehicle_pricing' => [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'vehicle_id' => 'VARCHAR(50) NOT NULL',
            'trip_type' => 'VARCHAR(20) NOT NULL DEFAULT "outstation"',
            'base_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_per_km' => 'DECIMAL(5,2) NOT NULL DEFAULT 0',
            'night_halt_charge' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'driver_allowance' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            // Local package specific columns  
            'local_package_4hr' => 'DECIMAL(10,2) DEFAULT NULL',
            'local_package_8hr' => 'DECIMAL(10,2) DEFAULT NULL',
            'local_package_10hr' => 'DECIMAL(10,2) DEFAULT NULL',
            'extra_km_charge' => 'DECIMAL(5,2) DEFAULT NULL',
            'extra_hour_charge' => 'DECIMAL(5,2) DEFAULT NULL'
        ]
    ];
    
    // Define column mappings for syncing between tables
    $columnMappings = [
        'local_package_fares' => [
            'price_4hrs_40km' => ['price_4hr_40km', 'local_package_4hr', 'package_4hr'],
            'price_8hrs_80km' => ['price_8hr_80km', 'local_package_8hr', 'package_8hr'],
            'price_10hrs_100km' => ['price_10hr_100km', 'local_package_10hr', 'package_10hr'],
            'price_extra_km' => ['extra_km_rate', 'extra_km_charge', 'extra_km'],
            'price_extra_hour' => ['extra_hour_rate', 'extra_hour_charge', 'extra_hour']
        ],
        'vehicle_pricing' => [
            'local_package_4hr' => ['price_4hrs_40km', 'price_4hr_40km', 'package_4hr'],
            'local_package_8hr' => ['price_8hrs_80km', 'price_8hr_80km', 'package_8hr'],
            'local_package_10hr' => ['price_10hrs_100km', 'price_10hr_100km', 'package_10hr'],
            'extra_km_charge' => ['price_extra_km', 'extra_km_rate', 'extra_km'],
            'extra_hour_charge' => ['price_extra_hour', 'extra_hour_rate', 'extra_hour']
        ]
    ];
    
    // Process each table
    foreach ($tableStructures as $tableName => $columns) {
        // Check if table exists
        $tableCheckQuery = "SHOW TABLES LIKE '$tableName'";
        $tableCheckResult = $conn->query($tableCheckQuery);
        $tableExists = ($tableCheckResult->num_rows > 0);
        
        if (!$tableExists) {
            // Create the table if it doesn't exist
            $createTableSql = "CREATE TABLE $tableName (";
            
            foreach ($columns as $column => $definition) {
                $createTableSql .= "\n    `$column` $definition,";
            }
            
            // Add unique constraint for vehicle_id if it's a fare table
            if ($tableName == 'local_package_fares') {
                $createTableSql .= "\n    UNIQUE KEY (`vehicle_id`)";
            } elseif ($tableName == 'vehicle_pricing') {
                $createTableSql .= "\n    UNIQUE KEY `vehicle_trip_type` (`vehicle_id`, `trip_type`)";
            } else {
                // Remove trailing comma
                $createTableSql = rtrim($createTableSql, ',');
            }
            
            $createTableSql .= "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
            
            if ($conn->query($createTableSql)) {
                logMessage("Created table $tableName");
                $operationsPerformed[] = "Created table $tableName";
                $fixedTables[] = $tableName;
            } else {
                logMessage("Failed to create table $tableName: " . $conn->error);
                $operationsPerformed[] = "Failed to create table $tableName: " . $conn->error;
            }
        } else {
            // Table exists, check if columns match expected structure
            $columnsQuery = "SHOW COLUMNS FROM $tableName";
            $columnsResult = $conn->query($columnsQuery);
            $existingColumns = [];
            
            while ($column = $columnsResult->fetch_assoc()) {
                $existingColumns[] = $column['Field'];
            }
            
            // Add missing columns
            foreach ($columns as $column => $definition) {
                if (!in_array($column, $existingColumns)) {
                    // Check if we have an alternative name for this column
                    $alternativeFound = false;
                    
                    if (isset($columnMappings[$tableName][$column])) {
                        foreach ($columnMappings[$tableName][$column] as $alternative) {
                            if (in_array($alternative, $existingColumns)) {
                                // Rename column from alternative to expected name
                                $alterSql = "ALTER TABLE $tableName CHANGE `$alternative` `$column` $definition";
                                
                                if ($conn->query($alterSql)) {
                                    logMessage("Renamed column $alternative to $column in $tableName");
                                    $operationsPerformed[] = "Renamed column $alternative to $column in $tableName";
                                    $alternativeFound = true;
                                    $fixedTables[] = $tableName;
                                    break;
                                } else {
                                    logMessage("Failed to rename column $alternative to $column: " . $conn->error);
                                    $operationsPerformed[] = "Failed to rename column $alternative to $column: " . $conn->error;
                                }
                            }
                        }
                    }
                    
                    if (!$alternativeFound) {
                        // Add missing column
                        $alterSql = "ALTER TABLE $tableName ADD COLUMN `$column` $definition";
                        
                        if ($conn->query($alterSql)) {
                            logMessage("Added column $column to $tableName");
                            $operationsPerformed[] = "Added column $column to $tableName";
                            $fixedTables[] = $tableName;
                        } else {
                            logMessage("Failed to add column $column: " . $conn->error);
                            $operationsPerformed[] = "Failed to add column $column: " . $conn->error;
                        }
                    }
                }
            }
        }
    }
    
    // Sync data between local_package_fares and vehicle_pricing
    if (in_array('local_package_fares', $fixedTables) || in_array('vehicle_pricing', $fixedTables)) {
        // Check both tables exist before attempting sync
        $localFaresExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
        $vehiclePricingExists = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0;
        
        if ($localFaresExists && $vehiclePricingExists) {
            // Sync local_package_fares to vehicle_pricing
            $syncSql = "
                INSERT INTO vehicle_pricing (
                    vehicle_id, 
                    trip_type, 
                    local_package_4hr, 
                    local_package_8hr, 
                    local_package_10hr, 
                    extra_km_charge, 
                    extra_hour_charge
                )
                SELECT 
                    vehicle_id,
                    'local',
                    price_4hrs_40km,
                    price_8hrs_80km,
                    price_10hrs_100km,
                    price_extra_km,
                    price_extra_hour
                FROM 
                    local_package_fares
                ON DUPLICATE KEY UPDATE
                    local_package_4hr = VALUES(local_package_4hr),
                    local_package_8hr = VALUES(local_package_8hr),
                    local_package_10hr = VALUES(local_package_10hr),
                    extra_km_charge = VALUES(extra_km_charge),
                    extra_hour_charge = VALUES(extra_hour_charge)
            ";
            
            if ($conn->query($syncSql)) {
                logMessage("Synced data from local_package_fares to vehicle_pricing");
                $operationsPerformed[] = "Synced data from local_package_fares to vehicle_pricing";
            } else {
                logMessage("Failed to sync data: " . $conn->error);
                $operationsPerformed[] = "Failed to sync data: " . $conn->error;
            }
        }
    }
    
    // Clear cache if any tables were fixed
    if (!empty($fixedTables)) {
        $cacheDir = __DIR__ . '/../../cache';
        if (file_exists($cacheDir)) {
            $cacheFiles = glob($cacheDir . '/*.json');
            foreach ($cacheFiles as $file) {
                unlink($file);
                logMessage("Deleted cache file: " . basename($file));
            }
            $operationsPerformed[] = "Cleared cache files";
        }
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Database fix completed successfully',
        'operations' => $operationsPerformed,
        'fixed_tables' => array_unique($fixedTables),
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
