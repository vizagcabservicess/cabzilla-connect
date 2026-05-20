<?php
// CORS must be set first, before any output - handle preflight immediately
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';
require_once __DIR__ . '/../utils/security.php';

header('Content-Type: application/json');

// Set security headers (must not override CORS)
if (function_exists('setSecurityHeaders')) {
    setSecurityHeaders();
}

// Log only basic request info for security
if (function_exists('secureLog')) {
    secureLog("Login attempt", "INFO", ['ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Rate limiting applies only to failed login attempts (not every POST)
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$loginRateKey = "login_fail_$clientIP";

$input = json_decode(file_get_contents('php://input'), true);

// Fallback: If JSON is empty, try POST form data
if (!$input || !is_array($input)) {
    $input = $_POST;
}

// Validate and sanitize input
$validationRules = [
    'email' => ['type' => 'email', 'required' => true, 'max_length' => 255],
    'password' => ['type' => 'string', 'required' => true, 'min_length' => 1]
];

$validation = validateAndSanitizeInput($input, $validationRules);
if (!empty($validation['errors'])) {
    secureLog("Login validation failed", "WARNING", ['errors' => $validation['errors']]);
    http_response_code(400);
    echo json_encode(['error' => implode(', ', $validation['errors'])]);
    exit();
}

$sanitizedInput = $validation['sanitized'];

try {
    $conn = getDbConnectionWithRetry();
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id, name, email, password, role, is_active, email_verified FROM users WHERE email = ?");
    $stmt->bind_param("s", $sanitizedInput['email']);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if (!$user || !password_verify($sanitizedInput['password'], $user['password'])) {
        if (!recordFailedAuthAttempt($loginRateKey, AUTH_RATE_LIMIT_MAX_REQUESTS, 300)) {
            secureLog("Rate limit exceeded for login", "WARNING", ['ip' => $clientIP]);
            http_response_code(429);
            echo json_encode(['error' => 'Too many failed login attempts. Please wait 5 minutes and try again.']);
            exit();
        }
        secureLog("Failed login attempt", "WARNING", ['email' => $sanitizedInput['email'], 'ip' => $clientIP]);
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
        exit();
    }
    
    if (!$user['is_active']) {
        secureLog("Login attempt for inactive account", "WARNING", ['email' => $sanitizedInput['email'], 'ip' => $clientIP]);
        http_response_code(403);
        echo json_encode(['error' => 'Account is inactive']);
        exit();
    }
    
    // Check if email is verified
    if (!$user['email_verified']) {
        secureLog("Login attempt for unverified email", "WARNING", ['email' => $sanitizedInput['email'], 'ip' => $clientIP]);
        http_response_code(403);
        echo json_encode([
            'error' => 'Email not verified',
            'message' => 'Please verify your email address before logging in. Check your inbox for a verification email.',
            'email_verification_required' => true
        ]);
        exit();
    }
    
    // Generate JWT token
    $token = generateJwtToken($user['id'], $user['email'], $user['role']);

    clearRateLimit($loginRateKey);
    
    // Remove password_hash from response
    unset($user['password']);

    // Audit log successful login
    auditLog('user_login', $user['id'], ['email' => $sanitizedInput['email'], 'role' => $user['role']]);
    secureLog("Successful login", "INFO", ['user_id' => $user['id'], 'email' => $sanitizedInput['email'], 'role' => $user['role']]);

    echo json_encode([
        'success' => true,
        'user' => $user,
        'token' => $token
    ]);
    
} catch (Exception $e) {
    secureLog("Login error", "ERROR", ['error' => $e->getMessage(), 'email' => $sanitizedInput['email'] ?? 'unknown']);
    http_response_code(500);
    echo json_encode(['error' => 'Login failed']);
}
?>
