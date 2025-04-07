
<?php
/**
 * Fix database collation issues
 * This script standardizes the collation of all tables to utf8mb4_unicode_ci
 */

// Set headers for CORS and content type
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

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/fix_collation_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log function
function logMessage($message) {
    global $logFile, $timestamp;
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Include database utilities
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    logMessage("Database connection successful");
    
    // Get list of all tables
    $tablesResult = $conn->query("SHOW TABLES");
    
    if (!$tablesResult) {
        throw new Exception("Failed to get tables: " . $conn->error);
    }
    
    $tables = [];
    while ($row = $tablesResult->fetch_row()) {
        $tables[] = $row[0];
    }
    
    logMessage("Found " . count($tables) . " tables to check");
    
    $fixedTables = [];
    $fixedColumns = [];
    
    // Process each table
    foreach ($tables as $table) {
        logMessage("Processing table: $table");
        
        // Change table collation
        $alterTableSql = "ALTER TABLE `$table` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
        if ($conn->query($alterTableSql)) {
            $fixedTables[] = $table;
            logMessage("Fixed table collation for: $table");
        } else {
            logMessage("Failed to fix table collation for $table: " . $conn->error);
        }
        
        // Get all columns in the table
        $columnsResult = $conn->query("SHOW FULL COLUMNS FROM `$table`");
        
        if (!$columnsResult) {
            logMessage("Warning: Failed to get columns for $table: " . $conn->error);
            continue;
        }
        
        while ($column = $columnsResult->fetch_assoc()) {
            // Only process string type columns that need collation adjustment
            if (strpos($column['Type'], 'char') !== false || 
                strpos($column['Type'], 'text') !== false || 
                strpos($column['Type'], 'varchar') !== false) {
                
                // Check if collation is not already utf8mb4_unicode_ci
                if ($column['Collation'] !== 'utf8mb4_unicode_ci') {
                    $columnName = $column['Field'];
                    $columnType = $column['Type'];
                    
                    // Modify column to use correct collation
                    $alterColumnSql = "ALTER TABLE `$table` MODIFY COLUMN `$columnName` $columnType CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
                    
                    if ($conn->query($alterColumnSql)) {
                        $fixedColumns[] = "$table.$columnName";
                        logMessage("Fixed column collation for: $table.$columnName");
                    } else {
                        logMessage("Failed to fix column collation for $table.$columnName: " . $conn->error);
                    }
                }
            }
        }
    }
    
    // Now fix the database default collation
    $alterDatabaseSql = "ALTER DATABASE `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    $conn->query($alterDatabaseSql);
    
    // Create a response with details of what was fixed
    sendSuccessResponse([
        'fixed_tables' => $fixedTables,
        'fixed_columns' => $fixedColumns,
        'tables_count' => count($fixedTables),
        'columns_count' => count($fixedColumns)
    ], 'Database collation fixed successfully');
    
} catch (Exception $e) {
    logMessage("ERROR: " . $e->getMessage());
    sendErrorResponse($e->getMessage());
}
