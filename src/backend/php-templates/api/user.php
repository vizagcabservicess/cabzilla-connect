<?php
// Include configuration and CORS fix
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/fix-cors.php';

// Set content type
header('Content-Type: application/json');

// Disable caching for authentication endpoints
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

// Log request for debugging
error_log("User API request received - Method: " . $_SERVER['REQUEST_METHOD'] . ", URI: " . $_SERVER['REQUEST_URI']);

// Handle authentication
$headers = getallheaders();
$userId = null;
$isAdmin = false;
$token = '';

error_log("Headers received: " . json_encode($headers));

// Check for explicit X-User-ID header
$explicitUserId = null;
foreach($headers as $key => $value) {
    if (strtolower($key) === 'x-user-id') {
        $explicitUserId = $value;
        error_log("Found explicit X-User-ID header: " . $explicitUserId);
        break;
    }
}

// Check for user_id query parameter (highest priority)
if (isset($_GET['user_id']) && !empty($_GET['user_id'])) {
    $explicitUserId = $_GET['user_id'];
    error_log("Found user_id in query parameters: " . $explicitUserId);
}

// Extract authorization header manually - handle both camel case and lowercase
$authHeader = null;
foreach($headers as $key => $value) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $value;
        break;
    }
}

if ($authHeader) {
    $token = str_replace('Bearer ', '', $authHeader);
    
    error_log("Found auth token: " . substr($token, 0, 10) . "...");
    
    try {
        if (function_exists('verifyJwtToken')) {
            $payload = verifyJwtToken($token);
            if ($payload && isset($payload['user_id'])) {
                // Only use token user_id if no explicit ID was provided
                if (!$explicitUserId) {
                    $userId = $payload['user_id'];
                } else {
                    // If a force user match header is present, always use the explicit ID
                    $forceUserMatch = false;
                    foreach($headers as $key => $value) {
                        if (strtolower($key) === 'x-force-user-match' && $value === 'true') {
                            $forceUserMatch = true;
                            break;
                        }
                    }
                    
                    if ($forceUserMatch) {
                        $userId = $explicitUserId;
                        error_log("Forcing use of explicit user ID: $userId instead of token user_id: {$payload['user_id']}");
                    } else {
                        $userId = $payload['user_id'];
                        error_log("Using token user_id: $userId (explicit ID was present but not forced)");
                    }
                }
                
                $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                error_log("User authenticated: $userId, isAdmin: " . ($isAdmin ? 'yes' : 'no'));
            } else {
                error_log("Token payload missing user_id: " . json_encode($payload));
                // Use explicit ID if token didn't have user_id
                if ($explicitUserId) {
                    $userId = $explicitUserId;
                    error_log("Using explicit user ID: $userId since token didn't contain user_id");
                }
            }
        } else {
            error_log("verifyJwtToken function not available");
            // Try to extract user_id directly from token (for demo/testing)
            $tokenParts = explode('.', $token);
            if (count($tokenParts) >= 2) {
                $payload = json_decode(base64_decode($tokenParts[1]), true);
                if ($payload && isset($payload['user_id'])) {
                    // Only use token user_id if no explicit ID was provided or force match is not enabled
                    if (!$explicitUserId) {
                        $userId = $payload['user_id'];
                    } else {
                        // Check if force user match is enabled
                        $forceUserMatch = false;
                        foreach($headers as $key => $value) {
                            if (strtolower($key) === 'x-force-user-match' && $value === 'true') {
                                $forceUserMatch = true;
                                break;
                            }
                        }
                        
                        if ($forceUserMatch) {
                            $userId = $explicitUserId;
                            error_log("Forcing use of explicit user ID: $userId instead of extracted token user_id: {$payload['user_id']}");
                        } else {
                            $userId = $payload['user_id'];
                            error_log("Using extracted token user_id: $userId (explicit ID was present but not forced)");
                        }
                    }
                    
                    $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                    error_log("Manually extracted user from token: $userId");
                } else if ($explicitUserId) {
                    // Use explicit ID if token didn't have user_id
                    $userId = $explicitUserId;
                    error_log("Using explicit user ID: $userId since token didn't contain extractable user_id");
                }
            } else if ($explicitUserId) {
                // Use explicit ID if token format is invalid
                $userId = $explicitUserId;
                error_log("Using explicit user ID: $userId since token format is invalid");
            }
        }
    } catch (Exception $e) {
        error_log("JWT verification failed: " . $e->getMessage());
        // Use explicit ID if token verification failed
        if ($explicitUserId) {
            $userId = $explicitUserId;
            error_log("Using explicit user ID: $userId since token verification failed");
        }
    }
} else if ($explicitUserId) {
    // No auth token, but explicit user ID was provided
    $userId = $explicitUserId;
    error_log("No auth token found, using explicit user ID: $userId");
}

// Try to get user from database
try {
    // Try database connection
    $conn = null;
    if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
    } else {
        // Fallback to direct connection
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        } else {
            error_log("Direct database connection successful");
        }
    }
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // For demo token, we will still return sample data
    if ($token && strpos($token, 'demo_token_') === 0) {
        error_log("Demo token detected, returning demo user data");
        
        $demoUserId = $explicitUserId ?: 999;
        
        $demoUser = [
            'id' => intval($demoUserId),
            'name' => 'Demo User',
            'email' => 'demo@example.com',
            'phone' => '9876543210',
            'role' => 'user',
            'createdAt' => date('Y-m-d H:i:s')
        ];
        
        echo json_encode([
            'status' => 'success',
            'user' => $demoUser,
            'source' => 'demo'
        ]);
        exit;
    }
    
    // If no valid token or for testing purposes - attempt to query real data
    // Check if users table exists first
    $tableCheck = $conn->query("SHOW TABLES LIKE 'users'");
    if ($tableCheck && $tableCheck->num_rows > 0) {
        error_log("Users table exists, proceeding with query");
        
        // Query for user data based on determined user ID
        if ($userId) {
            $stmt = $conn->prepare("SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result && $result->num_rows > 0) {
                $user = $result->fetch_assoc();
                
                // Format user data
                $userData = [
                    'id' => (int)$user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'phone' => $user['phone'],
                    'role' => $user['role'],
                    'createdAt' => $user['created_at']
                ];
                
                echo json_encode([
                    'status' => 'success',
                    'user' => $userData,
                    'source' => 'database'
                ]);
                error_log("Successfully returned user data from database for user ID: " . $userId);
                exit;
            } else {
                error_log("User ID $userId not found in database");
            }
        }
    } else {
        error_log("Users table does not exist in the database");
    }
    
    // If we reach here, we were unable to get user data from database
    // Return a sample user as fallback, but with the requested user ID if available
    $sampleUserId = $userId ?: 2; // Default to ID 2 only if no user ID found
    
    $sampleUser = [
        'id' => intval($sampleUserId),
        'name' => 'Sample User',
        'email' => 'sample@example.com',
        'phone' => '1234567890',
        'role' => 'user',
        'createdAt' => date('Y-m-d H:i:s', strtotime('-1 day'))
    ];
    
    echo json_encode([
        'status' => 'success',
        'user' => $sampleUser,
        'source' => 'sample_fallback'
    ]);
    error_log("Returned sample user data as fallback with ID: " . $sampleUserId);
    
} catch (Exception $e) {
    error_log("Error in user.php: " . $e->getMessage());
    
    // Return fallback user data with the requested ID if available
    $fallbackUserId = $userId ?: 2; // Default to ID 2 only if no user ID found
    
    $fallbackUser = [
        'id' => intval($fallbackUserId),
        'name' => 'Fallback User',
        'email' => 'fallback@example.com',
        'phone' => '9876543210',
        'role' => 'user',
        'createdAt' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode([
        'status' => 'success',
        'user' => $fallbackUser,
        'source' => 'error_fallback',
        'error' => $e->getMessage()
    ]);
}
