
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helper function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Helper function to log errors
function logError($message, $data = []) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/api_errors_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logData = "[$timestamp] $message: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
    file_put_contents($logFile, $logData, FILE_APPEND);
    
    // Also log to PHP error log
    error_log("$message: " . json_encode($data));
}

// Allow both POST and PUT requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Get booking ID from URL or request body
$bookingId = null;
if (isset($_GET['id'])) {
    $bookingId = $_GET['id'];
} else {
    // Get data from request body
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['id'])) {
        $bookingId = $data['id'];
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
        exit;
    }
}

// Get data from request body
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid request data'], 400);
    exit;
}

// Debug log the incoming data
logError("Update booking request data", $data);

// Connect to database
try {
    // Try to use getDbConnection from config.php first
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
        
        // Set character set
        $conn->set_charset("utf8mb4");
    }
} catch (Exception $e) {
    logError("Database connection failed", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
    exit;
}

try {
    // Check if the bookings table exists
    $checkTableStmt = $conn->query("SHOW TABLES LIKE 'bookings'");
    if ($checkTableStmt->num_rows === 0) {
        // Table doesn't exist, create it
        $createTableSql = "
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                booking_number VARCHAR(20) NOT NULL,
                pickup_location TEXT NOT NULL,
                drop_location TEXT,
                pickup_date DATETIME NOT NULL,
                return_date DATETIME,
                cab_type VARCHAR(50) NOT NULL,
                distance DECIMAL(10,2),
                trip_type VARCHAR(20) NOT NULL,
                trip_mode VARCHAR(20) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                passenger_name VARCHAR(100),
                passenger_phone VARCHAR(20),
                passenger_email VARCHAR(100),
                driver_name VARCHAR(100),
                driver_phone VARCHAR(20),
                vehicle_number VARCHAR(20),
                admin_notes TEXT,
                billing_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY (booking_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $conn->query($createTableSql);
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found, created bookings table'], 404);
        exit;
    }

    // Check if we need to add the billing_address column
    $columnsStmt = $conn->query("SHOW COLUMNS FROM bookings LIKE 'billing_address'");
    if ($columnsStmt->num_rows === 0) {
        $conn->query("ALTER TABLE bookings ADD COLUMN billing_address TEXT AFTER admin_notes");
    }

    // Check if booking_extras table exists, if not create it
    $checkExtrasTableStmt = $conn->query("SHOW TABLES LIKE 'booking_extras'");
    if ($checkExtrasTableStmt->num_rows === 0) {
        // Table doesn't exist, create it
        $createExtrasTableSql = "
            CREATE TABLE IF NOT EXISTS booking_extras (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                description VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (booking_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $conn->query($createExtrasTableSql);
    }

    // First check if the booking exists
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Build the update query based on provided fields
    $updateFields = [];
    $updateValues = [];
    $updateTypes = "";
    
    // All the fields that can be updated
    $allowedFields = [
        'pickup_location' => 'pickupLocation',
        'drop_location' => 'dropLocation',
        'pickup_date' => 'pickupDate',
        'return_date' => 'returnDate',
        'passenger_name' => 'passengerName',
        'passenger_phone' => 'passengerPhone',
        'passenger_email' => 'passengerEmail',
        'status' => 'status',
        'driver_name' => 'driverName',
        'driver_phone' => 'driverPhone',
        'vehicle_number' => 'vehicleNumber',
        'admin_notes' => 'adminNotes',
        'billing_address' => 'billingAddress'
    ];
    
    // Track if status is being updated
    $oldStatus = $booking['status'];
    $newStatus = isset($data['status']) ? $data['status'] : $oldStatus;
    $statusUpdated = ($oldStatus != $newStatus);
    
    // Map API field names to database field names
    foreach ($allowedFields as $dbField => $apiField) {
        if (isset($data[$apiField])) {
            $updateFields[] = "$dbField = ?";
            $updateValues[] = $data[$apiField];
            $updateTypes .= "s"; // Assume all fields are strings for simplicity
        }
    }
    
    // Add the booking ID at the end of values
    $updateValues[] = $bookingId;
    $updateTypes .= "i";
    
    // If no fields to update, return success (no changes)
    if (count($updateFields) === 0 && !isset($data['extraCharges'])) {
        sendJsonResponse(['status' => 'success', 'message' => 'No changes to apply']);
        exit;
    }
    
    logError("Update query fields", [
        'fields' => $updateFields,
        'values' => $updateValues,
        'types' => $updateTypes
    ]);
    
    // Begin transaction for multiple updates
    $conn->begin_transaction();
    
    // Update the booking if there are fields to update
    if (count($updateFields) > 0) {
        $updateQuery = "UPDATE bookings SET " . implode(", ", $updateFields) . ", updated_at = NOW() WHERE id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        
        if (!$updateStmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        // Dynamically bind parameters
        $bindParams = array_merge([$updateTypes], $updateValues);
        $updateStmt->bind_param(...$bindParams);
        
        $success = $updateStmt->execute();
        
        if (!$success) {
            throw new Exception('Database error: ' . $updateStmt->error);
        }
    }

    // Handle extra charges if provided
    if (isset($data['extraCharges']) && is_array($data['extraCharges']) && !empty($data['extraCharges'])) {
        foreach ($data['extraCharges'] as $extra) {
            if (!isset($extra['description']) || !isset($extra['amount'])) {
                continue; // Skip invalid entries
            }
            
            $description = $extra['description'];
            $amount = floatval($extra['amount']);
            
            if ($amount <= 0) {
                continue; // Skip zero or negative amounts
            }
            
            $extraStmt = $conn->prepare("INSERT INTO booking_extras (booking_id, description, amount) VALUES (?, ?, ?)");
            $extraStmt->bind_param("isd", $bookingId, $description, $amount);
            $extraStmt->execute();
        }
    }
    
    // Commit all changes
    $conn->commit();
    
    // Get the updated booking
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    $updatedBooking = $result->fetch_assoc();

    // Get extra charges
    $extraCharges = [];
    $totalExtraCharges = 0;
    $extrasStmt = $conn->prepare("SELECT id, description, amount FROM booking_extras WHERE booking_id = ?");
    $extrasStmt->bind_param("i", $bookingId);
    $extrasStmt->execute();
    $extrasResult = $extrasStmt->get_result();
    
    while ($row = $extrasResult->fetch_assoc()) {
        $extraCharges[] = [
            'id' => $row['id'],
            'description' => $row['description'],
            'amount' => floatval($row['amount'])
        ];
        $totalExtraCharges += floatval($row['amount']);
    }
    
    // Format the response
    $booking = [
        'id' => (int)$updatedBooking['id'],
        'userId' => $updatedBooking['user_id'] ? (int)$updatedBooking['user_id'] : null,
        'bookingNumber' => $updatedBooking['booking_number'],
        'pickupLocation' => $updatedBooking['pickup_location'],
        'dropLocation' => $updatedBooking['drop_location'],
        'pickupDate' => $updatedBooking['pickup_date'],
        'returnDate' => $updatedBooking['return_date'],
        'cabType' => $updatedBooking['cab_type'],
        'distance' => (float)$updatedBooking['distance'],
        'tripType' => $updatedBooking['trip_type'],
        'tripMode' => $updatedBooking['trip_mode'],
        'totalAmount' => (float)$updatedBooking['total_amount'],
        'status' => $updatedBooking['status'],
        'passengerName' => $updatedBooking['passenger_name'],
        'passengerPhone' => $updatedBooking['passenger_phone'],
        'passengerEmail' => $updatedBooking['passenger_email'],
        'driverName' => $updatedBooking['driver_name'],
        'driverPhone' => $updatedBooking['driver_phone'],
        'vehicleNumber' => $updatedBooking['vehicle_number'],
        'adminNotes' => $updatedBooking['admin_notes'],
        'billingAddress' => $updatedBooking['billing_address'],
        'extraCharges' => $extraCharges,
        'totalExtraCharges' => $totalExtraCharges,
        'finalAmount' => (float)$updatedBooking['total_amount'] + $totalExtraCharges,
        'createdAt' => $updatedBooking['created_at'],
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    // If status is changed, send a notification email to customer
    if ($statusUpdated && $newStatus === 'confirmed') {
        logError("Status updated to confirmed", [
            'booking_id' => $bookingId,
            'email' => $updatedBooking['passenger_email']
        ]);
        
        // Include email utilities if needed
        if (!function_exists('sendEmailWithPHPMailer')) {
            require_once __DIR__ . '/utils/email.php';
        }
        
        // Try to send status update notification
        try {
            // Create email content for status update
            $emailSubject = "Booking #{$updatedBooking['booking_number']} Confirmed";
            $htmlContent = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Booking Confirmed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
        .details { margin: 20px 0; }
        .detail-row { display: flex; margin-bottom: 10px; }
        .detail-label { font-weight: bold; width: 150px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Confirmed!</h1>
            <p>Your booking #{$updatedBooking['booking_number']} has been confirmed.</p>
        </div>
        <div class="content">
            <p>Dear {$updatedBooking['passenger_name']},</p>
            <p>We're pleased to inform you that your booking has been confirmed. Your driver details are:</p>
            
            <div class="details">
                <div class="detail-row">
                    <div class="detail-label">Driver Name:</div>
                    <div>{$updatedBooking['driver_name'] ?? 'To be assigned'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Driver Phone:</div>
                    <div>{$updatedBooking['driver_phone'] ?? 'To be assigned'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Vehicle Number:</div>
                    <div>{$updatedBooking['vehicle_number'] ?? 'To be assigned'}</div>
                </div>
            </div>
            
            <p>For any questions, please contact us at:</p>
            <p>Phone: +91 9966363662</p>
            <p>Email: info@vizagtaxihub.com</p>
            
            <p>Thank you for choosing Vizag Taxi Hub!</p>
        </div>
    </div>
</body>
</html>
HTML;
            
            // Send the email
            $emailSent = sendEmailAllMethods($updatedBooking['passenger_email'], $emailSubject, $htmlContent);
            logError("Status update email result", ['sent' => $emailSent ? 'yes' : 'no']);
            
            // Add email status to response
            $booking['emailSent'] = $emailSent;
            
        } catch (Exception $emailException) {
            logError("Failed to send status update email", [
                'error' => $emailException->getMessage(),
                'trace' => $emailException->getTraceAsString()
            ]);
            // Don't fail the update if email fails
            $booking['emailSent'] = false;
        }
    }
    
    sendJsonResponse(['status' => 'success', 'message' => 'Booking updated successfully', 'data' => $booking]);
    
} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();
    
    logError("Update booking error", [
        'message' => $e->getMessage(), 
        'trace' => $e->getTraceAsString()
    ]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to update booking: ' . $e->getMessage()], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
