
<?php
// Ensure correct path to config.php - adjusting relative path
require_once __DIR__ . '/../config.php';

// Email verification function
function sendVerificationEmail($email, $name, $verificationLink) {
    // Include the email utilities
    require_once __DIR__ . '/../utils/email.php';
    require_once __DIR__ . '/../utils/mailer.php';
    
    $subject = "Verify Your Email - Vizag Taxi Hub";
    
    // Create HTML email content
    $htmlBody = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f8f9fa; }
            .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>📧 Verify Your Email Address</h1>
            </div>
            <div class='content'>
                <h2>Hello $name,</h2>
                <p>Welcome to Vizag Taxi Hub! Thank you for creating an account with us.</p>
                <p>To complete your registration and start using our services, please verify your email address by clicking the button below:</p>
                <a href='$verificationLink' class='button'>Verify My Email</a>
                <p><strong>This verification link will expire in 24 hours.</strong></p>
                <p>If you didn't create an account with us, please ignore this email.</p>
                <p>Once verified, you'll be able to:</p>
                <ul>
                    <li>Book taxi rides</li>
                    <li>Track your bookings</li>
                    <li>Manage your profile</li>
                    <li>Access exclusive offers</li>
                </ul>
            </div>
            <div class='footer'>
                <p>© 2024 Vizag Taxi Hub. All rights reserved.</p>
                <p>If you're having trouble clicking the button, copy and paste this link into your browser:</p>
                <p style='word-break: break-all; color: #1e40af;'>$verificationLink</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    // Use the same email system as contact form
    return sendEmailAllMethods($email, $subject, $htmlBody);
}

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
    $emailSent = sendVerificationEmail($email, $name, $verificationLink);
    
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
