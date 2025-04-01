<?php
// Include configuration file
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/utils/mailer.php';
require_once __DIR__ . '/utils/email.php';

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

// Get user ID from JWT token
$headers = getallheaders();
$userId = null;
$isAdmin = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
    }
}

if (!$userId && !$isAdmin) {
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
    exit;
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
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
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
                user_id INT NOT NULL,
                booking_number VARCHAR(20) NOT NULL,
                pickup_location TEXT NOT NULL,
                drop_location TEXT,
                pickup_date DATETIME NOT NULL,
                return_date DATETIME,
                cab_type VARCHAR(50) NOT NULL,
                distance DECIMAL(10,2) NOT NULL,
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY (booking_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $conn->query($createTableSql);
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found, created bookings table'], 404);
        exit;
    }

    // First check if the booking exists and belongs to the user or the user is an admin
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Check if the booking belongs to the user or if the user is an admin
    if ($booking['user_id'] != $userId && !$isAdmin) {
        sendJsonResponse(['status' => 'error', 'message' => 'You do not have permission to update this booking'], 403);
        exit;
    }
    
    // Build the update query based on provided fields
    $updateFields = [];
    $updateValues = [];
    $updateTypes = "";
    
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
        'admin_notes' => 'adminNotes'
    ];
    
    // Track if status is being updated to 'confirmed'
    $statusUpdated = false;
    $oldStatus = $booking['status'];
    $newStatus = isset($data['status']) ? $data['status'] : $oldStatus;
    
    if ($oldStatus != $newStatus) {
        $statusUpdated = true;
    }
    
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
    if (count($updateFields) === 0) {
        sendJsonResponse(['status' => 'success', 'message' => 'No changes to apply']);
        exit;
    }
    
    logError("Update query fields", [
        'fields' => $updateFields,
        'values' => $updateValues,
        'types' => $updateTypes
    ]);
    
    // Update the booking
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
    
    // Get the updated booking
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    $updatedBooking = $result->fetch_assoc();
    
    // Format the response
    $booking = [
        'id' => (int)$updatedBooking['id'],
        'userId' => (int)$updatedBooking['user_id'],
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
        'createdAt' => $updatedBooking['created_at'],
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    // If status is changed, send a notification email to customer
    if ($statusUpdated && $newStatus === 'confirmed') {
        logError("Sending booking status update email", [
            'booking_id' => $bookingId,
            'new_status' => 'confirmed',
            'passenger_email' => $updatedBooking['passenger_email'],
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        try {
            // Only send if we have a passenger email
            if (!empty($updatedBooking['passenger_email'])) {
                // Enhanced email sending with all available methods
                $emailSubject = "Booking #" . $updatedBooking['booking_number'] . " Confirmed";
                $emailMessage = "Your booking has been confirmed by Vizag Taxi Hub. Your driver " . 
                    ($updatedBooking['driver_name'] ? $updatedBooking['driver_name'] : "will be assigned soon") . 
                    " and vehicle " . ($updatedBooking['vehicle_number'] ? $updatedBooking['vehicle_number'] : "details will be shared soon") . 
                    ". Thank you for choosing Vizag Taxi Hub.";
                
                // Try direct SMTP first (most reliable)
                logError("First attempting SMTP for status update email", [
                    'recipient' => $updatedBooking['passenger_email'],
                    'booking_id' => $bookingId,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
                
                $htmlEmail = generateConfirmationEmailHtml($emailSubject, $emailMessage);
                
                // Add some additional information to help avoid spam filters
                $htmlEmail = str_replace('</body>', 
                    '<div style="font-size:0.8em;color:#666;margin-top:30px;border-top:1px solid #eee;padding-top:10px;">
                        <p>This is a legitimate booking confirmation from Vizag Taxi Hub. If you did not make this booking, please contact us.</p>
                        <p>Our address: Lawsons Bay Colony, Visakhapatnam, AP 530017</p>
                        <p>Contact: +91 9966363662 | info@vizagup.com</p>
                    </div></body>', $htmlEmail);
                
                $emailSuccess = sendSmtpEmail(
                    $updatedBooking['passenger_email'],
                    $emailSubject,
                    $htmlEmail
                );
                
                if (!$emailSuccess) {
                    // Try with all methods through our helper
                    logError("SMTP failed, trying all available methods", [
                        'recipient' => $updatedBooking['passenger_email'],
                        'booking_id' => $bookingId,
                        'timestamp' => date('Y-m-d H:i:s')
                    ]);
                    
                    $emailSuccess = sendEmailAllMethods(
                        $updatedBooking['passenger_email'],
                        $emailSubject,
                        $htmlEmail
                    );
                }
                
                // Log the email sending result
                logError("Status update email result", [
                    'success' => $emailSuccess ? 'yes' : 'no',
                    'booking_id' => $bookingId,
                    'recipient' => $updatedBooking['passenger_email'],
                    'methods_tried' => 'all available methods',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            }
        } catch (Exception $e) {
            logError("Error sending status update email", [
                'error' => $e->getMessage(),
                'booking_id' => $bookingId,
                'trace' => $e->getTraceAsString(),
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        }
    }
    
    sendJsonResponse(['status' => 'success', 'message' => 'Booking updated successfully', 'data' => $booking]);
    
} catch (Exception $e) {
    logError("Update booking error", [
        'message' => $e->getMessage(), 
        'trace' => $e->getTraceAsString(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to update booking: ' . $e->getMessage()], 500);
}

// Helper function to generate HTML email for confirmation
function generateConfirmationEmailHtml($subject, $message) {
    return '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>'.$subject.'</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #ddd; }
        .footer { margin-top: 20px; text-align: center; color: #777; font-size: 14px; }
        .contact-info { margin-top: 15px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
        .booking-reference { font-weight: bold; color: #4CAF50; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>'.$subject.'</h1>
        </div>
        <div class="content">
            <p>'.$message.'</p>
            <div class="contact-info">
                <p>If you have any questions, please contact our customer support:</p>
                <p>Phone: +91 9966363662</p>
                <p>Email: info@vizagup.com</p>
                <p class="booking-reference">Please keep your booking reference for all communications.</p>
            </div>
        </div>
        <div class="footer">
            <p>Thank you for choosing Vizag Taxi Hub!</p>
            <p>© ' . date('Y') . ' Vizag Taxi Hub. All rights reserved.</p>
            <p>Lawsons Bay Colony, Visakhapatnam, AP 530017</p>
        </div>
    </div>
</body>
</html>';
}
