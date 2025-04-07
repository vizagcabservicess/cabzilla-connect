
<?php
/**
 * Fix database collation issues across tables
 * This script updates all relevant tables to use the same collation
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database utilities
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/fix_collation_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    file_put_contents($logFile, "[$timestamp] Database connection successful\n", FILE_APPEND);
    
    // Define the standard collation to use
    $standardCollation = DB_COLLATION;
    $standardCharset = DB_CHARSET;
    
    file_put_contents($logFile, "[$timestamp] Using standard collation: $standardCollation\n", FILE_APPEND);
    
    // Get database name
    $dbName = DB_NAME;
    
    // First, set the database default collation
    $setDbCollationQuery = "ALTER DATABASE `$dbName` CHARACTER SET $standardCharset COLLATE $standardCollation";
    $conn->query($setDbCollationQuery);
    
    file_put_contents($logFile, "[$timestamp] Set database default collation\n", FILE_APPEND);
    
    // Tables that need to be fixed
    $tablesToFix = [
        'vehicles',
        'vehicle_types',
        'airport_transfer_fares',
        'vehicle_pricing',
        'local_package_fares',
        'outstation_fares'
    ];
    
    $fixedTables = [];
    
    // Check each table and fix its collation
    foreach ($tablesToFix as $table) {
        // Check if table exists
        $checkTableQuery = "SHOW TABLES LIKE '$table'";
        $tableExists = $conn->query($checkTableQuery)->num_rows > 0;
        
        if (!$tableExists) {
            file_put_contents($logFile, "[$timestamp] Table $table does not exist, skipping\n", FILE_APPEND);
            continue;
        }
        
        // Fix table collation
        $fixTableQuery = "ALTER TABLE `$table` CONVERT TO CHARACTER SET $standardCharset COLLATE $standardCollation";
        if ($conn->query($fixTableQuery)) {
            $fixedTables[] = $table;
            file_put_contents($logFile, "[$timestamp] Fixed collation for table $table\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, "[$timestamp] Error fixing collation for table $table: " . $conn->error . "\n", FILE_APPEND);
        }
        
        // Get columns that need to be fixed (especially varchar/text columns)
        $columnsQuery = "SHOW FULL COLUMNS FROM `$table`";
        $columnsResult = $conn->query($columnsQuery);
        
        if ($columnsResult) {
            while ($column = $columnsResult->fetch_assoc()) {
                $columnName = $column['Field'];
                $columnType = $column['Type'];
                $columnCollation = $column['Collation'];
                
                // Only fix string-type columns with collation
                if ($columnCollation && $columnCollation != $standardCollation) {
                    $fixColumnQuery = "ALTER TABLE `$table` MODIFY `$columnName` $columnType CHARACTER SET $standardCharset COLLATE $standardCollation";
                    
                    if ($conn->query($fixColumnQuery)) {
                        file_put_contents($logFile, "[$timestamp] Fixed collation for $table.$columnName\n", FILE_APPEND);
                    } else {
                        file_put_contents($logFile, "[$timestamp] Error fixing collation for $table.$columnName: " . $conn->error . "\n", FILE_APPEND);
                    }
                }
            }
        }
    }
    
    // Return success response
    sendSuccessResponse([
        'fixedTables' => $fixedTables,
        'standardCollation' => $standardCollation,
        'standardCharset' => $standardCharset,
        'timestamp' => $timestamp
    ], 'Database collation fixed successfully');
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    sendErrorResponse($e->getMessage());
}
