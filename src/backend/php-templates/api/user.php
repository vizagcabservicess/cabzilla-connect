
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

// Add CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Create logs directory if needed
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/user_api_' . date('Y-m-d') . '.log';

// Log function for debugging
function logDebug($message, $data = null) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    
    if ($data !== null) {
        $logMessage .= ': ' . (is_array($data) || is_object($data) ? json_encode($data) : $data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
    error_log($logMessage);
}

// Get the Authorization header
$authHeader = getAuthorizationHeader();
$token = null;

// Log the incoming request for debugging
logDebug("User API request received", ['headers' => array_keys(getallheaders())]);

// Extract the token from the Authorization header
if ($authHeader) {
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        logDebug("Bearer token extracted", ['length' => strlen($token)]);
    } else {
        logDebug("Invalid Authorization header format", ['header' => $authHeader]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid Authorization header format'], 401);
    }
}

// Check for token in query parameter as fallback (for testing)
if (!$token && isset($_GET['token'])) {
    $token = $_GET['token'];
    logDebug("Using token from query parameter", ['length' => strlen($token)]);
}

// Check for dev_mode parameter
$devMode = isset($_GET['dev_mode']) && $_GET['dev_mode'] === 'true';

// If in dev mode, we can bypass token validation
if ($devMode) {
    logDebug("Dev mode enabled, bypassing authentication");
    $user = [
        'id' => isset($_GET['user_id']) ? intval($_GET['user_id']) : 1,
        'name' => 'Dev User',
        'email' => 'dev@example.com',
        'phone' => '9876543210',
        'role' => isset($_GET['role']) && $_GET['role'] === 'admin' ? 'admin' : 'user'
    ];
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'User data retrieved in dev mode',
        'user' => $user,
        'source' => 'dev_mode'
    ]);
    exit;
}

if (!$token) {
    logDebug("No token provided in request");
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication token is required'], 401);
}

try {
    // Improved token validation with better error handling
    $userData = null;
    $validationError = null;
    
    // Try using verifyJwtToken function if available
    if (function_exists('verifyJwtToken')) {
        try {
            logDebug("Using verifyJwtToken function");
            $userData = verifyJwtToken($token);
            if (!$userData) {
                $validationError = "Token validation failed with verifyJwtToken";
            }
        } catch (Exception $e) {
            $validationError = "Exception in verifyJwtToken: " . $e->getMessage();
            logDebug($validationError);
        }
    }
    
    // If verifyJwtToken failed or isn't available, try manual validation
    if (!$userData) {
        logDebug("Attempting manual JWT validation");
        
        try {
            // Define validateJwtToken function if not exists
            if (!function_exists('validateJwtToken')) {
                function validateJwtToken($token) {
                    $tokenParts = explode('.', $token);
                    if (count($tokenParts) !== 3) {
                        return null;
                    }
                    
                    try {
                        // Base64 decode the payload part (index 1)
                        $payload = json_decode(base64_decode(str_replace(
                            ['-', '_'], 
                            ['+', '/'], 
                            $tokenParts[1]
                        )), true);
                        
                        // Check if token has expired
                        if (isset($payload['exp']) && $payload['exp'] < time()) {
                            error_log("Token has expired");
                            return null;
                        }
                        
                        return $payload;
                    } catch (Exception $e) {
                        error_log("Error decoding token: " . $e->getMessage());
                        return null;
                    }
                }
            }
            
            // Use the fallback function 
            $userData = validateJwtToken($token);
            if (!$userData) {
                $validationError = "Manual token validation failed";
            }
        } catch (Exception $e) {
            $validationError = "Exception in manual validation: " . $e->getMessage();
            logDebug($validationError);
        }
    }
    
    // Final check if we have valid user data
    if (!$userData) {
        logDebug("All token validation methods failed", ['error' => $validationError]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token: ' . $validationError], 401);
    }

    // Get user ID from token payload
    $userId = $userData['user_id'] ?? $userData['id'] ?? $userData['sub'] ?? null;
    
    if (!$userId) {
        logDebug("No user ID in token payload", ['payload' => json_encode($userData)]);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid token: no user ID found'], 401);
    }
    
    logDebug("Token validated successfully", ['user_id' => $userId]);
    
    // Try to connect to database
    $conn = null;
    $dbError = null;
    
    try {
        // Try using the getDbConnection function if available
        if (function_exists('getDbConnection')) {
            $conn = getDbConnection();
        } else {
            // Direct connection as fallback
            $dbHost = 'localhost';
            $dbName = 'u644605165_db_be';
            $dbUser = 'u644605165_usr_be';
            $dbPass = 'Vizag@1213';
            
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            if ($conn->connect_error) {
                throw new Exception("Database connection failed: " . $conn->connect_error);
            }
        }
    } catch (Exception $e) {
        $dbError = $e->getMessage();
        logDebug("Database connection error", ['error' => $dbError]);
    }
    
    // If we couldn't connect to the database, return user data from token
    if (!$conn) {
        logDebug("No database connection, using token data for user response");
        
        // Create a user object from token data
        $user = [
            'id' => $userId,
            'name' => $userData['name'] ?? 'User',
            'email' => $userData['email'] ?? 'user@example.com',
            'phone' => $userData['phone'] ?? null,
            'role' => $userData['role'] ?? 'user'
        ];
        
        sendJsonResponse([
            'status' => 'success',
            'message' => 'User data retrieved from token (database unavailable)',
            'user' => $user,
            'source' => 'token'
        ]);
        exit;
    }
    
    // Check if users table exists
    $tableExists = $conn->query("SHOW TABLES LIKE 'users'");
    if (!$tableExists || $tableExists->num_rows === 0) {
        logDebug("Users table doesn't exist in database");
        
        // Create a user object from token data
        $user = [
            'id' => $userId,
            'name' => $userData['name'] ?? 'User',
            'email' => $userData['email'] ?? 'user@example.com',
            'phone' => $userData['phone'] ?? null,
            'role' => $userData['role'] ?? 'user'
        ];
        
        sendJsonResponse([
            'status' => 'success',
            'message' => 'User data retrieved from token (users table not found)',
            'user' => $user,
            'source' => 'token'
        ]);
        exit;
    }
    
    // Query to get full user information
    $stmt = $conn->prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?");
    if (!$stmt) {
        logDebug("Statement preparation failed", ['error' => $conn->error]);
        throw new Exception('Database prepare error: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $userId);
    $executed = $stmt->execute();
    
    if (!$executed) {
        logDebug("Statement execution failed", ['error' => $stmt->error]);
        throw new Exception('Database execute error: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        logDebug("User not found in database", ['user_id' => $userId]);
        
        // Create a user object from token data as fallback
        $user = [
            'id' => $userId,
            'name' => $userData['name'] ?? 'User',
            'email' => $userData['email'] ?? 'user@example.com',
            'phone' => $userData['phone'] ?? null,
            'role' => $userData['role'] ?? 'user'
        ];
        
        // Send response with fallback user data
        sendJsonResponse([
            'status' => 'success',
            'message' => 'User data retrieved from token (not found in database)',
            'user' => $user,
            'source' => 'token'
        ]);
        exit;
    }
    
    // Get user data from database
    $user = $result->fetch_assoc();
    logDebug("User found in database", ['user_id' => $user['id']]);
    
    // Send response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'User data retrieved successfully',
        'user' => $user,
        'source' => 'database'
    ]);
    
} catch (Exception $e) {
    logDebug('User data exception', ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'An unexpected error occurred: ' . $e->getMessage()], 500);
}

// Helper function to get the Authorization header
function getAuthorizationHeader() {
    $headers = getallheaders();
    
    // Case-insensitive search for Authorization header
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'authorization') {
            return $value;
        }
    }
    
    // Check for alternate header formats
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['HTTP_AUTHORIZATION']);
    }
    
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    }
    
    return null;
}

// Helper function to send JSON responses
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
