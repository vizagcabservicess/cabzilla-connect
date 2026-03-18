<?php
// CORS first - handle preflight before any includes
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
require_once __DIR__ . '/../utils/email-verification.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

$required = ['name', 'email', 'password', 'phone'];
foreach ($required as $field) {
    if (!isset($input[$field]) || empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['error' => ucfirst($field) . ' is required']);
        exit();
    }
}

// Accept role from input, default to 'customer' for web/mobile signup
$valid_roles = ['customer', 'user', 'guest', 'provider', 'admin', 'driver'];
$role = isset($input['role']) ? strtolower(trim($input['role'])) : 'customer';
if (!in_array($role, $valid_roles)) {
    if (strpos($role, 'customer') !== false || strpos($role, 'user') !== false) {
        $role = 'customer';
    } else if (strpos($role, 'guest') !== false) {
        $role = 'guest';
    } else if (strpos($role, 'provider') !== false) {
        $role = 'provider';
    } else if (strpos($role, 'admin') !== false) {
        $role = 'admin';
    } else if (strpos($role, 'driver') !== false) {
        $role = 'driver';
    } else {
        $role = 'customer';
    }
}

// Add debug logging and error display for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    $conn = getDbConnectionWithRetry();
    
    // Check if user already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? OR phone = ?");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param("ss", $input['email'], $input['phone']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'User already exists with this email or phone']);
        exit();
    }
    
    // Hash password
    $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
    
    // Generate verification token
    $verificationToken = bin2hex(random_bytes(32));
    $verificationExpires = date('Y-m-d H:i:s', strtotime('+24 hours'));
    
    // Insert user with verification fields
    $stmt = $conn->prepare("
        INSERT INTO users (name, email, phone, password, role, email_verified, email_verification_token, email_verification_expires, is_active)
        VALUES (?, ?, ?, ?, ?, FALSE, ?, ?, FALSE)
    ");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param("sssssss", $input['name'], $input['email'], $input['phone'], $hashedPassword, $role, $verificationToken, $verificationExpires);
    $stmt->execute();
    $userId = $conn->insert_id;
    
    // Store verification token record
    $stmt = $conn->prepare("INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param("iss", $userId, $verificationToken, $verificationExpires);
    $stmt->execute();
    
    // The wallet logic below seems specific to pooling,
    // which you asked to avoid. I am commenting it out.
    /*
    // Check if wallet already exists for this user
    $stmt = $conn->prepare("SELECT id FROM pooling_wallets WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        // Only insert if wallet does not exist
        $stmt = $conn->prepare("INSERT INTO pooling_wallets (user_id, balance) VALUES (?, 0.00)");
        if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
    }
    */
    
    // Fetch the created user from users table
    $stmt = $conn->prepare("SELECT id, name, email, phone, role, email_verified, is_active FROM users WHERE id = ?");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $user['role'] = $role; // Ensure role is set in response
    
    // Send verification email
    $verificationLink = "https://vizagtaxihub.com/verify-email?token=" . $verificationToken;
    $emailSent = sendAccountVerificationEmail($user['email'], $user['name'], $verificationLink);
    
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful! Please verify your email before logging in.',
        'user' => $user,
        'email_verification_required' => true,
        'verification_email_sent' => $emailSent,
        'token' => null
    ]);
    
} catch (Exception $e) {
    error_log('Registration error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed', 'details' => $e->getMessage()]);
}
?>
