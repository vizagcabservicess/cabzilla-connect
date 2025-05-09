
<?php
/**
 * API response utility functions for standardized JSON responses
 */

// Function to send a success response
function sendSuccessResponse($data = [], $message = 'Operation completed successfully', $statusCode = 200) {
    // Clear any previous output to prevent contamination
    if (ob_get_length()) ob_clean();
    
    // Set HTTP response code
    http_response_code($statusCode);
    
    // Set content type header
    header('Content-Type: application/json');
    
    $response = [
        'status' => 'success',
        'message' => $message,
        'data' => $data,
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    exit();
}

// Function to send an error response
function sendErrorResponse($message = 'An error occurred', $statusCode = 400, $errors = []) {
    // Clear any previous output to prevent contamination
    if (ob_get_length()) ob_clean();
    
    // Set HTTP response code
    http_response_code($statusCode);
    
    // Set content type header
    header('Content-Type: application/json');
    
    $response = [
        'status' => 'error',
        'message' => $message,
        'errors' => $errors,
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    exit();
}
