
<?php
/**
 * API Response Helper Functions
 */

// Function to send success response
function sendSuccessResponse($data = [], $message = 'Operation completed successfully', $statusCode = 200) {
    // Clear any existing output buffers
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Set CORS and response headers
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    http_response_code($statusCode);
    
    $response = [
        'status' => 'success',
        'message' => $message,
        'data' => $data
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}

// Function to send error response
function sendErrorResponse($message = 'An error occurred', $statusCode = 400) {
    // Clear any existing output buffers
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Set CORS and response headers
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    http_response_code($statusCode);
    
    $response = [
        'status' => 'error',
        'message' => $message,
        'data' => []
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}
