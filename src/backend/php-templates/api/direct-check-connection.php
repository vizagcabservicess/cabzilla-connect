
<?php
/**
 * direct-check-connection.php - Direct database connectivity check
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the configuration file
require_once dirname(__FILE__) . '/../config.php';

try {
    // Try to connect to database with the configured credentials
    $conn = getDbConnection();

    if (!$conn) {
        echo json_encode([
            'status' => 'error',
            'connection' => false,
            'message' => 'Failed to connect to database',
            'timestamp' => time()
        ], JSON_PRETTY_PRINT);
        exit;
    }

    // Get database version information
    $versionResult = $conn->query("SELECT VERSION() as version");
    $version = "";
    
    if ($versionResult && $row = $versionResult->fetch_assoc()) {
        $version = $row['version'];
    }

    // Close the connection
    $conn->close();

    echo json_encode([
        'status' => 'success',
        'connection' => true,
        'message' => 'Database connection successful',
        'version' => $version,
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'connection' => false,
        'message' => $e->getMessage(),
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
}
