
<?php
// user.php - Get authenticated user data

// Ensure correct path to config.php - adjusting relative path
require_once __DIR__ . '/../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Disable caching for authentication endpoints
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header('Content-Type: application/json');

// Get the Authorization header
$authHeader = getAuthorizationHeader();
$token = null;

// Extract the token from the Authorization header
if ($authHeader) {
    list($type, $token) = explode(' ', $authHeader, 2);
    if (strcasecmp($type, 'Bearer') !== 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid Authorization header format'], 401);
    }
}

if (!$token) {
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication token is required'], 401);
}

try {
    // Validate the token and get the user data
    $userData = validateJwtToken($token);
    
    if (!$userData) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token'], 401);
    }

    // Get user ID from token payload
    $userId = $userData['id'];
    
    // Connect to database
    $conn = getDbConnection();
    
    // Query to get full user information
    $stmt = $conn->prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?");
    if (!$stmt) {
        logError("Statement preparation failed", ['error' => $conn->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $conn->error], 500);
    }
    
    $stmt->bind_param("i", $userId);
    $executed = $stmt->execute();
    
    if (!$executed) {
        logError("Statement execution failed", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $stmt->error], 500);
    }
    
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'User not found'], 404);
    }
    
    // Get user data
    $user = $result->fetch_assoc();
    
    // Send response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'User data retrieved successfully',
        'user' => $user
    ]);
    
} catch (Exception $e) {
    logError('User data exception: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
    sendJsonResponse(['status' => 'error', 'message' => 'An unexpected error occurred: ' . $e->getMessage()], 500);
}

// Helper function to get the Authorization header
function getAuthorizationHeader() {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['HTTP_AUTHORIZATION']);
    }
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    }
    return null;
}
