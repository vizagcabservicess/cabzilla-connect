
<?php
// fix-schema.php - Endpoint to trigger schema fixes
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';
require_once __DIR__ . '/fix-drivers-schema.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get database connection
    $conn = getDbConnectionWithRetry();
    
    // Start transaction
    $conn->begin_transaction();
    
    // Run schema fixes
    $result = fixDriversSchema($conn);
    
    // If successful, commit transaction
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Schema fixed successfully',
        'details' => $result
    ]);
} catch (Exception $e) {
    // Rollback on error
    if (isset($conn)) {
        $conn->rollback();
    }
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fix schema: ' . $e->getMessage()
    ]);
}
