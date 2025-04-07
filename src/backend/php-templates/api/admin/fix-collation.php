
<?php
/**
 * Fix database collation issues - Used to standardize all tables to utf8mb4_unicode_ci
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database utility
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

// Get database connection
$conn = getDbConnection();
if (!$conn) {
    sendErrorResponse('Failed to connect to database');
    exit;
}

// Get list of all tables
$tables = [];
$tablesQuery = "SHOW TABLES";
$tablesResult = $conn->query($tablesQuery);

if ($tablesResult) {
    while ($row = $tablesResult->fetch_row()) {
        $tables[] = $row[0];
    }
}

// Fix collation for each table
$fixedTables = [];
$errors = [];

foreach ($tables as $table) {
    try {
        // Set default character set and collation for the table
        $alterTableSql = "ALTER TABLE `{$table}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
        if ($conn->query($alterTableSql)) {
            $fixedTables[] = $table;
        } else {
            $errors[] = "Failed to fix collation for table {$table}: " . $conn->error;
        }
        
        // Get all columns in this table
        $columnsQuery = "SHOW FULL COLUMNS FROM `{$table}`";
        $columnsResult = $conn->query($columnsQuery);
        
        if ($columnsResult) {
            while ($column = $columnsResult->fetch_assoc()) {
                // Only fix string/text columns
                if (strpos($column['Type'], 'varchar') !== false || 
                    strpos($column['Type'], 'char') !== false || 
                    strpos($column['Type'], 'text') !== false) {
                    
                    // Fix individual column collation if it doesn't match utf8mb4_unicode_ci
                    if ($column['Collation'] != 'utf8mb4_unicode_ci') {
                        $alterColumnSql = "ALTER TABLE `{$table}` MODIFY COLUMN `{$column['Field']}` {$column['Type']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
                        if (!$conn->query($alterColumnSql)) {
                            $errors[] = "Failed to fix collation for column {$column['Field']} in table {$table}: " . $conn->error;
                        }
                    }
                }
            }
        }
    } catch (Exception $e) {
        $errors[] = "Exception fixing collation for table {$table}: " . $e->getMessage();
    }
}

// Check for vehicle_id columns specifically and fix them
$vehicleIdFixedTables = [];
foreach ($tables as $table) {
    try {
        // Check if this table has a vehicle_id column
        $checkVehicleIdSql = "SHOW COLUMNS FROM `{$table}` LIKE 'vehicle_id'";
        $checkVehicleIdResult = $conn->query($checkVehicleIdSql);
        
        if ($checkVehicleIdResult && $checkVehicleIdResult->num_rows > 0) {
            // Fix the vehicle_id column collation
            $fixVehicleIdSql = "ALTER TABLE `{$table}` MODIFY COLUMN `vehicle_id` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
            if ($conn->query($fixVehicleIdSql)) {
                $vehicleIdFixedTables[] = $table;
            } else {
                $errors[] = "Failed to fix vehicle_id collation for table {$table}: " . $conn->error;
            }
        }
    } catch (Exception $e) {
        $errors[] = "Exception fixing vehicle_id collation for table {$table}: " . $e->getMessage();
    }
}

// Return the result
sendSuccessResponse([
    'tables_fixed' => $fixedTables,
    'tables_count' => count($fixedTables),
    'vehicle_id_fixed_tables' => $vehicleIdFixedTables,
    'errors' => $errors
], 'Database collation fixed successfully');
