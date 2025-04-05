
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';

// Set comprehensive CORS headers for preflight requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, Accept');
header('Content-Type: application/json');

// For CORS preflight request - CRITICAL for browsers
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Debug line to check request method and content
error_log("Login request received. Method: " . $_SERVER['REQUEST_METHOD']);

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Disable caching for authentication endpoints
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

try {
    // Get the request body
    $input = file_get_contents('php://input');
    error_log("Login input received: " . substr($input, 0, 100) . "...");
    
    $data = json_decode($input, true);
    
    // Validate input
    if (!isset($data['email']) || !isset($data['password'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Email and password are required'], 400);
    }
    
    $email = $data['email'];
    $password = $data['password'];
    
    error_log("Login attempt for email: " . $email);
    
    // Connect to database
    $conn = getDbConnection();
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id, name, email, phone, password, role FROM users WHERE email = ?");
    if (!$stmt) {
        error_log("Statement preparation failed: " . $conn->error);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $conn->error], 500);
        exit;
    }
    
    $stmt->bind_param("s", $email);
    $executed = $stmt->execute();
    
    if (!$executed) {
        error_log("Statement execution failed: " . $stmt->error);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
        exit;
    }
    
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        error_log("Login failed - user not found: " . $email);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid email or password'], 401);
    }
    
    $user = $result->fetch_assoc();
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        error_log("Login failed - password mismatch for: " . $email);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid email or password'], 401);
    }
    
    // Remove password from user data
    unset($user['password']);
    
    // Generate JWT token with longer expiration (30 days)
    $token = generateJwtToken($user['id'], $user['email'], $user['role']);
    error_log("Login successful - token generated for: " . $email);
    
    // Send response with clear status and message
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Login successful',
        'token' => $token,
        'user' => $user
    ]);
} catch (Exception $e) {
    error_log('Login exception: ' . $e->getMessage() . ' - ' . $e->getTraceAsString());
    sendJsonResponse(['status' => 'error', 'message' => 'An unexpected error occurred: ' . $e->getMessage()], 500);
}

/**
 * Helper function to send JSON response
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
