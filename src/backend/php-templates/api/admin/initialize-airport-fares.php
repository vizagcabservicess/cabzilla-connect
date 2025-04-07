
<?php
/**
 * Initialize Airport Fares Tables Endpoint
 * 
 * Creates and initializes airport_transfer_fares table and syncs data with vehicle_pricing
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

// Include required files
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/db_setup.php';

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Set collation explicitly
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
    
    // Step 1: Fix collation on existing tables if needed
    $tables = ['vehicles', 'vehicle_pricing', 'airport_transfer_fares', 'vehicle_types'];
    
    foreach ($tables as $table) {
        // Check if table exists
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        if ($result->num_rows > 0) {
            // Table exists, fix collation
            $conn->query("ALTER TABLE `$table` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        }
    }
    
    // Step 2: Create missing tables
    setupVehiclesTable($conn);
    setupVehiclePricingTable($conn);
    setupAirportTransferFaresTable($conn);
    setupVehicleTypesTable($conn);
    
    // Step 3: Sync data between tables
    syncTablesData($conn);
    
    // Return success response
    sendSuccessResponse([
        'initialized' => true,
        'tablesCreated' => $tables
    ], 'Airport fares tables initialized successfully');
    
} catch (Exception $e) {
    // Return error response
    sendErrorResponse('Failed to initialize airport fares tables: ' . $e->getMessage());
}
