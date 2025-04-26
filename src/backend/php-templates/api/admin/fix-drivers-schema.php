
<?php
// fix-drivers-schema.php - Script to fix inconsistencies in drivers table
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

try {
    // Get database connection
    $conn = getDbConnectionWithRetry();
    
    // Start transaction
    $conn->begin_transaction();
    
    // Check if drivers table exists
    $tableExists = $conn->query("SHOW TABLES LIKE 'drivers'");
    
    if ($tableExists->num_rows > 0) {
        // Check column structure
        $columns = [];
        $columnsResult = $conn->query("SHOW COLUMNS FROM drivers");
        while ($column = $columnsResult->fetch_assoc()) {
            $columns[$column['Field']] = $column;
        }
        
        // Check and fix inconsistent columns
        $alterQueries = [];
        
        // Fix license_number vs license_no inconsistency
        if (isset($columns['license_number']) && !isset($columns['license_no'])) {
            $alterQueries[] = "ALTER TABLE drivers CHANGE COLUMN license_number license_no VARCHAR(50)";
        }
        
        // Fix vehicle_id vs vehicle inconsistency
        if (isset($columns['vehicle_id']) && !isset($columns['vehicle'])) {
            $alterQueries[] = "ALTER TABLE drivers CHANGE COLUMN vehicle_id vehicle VARCHAR(100)";
        }
        
        // Fix status enum values
        $alterQueries[] = "ALTER TABLE drivers MODIFY COLUMN status ENUM('available', 'busy', 'offline') DEFAULT 'available'";
        
        // Add email column if missing
        if (!isset($columns['email'])) {
            $alterQueries[] = "ALTER TABLE drivers ADD COLUMN email VARCHAR(100) NOT NULL DEFAULT ''";
        }
        
        // Execute all ALTER queries
        foreach ($alterQueries as $query) {
            $conn->query($query);
        }
        
        // Map old status values to new ones
        $conn->query("UPDATE drivers SET status = 'available' WHERE status = 'active'");
        $conn->query("UPDATE drivers SET status = 'busy' WHERE status = 'on_trip'");
        $conn->query("UPDATE drivers SET status = 'offline' WHERE status = 'inactive' OR status = 'blocked'");
    }
    
    // Commit transaction
    $conn->commit();
    
    sendResponse([
        'status' => 'success', 
        'message' => 'Drivers table schema has been fixed'
    ]);

} catch (Exception $e) {
    // Rollback on error
    if (isset($conn)) {
        $conn->rollback();
    }
    
    sendResponse([
        'status' => 'error',
        'message' => 'Failed to fix drivers schema: ' . $e->getMessage()
    ], 500);
}
