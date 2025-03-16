<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Log request data for debugging
logError("Book.php request initiated", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI'],
    'headers' => getRequestHeaders()
]);

// Get the request body
$rawInput = file_get_contents('php://input');
logError("Raw input received", ['length' => strlen($rawInput), 'sample' => substr($rawInput, 0, 100)]);

// Decode JSON data
$data = json_decode($rawInput, true);

// Check if JSON is valid
if (json_last_error() !== JSON_ERROR_NONE) {
    logError("JSON decode error", ['error' => json_last_error_msg(), 'raw_data' => substr($rawInput, 0, 200)]);
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid JSON data: ' . json_last_error_msg()], 400);
    exit;
}

logError("Booking request data", ['data' => $data]);

// Validate required fields
$requiredFields = [
    'pickupLocation', 'cabType', 
    'tripType', 'tripMode', 'totalAmount', 
    'passengerName', 'passengerPhone', 'passengerEmail'
];

$missingFields = [];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    logError("Missing required fields", ['missing' => $missingFields]);
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Required fields missing: ' . implode(', ', $missingFields),
        'fields' => $missingFields
    ], 400);
    exit;
}

// Get user ID if authenticated
$userId = null;
$headers = getRequestHeaders();
if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        logError("Authenticated booking", ['user_id' => $userId]);
    } else {
        logError("Invalid token for booking", ['token' => substr($token, 0, 20) . '...']);
    }
} else {
    logError("No authorization header found", ['headers' => $headers]);
}

try {
    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        logError("Database connection failed");
        sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
        exit;
    }

    // Generate a unique booking number
    $bookingNumber = generateBookingNumber();

    // Debug log the user ID
    logError("User ID for booking", ['user_id' => $userId === null ? 'NULL' : $userId]);

    // Prepare SQL query with explicit NULL handling
    $sql = "INSERT INTO bookings 
            (user_id, booking_number, pickup_location, drop_location, pickup_date, 
            return_date, cab_type, distance, trip_type, trip_mode, 
            total_amount, passenger_name, passenger_phone, passenger_email, 
            hourly_package, tour_id, status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        logError("Prepare statement failed", ['error' => $conn->error, 'sql' => $sql]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database prepare error: ' . $conn->error], 500);
        exit;
    }

    // Get values and sanitize/validate them
    $pickupLocation = trim($data['pickupLocation']);
    $dropLocation = isset($data['dropLocation']) ? trim($data['dropLocation']) : null;
    $pickupDate = trim($data['pickupDate']);
    $returnDate = isset($data['returnDate']) && $data['returnDate'] ? trim($data['returnDate']) : null;
    $cabType = trim($data['cabType']);
    $distance = isset($data['distance']) ? floatval($data['distance']) : 0;
    $tripType = trim($data['tripType']);
    $tripMode = trim($data['tripMode']);
    $totalAmount = floatval($data['totalAmount']);
    $passengerName = trim($data['passengerName']);
    $passengerPhone = trim($data['passengerPhone']);
    $passengerEmail = trim($data['passengerEmail']);
    $hourlyPackage = isset($data['hourlyPackage']) && $data['hourlyPackage'] ? trim($data['hourlyPackage']) : null;
    $tourId = isset($data['tourId']) && $data['tourId'] ? trim($data['tourId']) : null;
    $status = 'pending'; // Default status for new bookings
    
    // Log the sanitized data
    logError("Sanitized booking data", [
        'pickup' => $pickupLocation,
        'dropoff' => $dropLocation,
        'pickup_date' => $pickupDate,
        'return_date' => $returnDate,
        'total' => $totalAmount,
        'user_id' => $userId
    ]);

    // Properly bind parameters based on whether userId is null
    if ($userId === null) {
        $stmt->bind_param(
            "ssssssdssdsssiss",
            $userId, // This will be NULL because $userId is null
            $bookingNumber, $pickupLocation, $dropLocation, $pickupDate,
            $returnDate, $cabType, $distance, $tripType, $tripMode,
            $totalAmount, $passengerName, $passengerPhone, $passengerEmail,
            $hourlyPackage, $tourId, $status
        );
    } else {
        $stmt->bind_param(
            "issssssdssdsssiss",
            $userId, $bookingNumber, $pickupLocation, $dropLocation, $pickupDate,
            $returnDate, $cabType, $distance, $tripType, $tripMode,
            $totalAmount, $passengerName, $passengerPhone, $passengerEmail,
            $hourlyPackage, $tourId, $status
        );
    }

    if (!$stmt->execute()) {
        logError("Execute statement failed", ['error' => $stmt->error]);
        
        // Explicitly try with NULL user_id if that wasn't already tried
        if ($userId !== null && strpos($stmt->error, 'foreign key constraint') !== false) {
            logError("Foreign key constraint error. Retrying with NULL user_id");
            $stmt->close();
            
            // Create a new prepared statement with NULL user_id
            $retryStmt = $conn->prepare($sql);
            if (!$retryStmt) {
                logError("Retry prepare statement failed", ['error' => $conn->error]);
                sendJsonResponse(['status' => 'error', 'message' => 'Database retry error: ' . $conn->error], 500);
                exit;
            }
            
            // Set userId to NULL and bind parameters again
            $userId = null;
            $retryStmt->bind_param(
                "ssssssdssdsssiss",
                $userId, $bookingNumber, $pickupLocation, $dropLocation, $pickupDate,
                $returnDate, $cabType, $distance, $tripType, $tripMode,
                $totalAmount, $passengerName, $passengerPhone, $passengerEmail,
                $hourlyPackage, $tourId, $status
            );
            
            if (!$retryStmt->execute()) {
                logError("Retry execute failed", ['error' => $retryStmt->error]);
                sendJsonResponse(['status' => 'error', 'message' => 'Database retry failed: ' . $retryStmt->error], 500);
                exit;
            }
            
            $bookingId = $conn->insert_id;
            $retryStmt->close();
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Failed to create booking: ' . $stmt->error], 500);
            exit;
        }
    } else {
        $bookingId = $conn->insert_id;
        $stmt->close();
    }

    logError("Booking created", ['booking_id' => $bookingId, 'booking_number' => $bookingNumber, 'user_id' => $userId]);

    // Get the created booking
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    if (!$stmt) {
        logError("Prepare statement failed for select", ['error' => $conn->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database prepare error: ' . $conn->error], 500);
        exit;
    }

    $stmt->bind_param("i", $bookingId);
    if (!$stmt->execute()) {
        logError("Execute statement failed for select", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Failed to retrieve booking: ' . $stmt->error], 500);
        exit;
    }

    $result = $stmt->get_result();
    $booking = $result->fetch_assoc();

    if (!$booking) {
        logError("No booking found after insertion", ['booking_id' => $bookingId]);
        sendJsonResponse(['status' => 'error', 'message' => 'Booking was created but could not be retrieved'], 500);
        exit;
    }

    // Format the booking data for response
    $formattedBooking = [
        'id' => $booking['id'],
        'userId' => $booking['user_id'],
        'bookingNumber' => $booking['booking_number'],
        'pickupLocation' => $booking['pickup_location'],
        'dropLocation' => $booking['drop_location'],
        'pickupDate' => $booking['pickup_date'],
        'returnDate' => $booking['return_date'],
        'cabType' => $booking['cab_type'],
        'distance' => floatval($booking['distance']),
        'tripType' => $booking['trip_type'],
        'tripMode' => $booking['trip_mode'],
        'totalAmount' => floatval($booking['total_amount']),
        'status' => $booking['status'],
        'passengerName' => $booking['passenger_name'],
        'passengerPhone' => $booking['passenger_phone'],
        'passengerEmail' => $booking['passenger_email'],
        'createdAt' => $booking['created_at'],
        'updatedAt' => $booking['updated_at']
    ];

    // Send email notification
    $emailSent = sendBookingEmailNotification($formattedBooking, 'narendrakumarupwork@gmail.com');
    logError("Email notification status", [
        'sent' => $emailSent ? 'yes' : 'no', 
        'recipient' => $passengerEmail,
        'mail_enabled' => function_exists('mail') ? 'yes' : 'no'
    ]);

    // Send response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Booking created successfully',
        'data' => $formattedBooking,
        'emailSent' => $emailSent
    ], 201);

} catch (Exception $e) {
    logError("Exception occurred during booking", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()], 500);
}

// Helper function to safely get request headers across different server configurations
function getRequestHeaders() {
    if (function_exists('getallheaders')) {
        return getallheaders();
    }
    
    $headers = [];
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) == 'HTTP_') {
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            $headers[$name] = $value;
        } else if ($name == 'CONTENT_TYPE') {
            $headers['Content-Type'] = $value;
        } else if ($name == 'CONTENT_LENGTH') {
            $headers['Content-Length'] = $value;
        } else if ($name == 'AUTHORIZATION') {
            $headers['Authorization'] = $value;
        }
    }
    
    // Check for authorization in other locations
    if (!isset($headers['Authorization']) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers['Authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } else if (!isset($headers['Authorization']) && isset($_SERVER['PHP_AUTH_USER'])) {
        $basic_pass = isset($_SERVER['PHP_AUTH_PW']) ? $_SERVER['PHP_AUTH_PW'] : '';
        $headers['Authorization'] = 'Basic ' . base64_encode($_SERVER['PHP_AUTH_USER'] . ':' . $basic_pass);
    }
    
    return $headers;
}

/**
 * Send email notification for booking
 * 
 * @param array $booking
 * @param string $fromEmail
 * @return bool
 */
function sendBookingEmailNotification($booking, $fromEmail = 'narendrakumarupwork@gmail.com') {
    try {
        logError("Preparing email notification", [
            'booking_id' => $booking['id'],
            'to' => $booking['passengerEmail']
        ]);
        
        $to = $booking['passengerEmail'];
        $subject = "Your Cab Booking Confirmation - Booking #{$booking['bookingNumber']}";
        
        // Set important email headers for better deliverability
        $headers = [
            'From' => "Cab Booking <{$fromEmail}>",
            'Reply-To' => $fromEmail,
            'X-Mailer' => 'PHP/' . phpversion(),
            'MIME-Version' => '1.0',
            'Content-Type' => 'text/html; charset=UTF-8'
        ];
        
        // Build email headers string
        $headerString = '';
        foreach ($headers as $name => $value) {
            $headerString .= $name . ': ' . $value . "\r\n";
        }
        
        // Format date
        $formattedPickupDate = date('d M Y, h:i A', strtotime($booking['pickupDate']));
        
        // Create HTML email body
        $message = "
        <html>
        <head>
            <title>Booking Confirmation</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #3b82f6; color: white; padding: 15px; text-align: center; }
                .content { padding: 20px; border: 1px solid #ddd; }
                .booking-details { margin: 20px 0; }
                .detail-row { display: flex; margin-bottom: 10px; }
                .detail-label { font-weight: bold; width: 150px; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
                .amount { font-size: 18px; font-weight: bold; color: #3b82f6; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h2>Booking Confirmation</h2>
                </div>
                <div class='content'>
                    <p>Dear {$booking['passengerName']},</p>
                    <p>Thank you for booking with us. Your booking has been confirmed.</p>
                    
                    <div class='booking-details'>
                        <div class='detail-row'>
                            <div class='detail-label'>Booking Number:</div>
                            <div>{$booking['bookingNumber']}</div>
                        </div>
                        <div class='detail-row'>
                            <div class='detail-label'>Pickup Location:</div>
                            <div>{$booking['pickupLocation']}</div>
                        </div>";
        
        if (!empty($booking['dropLocation'])) {
            $message .= "
                        <div class='detail-row'>
                            <div class='detail-label'>Drop Location:</div>
                            <div>{$booking['dropLocation']}</div>
                        </div>";
        }
        
        $message .= "
                        <div class='detail-row'>
                            <div class='detail-label'>Pickup Date:</div>
                            <div>{$formattedPickupDate}</div>
                        </div>
                        <div class='detail-row'>
                            <div class='detail-label'>Cab Type:</div>
                            <div>{$booking['cabType']}</div>
                        </div>
                        <div class='detail-row'>
                            <div class='detail-label'>Trip Type:</div>
                            <div>{$booking['tripType']} ({$booking['tripMode']})</div>
                        </div>
                        <div class='detail-row'>
                            <div class='detail-label'>Amount:</div>
                            <div class='amount'>₹{$booking['totalAmount']}</div>
                        </div>
                    </div>
                    
                    <p>Our driver will contact you before the pickup time. For any queries, please contact our customer support.</p>
                    <p>We wish you a comfortable journey!</p>
                </div>
                <div class='footer'>
                    <p>This is an automated email, please do not reply to this message.</p>
                </div>
            </div>
        </body>
        </html>
        ";
        
        // Set additional parameters for the mail function
        $additionalParams = "-f " . $fromEmail;
        
        // Attempt to send email
        logError("Sending email", [
            'to' => $to,
            'subject' => $subject,
            'header_length' => strlen($headerString),
            'message_length' => strlen($message)
        ]);
        
        // Add error suppression operator to prevent mail() warnings from breaking JSON response
        $result = @mail($to, $subject, $message, $headerString, $additionalParams);
        
        logError("Email sending result", ['success' => $result ? 'yes' : 'no']);
        
        return $result;
    } catch (Exception $e) {
        logError("Email sending exception", ['error' => $e->getMessage()]);
        return false;
    }
}
