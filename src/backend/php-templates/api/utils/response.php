
<?php
/**
 * Response utility functions
 * Handles standardized API responses
 */

/**
 * Send a success response
 * 
 * @param mixed $data Data to include in the response
 * @param string $message Success message
 * @param int $statusCode HTTP status code (default: 200)
 */
function sendSuccessResponse($data = null, $message = 'Operation successful', $statusCode = 200) {
    // Set HTTP status code
    http_response_code($statusCode);
    
    // Create response array
    $response = [
        'status' => 'success',
        'message' => $message,
        'timestamp' => time()
    ];
    
    // Add data if provided
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    // Ensure proper encoding for special characters
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Send an error response
 * 
 * @param string $message Error message
 * @param mixed $errors Optional detailed errors
 * @param int $statusCode HTTP status code (default: 400)
 */
function sendErrorResponse($message = 'An error occurred', $errors = null, $statusCode = 400) {
    // Set HTTP status code
    http_response_code($statusCode);
    
    // Create response array
    $response = [
        'status' => 'error',
        'message' => $message,
        'timestamp' => time()
    ];
    
    // Add errors if provided
    if ($errors !== null) {
        $response['errors'] = $errors;
    }
    
    // Ensure proper encoding for special characters
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Send a response with custom status
 * 
 * @param string $status Status code (e.g., 'warning', 'info')
 * @param string $message Response message
 * @param mixed $data Optional data to include
 * @param int $statusCode HTTP status code
 */
function sendCustomResponse($status, $message, $data = null, $statusCode = 200) {
    // Set HTTP status code
    http_response_code($statusCode);
    
    // Create response array
    $response = [
        'status' => $status,
        'message' => $message,
        'timestamp' => time()
    ];
    
    // Add data if provided
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    // Ensure proper encoding for special characters
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
