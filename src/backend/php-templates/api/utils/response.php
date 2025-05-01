
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
    exit;
}

// Function to send an error response
function sendErrorResponse($message = 'An error occurred', $data = [], $statusCode = 500) {
    // Clear any previous output to prevent contamination
    if (ob_get_length()) ob_clean();
    
    // Set HTTP response code
    http_response_code($statusCode);
    
    // Set content type header
    header('Content-Type: application/json');
    
    $response = [
        'status' => 'error',
        'message' => $message,
        'data' => $data,
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    exit;
}

// Function to log API requests and responses
function logApiActivity($endpoint, $requestData, $responseData, $status = 'success') {
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/api_activity_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logData = [
        'timestamp' => $timestamp,
        'endpoint' => $endpoint,
        'request' => $requestData,
        'response' => $responseData,
        'status' => $status,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];
    
    file_put_contents($logFile, json_encode($logData) . "\n", FILE_APPEND);
}

// Function to validate required fields in request data
function validateRequiredFields($data, $requiredFields) {
    $missingFields = [];
    
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || (empty($data[$field]) && $data[$field] !== 0 && $data[$field] !== '0')) {
            $missingFields[] = $field;
        }
    }
    
    if (!empty($missingFields)) {
        return [
            'valid' => false,
            'missing' => $missingFields
        ];
    }
    
    return [
        'valid' => true
    ];
}
