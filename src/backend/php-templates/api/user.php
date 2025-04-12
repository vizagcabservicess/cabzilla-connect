
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

// Get the Authorization header
$authHeader = getAuthorizationHeader();
$token = null;

// Log the incoming request for debugging
error_log("User API request received with headers: " . json_encode(array_keys(getallheaders())));

// Extract the token from the Authorization header
if ($authHeader) {
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        error_log("Bearer token extracted, length: " . strlen($token));
    } else {
        error_log("Invalid Authorization header format: " . $authHeader);
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid Authorization header format'], 401);
    }
}

if (!$token) {
    error_log("No token provided in request");
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication token is required'], 401);
}

try {
    // First check if verifyJwtToken function exists
    if (!function_exists('verifyJwtToken')) {
        error_log("verifyJwtToken function not found, attempting to create fallback");
        
        // Define a simple fallback function to extract data from JWT token
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
    } else {
        // Use the proper function
        $userData = verifyJwtToken($token);
    }
    
    if (!$userData) {
        error_log("Token validation failed, token length: " . strlen($token));
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token'], 401);
    }

    // Get user ID from token payload
    $userId = $userData['user_id'] ?? $userData['id'] ?? null;
    
    if (!$userId) {
        error_log("No user ID in token payload: " . json_encode($userData));
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid token: no user ID found'], 401);
    }
    
    error_log("Token validated successfully, user ID: " . $userId);
    
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
        error_log("Database connection error: " . $dbError);
    }
    
    // If we couldn't connect to the database or users table doesn't exist, 
    // return user data from token
    if (!$conn) {
        error_log("No database connection, using token data for user response");
        
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
        error_log("Users table doesn't exist in database");
        
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
        error_log("Statement preparation failed: " . $conn->error);
        throw new Exception('Database prepare error: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $userId);
    $executed = $stmt->execute();
    
    if (!$executed) {
        error_log("Statement execution failed: " . $stmt->error);
        throw new Exception('Database execute error: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        error_log("User not found in database, ID: " . $userId);
        
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
    error_log("User found in database, ID: " . $user['id']);
    
    // Send response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'User data retrieved successfully',
        'user' => $user,
        'source' => 'database'
    ]);
    
} catch (Exception $e) {
    error_log('User data exception: ' . $e->getMessage());
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
