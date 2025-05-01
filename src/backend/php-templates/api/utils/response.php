
<?php
/**
 * Standardized API response functions
 */

// Function to send a successful response
function sendSuccessResponse($data = [], $message = 'Success', $code = 200) {
    // Clear any existing output buffers to prevent contamination
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    header('Content-Type: application/json');
    http_response_code($code);
    
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'data' => $data,
        'timestamp' => date('c')
    ]);
    
    exit;
}

// Function to send an error response
function sendErrorResponse($message = 'An error occurred', $code = 400, $errors = []) {
    // Clear any existing output buffers to prevent contamination
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    header('Content-Type: application/json');
    http_response_code($code);
    
    echo json_encode([
        'status' => 'error',
        'message' => $message,
        'errors' => $errors,
        'timestamp' => date('c')
    ]);
    
    exit;
}

// Function to send a validation error response
function sendValidationErrorResponse($errors = [], $message = 'Validation failed') {
    sendErrorResponse($message, 422, $errors);
}

// Function to send a not found response
function sendNotFoundResponse($message = 'Resource not found') {
    sendErrorResponse($message, 404);
}

// Function to send an unauthorized response
function sendUnauthorizedResponse($message = 'Unauthorized') {
    sendErrorResponse($message, 401);
}

// Function to send a forbidden response
function sendForbiddenResponse($message = 'Forbidden') {
    sendErrorResponse($message, 403);
}
