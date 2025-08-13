<?php
// driver-hire-request.php - Handle driver hiring requests
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';
require_once __DIR__ . '/utils/mailer.php';
require_once __DIR__ . '/utils/email-templates.php';

// Set headers
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
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Get database connection
try {
    $conn = getDbConnectionWithRetry();
} catch (Exception $e) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
}

// Get request data
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!$input) {
    error_log("Invalid JSON data received: " . $rawInput);
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid JSON data'], 400);
}

// Log the received data for debugging
error_log("Driver hire request received: " . json_encode($input));

// Additional detailed logging
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/driver_hire_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
$logEntry = "[$timestamp] Driver hire request received: " . json_encode($input) . "\n";
file_put_contents($logFile, $logEntry, FILE_APPEND);

// Validate required fields
$requiredFields = ['name', 'phone', 'serviceType', 'duration'];
$errors = [];

foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        $errors[] = ucfirst($field) . ' is required';
    }
}

if (!empty($errors)) {
    sendJsonResponse(['status' => 'error', 'message' => 'Validation failed', 'errors' => $errors], 400);
}

// Validate phone number format (10 digits)
if (!preg_match('/^\d{10}$/', $input['phone'])) {
    $errors[] = 'Phone number must be 10 digits';
}

// Validate email if provided
if (!empty($input['email']) && !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format';
}

if (!empty($errors)) {
    sendJsonResponse(['status' => 'error', 'message' => 'Validation failed', 'errors' => $errors], 400);
}

// Ensure the driver_hire_requests table exists
try {
    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'driver_hire_requests'");
    if ($tableCheckResult->num_rows === 0) {
        // Create driver_hire_requests table
        $createTableSql = "CREATE TABLE driver_hire_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(100),
            service_type VARCHAR(50) NOT NULL,
            duration VARCHAR(50) NOT NULL,
            requirements TEXT,
            status ENUM('pending', 'contacted', 'confirmed', 'cancelled') DEFAULT 'pending',
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $conn->query($createTableSql);
    }
} catch (Exception $e) {
    error_log("Error checking/creating driver_hire_requests table: " . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'Database setup failed'], 500);
}

// Insert the driver hire request
try {
    $sql = "INSERT INTO driver_hire_requests (name, phone, email, service_type, duration, requirements) 
            VALUES (?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    // Prepare variables for binding (to avoid reference issues)
    $email = $input['email'] ?? '';
    $requirements = $input['requirements'] ?? '';
    
    // Log the values being inserted for debugging
    error_log("Inserting driver hire request - Name: {$input['name']}, Phone: {$input['phone']}, Email: {$email}, Service: {$input['serviceType']}, Duration: {$input['duration']}, Requirements: {$requirements}");
    
    $stmt->bind_param("ssssss", 
        $input['name'],
        $input['phone'],
        $email,
        $input['serviceType'],
        $input['duration'],
        $requirements
    );
    
    if (!$stmt->execute()) {
        error_log("Database error: " . $stmt->error);
        throw new Exception("Failed to insert request: " . $stmt->error);
    }
    
    $requestId = $conn->insert_id;
    
    // Get the created request
    $selectSql = "SELECT * FROM driver_hire_requests WHERE id = ?";
    $selectStmt = $conn->prepare($selectSql);
    $selectStmt->bind_param("i", $requestId);
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    $request = $result->fetch_assoc();
    
    // Send emails
    try {
        // Log email sending attempt
        $emailLogEntry = "[$timestamp] Attempting to send emails for driver hire request #{$requestId}\n";
        file_put_contents($logFile, $emailLogEntry, FILE_APPEND);
        
        // Send notification email to admin
        $adminEmailHtml = generateDriverHireAdminEmail($request);
        $adminEmailSent = sendEmailAllMethods('info@vizagtaxihub.com', 'New Driver Hire Request - ' . $request['name'], $adminEmailHtml);
        
        if ($adminEmailSent) {
            error_log("Admin notification email sent successfully for driver hire request #{$requestId}");
            $emailLogEntry = "[$timestamp] SUCCESS: Admin notification email sent for request #{$requestId}\n";
        } else {
            error_log("Failed to send admin notification email for driver hire request #{$requestId}");
            $emailLogEntry = "[$timestamp] FAILED: Admin notification email for request #{$requestId}\n";
        }
        file_put_contents($logFile, $emailLogEntry, FILE_APPEND);
        
        // Send acknowledgment email to customer (if email provided)
        if (!empty($request['email'])) {
            $customerEmailHtml = generateDriverHireCustomerEmail($request);
            $customerEmailSent = sendEmailAllMethods($request['email'], 'Driver Hire Request Received - Vizag Taxi Hub', $customerEmailHtml);
            
            if ($customerEmailSent) {
                error_log("Customer acknowledgment email sent successfully for driver hire request #{$requestId}");
                $emailLogEntry = "[$timestamp] SUCCESS: Customer acknowledgment email sent for request #{$requestId}\n";
            } else {
                error_log("Failed to send customer acknowledgment email for driver hire request #{$requestId}");
                $emailLogEntry = "[$timestamp] FAILED: Customer acknowledgment email for request #{$requestId}\n";
            }
            file_put_contents($logFile, $emailLogEntry, FILE_APPEND);
        } else {
            error_log("No customer email provided for driver hire request #{$requestId}");
            $emailLogEntry = "[$timestamp] INFO: No customer email provided for request #{$requestId}\n";
            file_put_contents($logFile, $emailLogEntry, FILE_APPEND);
        }
        
    } catch (Exception $e) {
        error_log("Error sending emails for driver hire request #{$requestId}: " . $e->getMessage());
        $emailLogEntry = "[$timestamp] ERROR: Email sending failed for request #{$requestId}: " . $e->getMessage() . "\n";
        file_put_contents($logFile, $emailLogEntry, FILE_APPEND);
        // Don't fail the request if email sending fails
    }
    
    // Send success response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Driver hire request submitted successfully. We will contact you within 30 minutes.',
        'requestId' => $requestId,
        'request' => $request
    ]);
    
} catch (Exception $e) {
    error_log("Error creating driver hire request: " . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to submit request. Please try again.'], 500);
}
?>
