<?php
// contact-form.php - Handle contact form submissions

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers first to prevent output issues
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    // Clear any output buffers
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Include required files with error handling
$requiredFiles = [
    __DIR__ . '/../config.php',
    __DIR__ . '/common/db_helper.php',
    __DIR__ . '/utils/mailer.php',
    __DIR__ . '/utils/email-templates.php'
];

foreach ($requiredFiles as $file) {
    if (!file_exists($file)) {
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Required file not found: ' . basename($file)
        ], 500);
    }
    
    try {
        require_once $file;
    } catch (Exception $e) {
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Error loading ' . basename($file) . ': ' . $e->getMessage()
        ], 500);
    }
}

// Get database connection
try {
    $conn = getDbConnectionWithRetry();
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Database connection failed: ' . $e->getMessage()
    ], 500);
}

// Get request data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Invalid JSON data or empty request body'
    ], 400);
}

// Validate required fields
$requiredFields = ['name', 'email', 'phone', 'subject', 'message'];
$errors = [];

foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        $errors[] = ucfirst($field) . ' is required';
    }
}

if (!empty($errors)) {
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Validation failed', 
        'errors' => $errors
    ], 400);
}

// Validate email format
if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format';
}

// Validate phone number format (10 digits)
if (!preg_match('/^\d{10}$/', $input['phone'])) {
    $errors[] = 'Phone number must be 10 digits';
}

if (!empty($errors)) {
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Validation failed', 
        'errors' => $errors
    ], 400);
}

// Ensure the contact_messages table exists
try {
    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'contact_messages'");
    if ($tableCheckResult->num_rows === 0) {
        // Create contact_messages table
        $createTableSql = "CREATE TABLE contact_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            subject VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            status ENUM('new', 'read', 'replied', 'closed') DEFAULT 'new',
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        if (!$conn->query($createTableSql)) {
            throw new Exception("Failed to create contact_messages table: " . $conn->error);
        }
    }
} catch (Exception $e) {
    error_log("Error checking/creating contact_messages table: " . $e->getMessage());
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Database setup failed: ' . $e->getMessage()
    ], 500);
}

// Insert the contact message
try {
    $sql = "INSERT INTO contact_messages (name, email, phone, subject, message) 
            VALUES (?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->bind_param("sssss", 
        $input['name'],
        $input['email'],
        $input['phone'],
        $input['subject'],
        $input['message']
    );
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to insert message: " . $stmt->error);
    }
    
    $messageId = $conn->insert_id;
    
    // Get the created message
    $selectSql = "SELECT * FROM contact_messages WHERE id = ?";
    $selectStmt = $conn->prepare($selectSql);
    if (!$selectStmt) {
        throw new Exception("Failed to prepare select statement: " . $conn->error);
    }
    
    $selectStmt->bind_param("i", $messageId);
    if (!$selectStmt->execute()) {
        throw new Exception("Failed to execute select statement: " . $selectStmt->error);
    }
    
    $result = $selectStmt->get_result();
    $message = $result->fetch_assoc();
    
    if (!$message) {
        throw new Exception("Failed to retrieve inserted message");
    }
    
    // Send emails (but don't fail the request if email sending fails)
    $emailSuccess = false;
    try {
        // Check if email functions exist
        if (function_exists('generateContactAdminEmail') && function_exists('generateContactCustomerEmail') && function_exists('sendEmailAllMethods')) {
            // Send notification email to admin
            $adminEmailHtml = generateContactAdminEmail($message);
            $adminEmailSent = sendEmailAllMethods('info@vizagtaxihub.com', 'New Contact Form Message - ' . $message['subject'], $adminEmailHtml);
            
            if ($adminEmailSent) {
                error_log("Admin notification email sent successfully for contact message #{$messageId}");
            } else {
                error_log("Failed to send admin notification email for contact message #{$messageId}");
            }
            
            // Send acknowledgment email to customer
            $customerEmailHtml = generateContactCustomerEmail($message);
            $customerEmailSent = sendEmailAllMethods($message['email'], 'Message Received - Vizag Taxi Hub', $customerEmailHtml);
            
            if ($customerEmailSent) {
                error_log("Customer acknowledgment email sent successfully for contact message #{$messageId}");
                $emailSuccess = true;
            } else {
                error_log("Failed to send customer acknowledgment email for contact message #{$messageId}");
            }
        } else {
            error_log("Email template functions not found");
        }
        
    } catch (Exception $e) {
        error_log("Error sending emails for contact message #{$messageId}: " . $e->getMessage());
        // Don't fail the request if email sending fails
    }
    
    // Send success response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Thank you for your message! We will get back to you within 2 hours.',
        'messageId' => $messageId,
        'emailSent' => $emailSuccess,
        'data' => [
            'name' => $message['name'],
            'email' => $message['email'],
            'subject' => $message['subject'],
            'created_at' => $message['created_at']
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error creating contact message: " . $e->getMessage());
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to send message. Please try again.',
        'debug' => $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
?>
