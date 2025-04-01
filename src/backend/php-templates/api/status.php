
<?php
/**
 * status.php - Simple API health check endpoint
 */

// Set CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Health-Check');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'CORS preflight successful']);
    exit;
}

// Simple status check - no database connection required
echo json_encode([
    'status' => 'ok',
    'message' => 'API is running',
    'timestamp' => time(),
    'version' => '1.0.3'
]);
