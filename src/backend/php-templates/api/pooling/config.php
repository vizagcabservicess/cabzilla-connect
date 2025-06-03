<?php
// Database configuration
$host = 'localhost';
$dbname = 'u644605165_db_be';
$username = 'u644605165_usr_be';
$password = 'Vizag@1213';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    sendError('Database connection failed: ' . $e->getMessage(), 500);
}

// Helper functions
function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode([
        'status' => 'success',
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

function sendError($message, $status = 400) {
    http_response_code($status);
    echo json_encode([
        'status' => 'error',
        'message' => '[DEBUG_MARKER] ' . $message,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

function validateInput($input, $required_fields) {
    $errors = [];
    file_put_contents(__DIR__ . '/debug_login.log', "validateInput called with: " . print_r($input, true) . " and required: " . print_r($required_fields, true) . "\n", FILE_APPEND);
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || (is_string($input[$field]) && trim($input[$field]) === '')) {
            $errors[] = "$field is required";
        }
    }
    file_put_contents(__DIR__ . '/debug_login.log', "validateInput errors: " . print_r($errors, true) . "\n", FILE_APPEND);
    return $errors;
}

function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return is_string($input) ? trim(htmlspecialchars($input, ENT_QUOTES, 'UTF-8')) : $input;
}

function generateHash($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyHash($password, $hash) {
    return password_verify($password, $hash);
}

function generateToken($length = 32) {
    return bin2hex(random_bytes($length));
}

// Pagination helper
function getPaginationParams() {
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(100, max(1, intval($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    
    return [$page, $limit, $offset];
}

// Authentication helper
function getAuthUser() {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? $_GET['token'] ?? null;
    
    if (!$token) {
        return null;
    }
    
    // Remove 'Bearer ' prefix if present
    $token = str_replace('Bearer ', '', $token);
    
    global $pdo;
    $stmt = $pdo->prepare("SELECT * FROM pooling_users WHERE api_token = ? AND is_active = 1");
    $stmt->execute([$token]);
    
    return $stmt->fetch();
}

// Require authentication for protected endpoints
function requireAuth() {
    $user = getAuthUser();
    if (!$user) {
        sendError('Authentication required', 401);
    }
    return $user;
}

// Check user role
function requireRole($required_roles) {
    $user = requireAuth();
    if (!in_array($user['role'], $required_roles)) {
        sendError('Insufficient permissions', 403);
    }
    return $user;
}

// Log function for debugging
function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp] [$level] $message" . PHP_EOL;
    file_put_contents(__DIR__ . '/logs/pooling.log', $log_entry, FILE_APPEND | LOCK_EX);
}
?>
