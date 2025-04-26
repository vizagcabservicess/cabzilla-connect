
<?php
// fix-schema.php - Endpoint to trigger schema fixes
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';
require_once __DIR__ . '/fix-drivers-schema.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Allow GET method for testing and POST for normal operation
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Debug logging
error_log("fix-schema.php called with method: " . $_SERVER['REQUEST_METHOD']);

try {
    // Get database connection
    $conn = getDbConnectionWithRetry();
    
    // Start transaction
    $conn->begin_transaction();
    
    // Run schema fixes - added more detailed error handling
    try {
        $result = fixDriversSchema($conn);
        error_log("fixDriversSchema result: " . json_encode($result));
    } catch (Exception $innerE) {
        error_log("Error in fixDriversSchema: " . $innerE->getMessage());
        $result = [
            'status' => 'error',
            'message' => 'Exception in fixDriversSchema: ' . $innerE->getMessage(),
            'operations' => [],
            'errors' => [$innerE->getMessage()]
        ];
    }
    
    // If successful or partial, commit transaction
    if ($result['status'] === 'success' || $result['status'] === 'partial') {
        $conn->commit();
    } else {
        $conn->rollback();
    }
    
    echo json_encode([
        'status' => $result['status'],
        'message' => $result['status'] === 'success' 
            ? 'Schema fixed successfully' 
            : ($result['status'] === 'partial' 
                ? 'Schema partially fixed with some errors' 
                : 'Failed to fix schema'),
        'details' => $result,
        'timestamp' => time()
    ]);
} catch (Exception $e) {
    // Rollback on error
    if (isset($conn)) {
        $conn->rollback();
    }
    
    error_log("Exception in fix-schema.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fix schema: ' . $e->getMessage(),
        'timestamp' => time()
    ]);
}
