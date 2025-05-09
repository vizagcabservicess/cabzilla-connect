<?php
/**
 * API response utility functions for standardized JSON responses
 */

require_once __DIR__ . '/../common/db_helper.php';

// Function to send a success response
function sendSuccessResponse($data = [], $message = 'Operation completed successfully', $statusCode = 200) {
    // Clear any previous output to prevent contamination
    if (ob_get_length()) ob_clean();
    
    // Set HTTP response code
    http_response_code($statusCode);
    
    // Set content type header
    header('Content-Type: application/json');
    
    // Set CORS headers to ensure frontend can access the response
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
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
    
    // Set CORS headers to ensure frontend can access the response
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    $response = [
        'status' => 'error',
        'message' => $message,
        'errors' => $errors,
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    exit();
}

// Helper function to execute a parameterized query
// function executeQuery($conn, $sql, $params = [], $types = "") {
//     ... (removed duplicate implementation)
// }
