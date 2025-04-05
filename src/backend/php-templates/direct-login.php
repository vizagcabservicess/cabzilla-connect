
<?php
/**
 * Simplified direct access login script
 */

// Set CORS headers for cross-origin requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Content-Type: application/json');

// For preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Debug logging
error_log("Direct login attempt. Method: " . $_SERVER['REQUEST_METHOD']);

// Handle only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Get request body content
$input = file_get_contents('php://input');
error_log("Login input: " . substr($input, 0, 50) . "...");

try {
    // Parse JSON request
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg());
        throw new Exception("Invalid JSON data: " . json_last_error_msg());
    }
    
    // Success response (this is a dummy response for testing)
    echo json_encode([
        'status' => 'success',
        'message' => 'Login successful',
        'token' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'user' => [
            'id' => 1,
            'name' => 'Test User',
            'email' => $data['email'] ?? 'test@example.com',
            'role' => 'user'
        ]
    ]);
} catch (Exception $e) {
    error_log("Login exception: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'An error occurred: ' . $e->getMessage()
    ]);
}
