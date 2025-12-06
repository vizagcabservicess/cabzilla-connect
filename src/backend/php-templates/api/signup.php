
<?php
// Ensure correct path to config.php - adjusting relative path
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/utils/email-verification.php';

// Handle OPTIONS requests for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Handle GET requests gracefully - redirect to frontend signup page or show user-friendly message
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Set CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    
    // Send friendly response for direct browser access
    echo json_encode([
        'status' => 'info',
        'message' => 'This is the signup API endpoint. Please use the frontend application to create an account.',
        'redirect' => '/'
    ]);
    exit;
}

// Allow only POST requests for actual signup
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    // Get the request body
    $input = file_get_contents('php://input');
    logError("Signup request received", ['input' => $input]);
    
    $data = json_decode($input, true);
    
    // Validate input
    if (!isset($data['name']) || !isset($data['email']) || !isset($data['phone']) || !isset($data['password'])) {
        sendJsonResponse(['error' => 'Name, email, phone and password are required'], 400);
    }
    
    $name = $data['name'];
    $email = $data['email'];
    $phone = $data['phone'];
    $password = password_hash($data['password'], PASSWORD_BCRYPT);
    
    // Connect to database
    $conn = getDbConnection();
    
    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        sendJsonResponse(['error' => 'Email already exists'], 409);
    }
    
    // Generate email verification token
    $verificationToken = bin2hex(random_bytes(32));
    $verificationExpires = date('Y-m-d H:i:s', strtotime('+24 hours')); // Token expires in 24 hours
    
    // Insert new user with email verification fields
    $stmt = $conn->prepare("INSERT INTO users (name, email, phone, password, role, email_verified, email_verification_token, email_verification_expires, is_active) VALUES (?, ?, ?, ?, 'user', FALSE, ?, ?, FALSE)");
    $stmt->bind_param("ssssss", $name, $email, $phone, $password, $verificationToken, $verificationExpires);
    
    if (!$stmt->execute()) {
        sendJsonResponse(['error' => 'Failed to create user: ' . $stmt->error], 500);
    }
    
    $userId = $conn->insert_id;
    
    // Store verification token in email_verification_tokens table
    $stmt = $conn->prepare("INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
    $stmt->bind_param("iss", $userId, $verificationToken, $verificationExpires);
    $stmt->execute();
    
    // Send verification email
    $verificationLink = "https://vizagtaxihub.com/verify-email?token=" . $verificationToken;
    
    // Check if function exists before calling
    if (!function_exists('sendAccountVerificationEmail')) {
        logError('sendAccountVerificationEmail function not found in signup', [
            'email' => $email
        ]);
        $emailSent = false;
    } else {
        try {
            $emailSent = sendAccountVerificationEmail($email, $name, $verificationLink);
            logError('Verification email sent from signup', [
                'email' => $email,
                'sent' => $emailSent ? 'yes' : 'no'
            ]);
        } catch (Exception $emailEx) {
            logError('Exception sending verification email from signup', [
                'email' => $email,
                'error' => $emailEx->getMessage()
            ]);
            $emailSent = false;
        }
    }
    
    // Get the created user
    $stmt = $conn->prepare("SELECT id, name, email, phone, role, email_verified FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    // Send response (no JWT token until email is verified)
    sendJsonResponse([
        'success' => true,
        'message' => 'Account created successfully! Please check your email to verify your account.',
        'email_verification_required' => true,
        'user' => $user,
        'verification_email_sent' => $emailSent
    ], 201);
} catch (Exception $e) {
    logError('Signup exception: ' . $e->getMessage());
    sendJsonResponse(['error' => 'An unexpected error occurred: ' . $e->getMessage()], 500);
}
