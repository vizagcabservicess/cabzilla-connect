
<?php
/**
 * Fix Database Endpoint
 * Fixes database tables, collation issues, and repairs any inconsistencies
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/database_fix_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include required files
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../../config.php';

try {
    // Log the request
    file_put_contents($logFile, "[$timestamp] Database fix request received\n", FILE_APPEND);
    
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Set collation explicitly for the entire connection
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
    $conn->query("SET CHARACTER SET utf8mb4");
    
    file_put_contents($logFile, "[$timestamp] Database connection successful\n", FILE_APPEND);
    
    // Step 1: Get list of tables to fix
    $tablesToFix = [
        'vehicles' => ['vehicle_id', 'id', 'name'],
        'vehicle_types' => ['id', 'name', 'description'],
        'vehicle_pricing' => ['vehicle_id', 'trip_type'],
        'airport_transfer_fares' => ['vehicle_id']
    ];
    
    $fixResults = [];
    $tablesFixed = [];
    
    // Step 2: Check each table and fix collation
    foreach ($tablesToFix as $tableName => $keyColumns) {
        try {
            // Check if table exists
            $tableCheck = $conn->query("SHOW TABLES LIKE '$tableName'");
            if ($tableCheck && $tableCheck->num_rows > 0) {
                file_put_contents($logFile, "[$timestamp] Fixing table: $tableName\n", FILE_APPEND);
                
                // Fix table character set and collation
                $conn->query("ALTER TABLE `$tableName` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                
                // Fix collation on all text/string columns
                $columnsResult = $conn->query("SHOW COLUMNS FROM `$tableName`");
                $fixedColumns = [];
                
                while ($column = $columnsResult->fetch_assoc()) {
                    $columnName = $column['Field'];
                    $dataType = $column['Type'];
                    
                    // Only modify string-type columns
                    if (strpos($dataType, 'varchar') !== false || strpos($dataType, 'text') !== false || 
                        strpos($dataType, 'char') !== false || strpos($dataType, 'enum') !== false) {
                        $conn->query("ALTER TABLE `$tableName` MODIFY COLUMN `$columnName` $dataType CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                        $fixedColumns[] = $columnName;
                    }
                }
                
                $fixResults[$tableName] = [
                    'status' => 'fixed',
                    'collation_fixed' => true,
                    'fixed_columns' => $fixedColumns
                ];
                
                $tablesFixed[] = $tableName;
                
                file_put_contents($logFile, "[$timestamp] Fixed collation in table: $tableName, columns: " . implode(', ', $fixedColumns) . "\n", FILE_APPEND);
            } else {
                file_put_contents($logFile, "[$timestamp] Table does not exist: $tableName\n", FILE_APPEND);
                $fixResults[$tableName] = [
                    'status' => 'not_found'
                ];
            }
        } catch (Exception $tableError) {
            file_put_contents($logFile, "[$timestamp] Error fixing table $tableName: " . $tableError->getMessage() . "\n", FILE_APPEND);
            $fixResults[$tableName] = [
                'status' => 'error',
                'message' => $tableError->getMessage()
            ];
        }
    }
    
    // Step 3: Create any missing tables
    if (function_exists('ensureDatabaseTables')) {
        try {
            ensureDatabaseTables();
            file_put_contents($logFile, "[$timestamp] Ensured all required tables exist\n", FILE_APPEND);
        } catch (Exception $ensureError) {
            file_put_contents($logFile, "[$timestamp] Error ensuring tables: " . $ensureError->getMessage() . "\n", FILE_APPEND);
        }
    }
    
    // Step 4: Sync data between tables
    try {
        // Ensure airport_transfer_fares has entries for all vehicles
        $syncVehiclesQuery = "
            INSERT IGNORE INTO airport_transfer_fares (vehicle_id, base_price, price_per_km, 
                pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
            SELECT vehicle_id, 0, 0, 0, 0, 0, 0, 0, 0, 0
            FROM vehicles
            WHERE vehicle_id NOT IN (SELECT vehicle_id FROM airport_transfer_fares)
        ";
        
        $conn->query($syncVehiclesQuery);
        
        // Sync from airport_transfer_fares to vehicle_pricing
        $syncToVPQuery = "
            INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, airport_base_price, airport_price_per_km, airport_pickup_price, 
            airport_drop_price, airport_tier1_price, airport_tier2_price, airport_tier3_price, 
            airport_tier4_price, airport_extra_km_charge)
            SELECT 
                atf.vehicle_id, 'airport', atf.base_price, atf.price_per_km, atf.pickup_price, 
                atf.drop_price, atf.tier1_price, atf.tier2_price, atf.tier3_price, 
                atf.tier4_price, atf.extra_km_charge
            FROM 
                airport_transfer_fares atf
            LEFT JOIN 
                vehicle_pricing vp ON atf.vehicle_id = vp.vehicle_id AND vp.trip_type = 'airport'
            WHERE 
                vp.vehicle_id IS NULL
            ON DUPLICATE KEY UPDATE
                airport_base_price = atf.base_price,
                airport_price_per_km = atf.price_per_km,
                airport_pickup_price = atf.pickup_price,
                airport_drop_price = atf.drop_price,
                airport_tier1_price = atf.tier1_price,
                airport_tier2_price = atf.tier2_price,
                airport_tier3_price = atf.tier3_price,
                airport_tier4_price = atf.tier4_price,
                airport_extra_km_charge = atf.extra_km_charge
        ";
        
        $conn->query($syncToVPQuery);
        file_put_contents($logFile, "[$timestamp] Synced data between tables\n", FILE_APPEND);
    } catch (Exception $syncError) {
        file_put_contents($logFile, "[$timestamp] Error syncing data: " . $syncError->getMessage() . "\n", FILE_APPEND);
    }
    
    // Step 5: Return success response
    $responseData = [
        'tables_fixed' => $tablesFixed,
        'fix_results' => $fixResults,
        'collation' => 'utf8mb4_unicode_ci'
    ];
    
    sendSuccessResponse($responseData, 'Database tables fixed successfully');
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] ERROR TRACE: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    
    sendErrorResponse('Failed to fix database: ' . $e->getMessage());
}
