
<?php
// This is a redirection script for compatibility with old URLs
// It redirects to the admin/direct-local-fares.php file

// Include necessary headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// For direct local fare updates, we need to forward the POST data
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Path to the actual implementation
    $targetScript = __DIR__ . '/admin/direct-local-fares.php';
    
    // Check if the target script exists
    if (file_exists($targetScript)) {
        // Log the redirection for debugging
        error_log('Redirecting direct-local-fares.php to admin/direct-local-fares.php');
        
        // Forward all POST data
        $_REQUEST = array_merge($_GET, $_POST);
        
        // Include the target script
        require_once $targetScript;
    } else {
        // Target script not found
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Target script admin/direct-local-fares.php not found',
            'path' => $targetScript
        ]);
    }
} else {
    // Method not allowed
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST for direct local fare updates.'
    ]);
}
