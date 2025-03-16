
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Add CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Log request data for debugging
logError("Book.php request initiated", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders()
]);

// Get the request body
$data = json_decode(file_get_contents('php://input'), true);
logError("Booking request data", ['data' => $data]);

// Validate required fields
$requiredFields = [
    'pickupLocation', 'cabType', 
    'tripType', 'tripMode', 'totalAmount', 
    'passengerName', 'passengerPhone', 'passengerEmail'
];

foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        sendJsonResponse(['status' => 'error', 'message' => "Field $field is required"], 400);
        exit;
    }
}

// Get user ID if authenticated
$userId = null;
$headers = getallheaders();
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
    // For debugging - log the headers we received
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
    logError("User ID for booking", ['user_id' => $userId]);

    // Prepare the SQL query - make distance nullable
    $sql = "INSERT INTO bookings 
            (user_id, booking_number, pickup_location, drop_location, pickup_date, 
            return_date, cab_type, distance, trip_type, trip_mode, 
            total_amount, passenger_name, passenger_phone, passenger_email, 
            hourly_package, tour_id, status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        logError("Prepare statement failed", ['error' => $conn->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Database prepare error: ' . $conn->error], 500);
        exit;
    }

    // Get values and sanitize/validate them
    $pickupLocation = trim($data['pickupLocation']);
    $dropLocation = isset($data['dropLocation']) ? trim($data['dropLocation']) : null;
    $pickupDate = trim($data['pickupDate']);
    $returnDate = isset($data['returnDate']) ? trim($data['returnDate']) : null;
    $cabType = trim($data['cabType']);
    $distance = isset($data['distance']) ? floatval($data['distance']) : 0;
    $tripType = trim($data['tripType']);
    $tripMode = trim($data['tripMode']);
    $totalAmount = floatval($data['totalAmount']);
    $passengerName = trim($data['passengerName']);
    $passengerPhone = trim($data['passengerPhone']);
    $passengerEmail = trim($data['passengerEmail']);
    $hourlyPackage = isset($data['hourlyPackage']) ? trim($data['hourlyPackage']) : null;
    $tourId = isset($data['tourId']) ? trim($data['tourId']) : null;
    $status = 'pending'; // Default status for new bookings
    
    // Log the sanitized data
    logError("Sanitized booking data", [
        'pickup' => $pickupLocation,
        'dropoff' => $dropLocation,
        'pickup_date' => $pickupDate,
        'total' => $totalAmount
    ]);

    $stmt->bind_param(
        "issssssdssdsssiss",
        $userId, $bookingNumber, $pickupLocation, $dropLocation, $pickupDate,
        $returnDate, $cabType, $distance, $tripType, $tripMode,
        $totalAmount, $passengerName, $passengerPhone, $passengerEmail,
        $hourlyPackage, $tourId, $status
    );

    if (!$stmt->execute()) {
        logError("Execute statement failed", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Failed to create booking: ' . $stmt->error], 500);
        exit;
    }

    $bookingId = $conn->insert_id;
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
    $emailSent = sendBookingEmailNotification($formattedBooking);
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

// Enhanced email notification function with improved error handling and direct mail configuration
function sendBookingEmailNotification($booking) {
    try {
        // Log the attempt
        logError("Attempting to send booking confirmation email", [
            'booking_id' => $booking['id'], 
            'booking_number' => $booking['bookingNumber'],
            'email' => $booking['passengerEmail']
        ]);
        
        // Check if mail function exists
        if (!function_exists('mail')) {
            logError("PHP mail function not available");
            return false;
        }
        
        $to = $booking['passengerEmail'];
        $subject = "Booking Confirmation - #" . $booking['bookingNumber'];
        
        // Create a nice HTML email
        $message = "
        <html>
        <head>
            <title>Booking Confirmation</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4a90e2; color: white; padding: 10px 20px; }
                .content { padding: 20px; border: 1px solid #ddd; }
                .footer { font-size: 12px; color: #777; margin-top: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h2>Booking Confirmation</h2>
                </div>
                <div class='content'>
                    <p>Dear {$booking['passengerName']},</p>
                    <p>Thank you for booking with us. Your booking has been confirmed with the following details:</p>
                    
                    <table>
                        <tr>
                            <th>Booking Number</th>
                            <td>#{$booking['bookingNumber']}</td>
                        </tr>
                        <tr>
                            <th>Pickup Location</th>
                            <td>{$booking['pickupLocation']}</td>
                        </tr>";
        
        if (!empty($booking['dropLocation'])) {
            $message .= "
                        <tr>
                            <th>Drop Location</th>
                            <td>{$booking['dropLocation']}</td>
                        </tr>";
        }
        
        $message .= "
                        <tr>
                            <th>Pickup Date/Time</th>
                            <td>" . date('Y-m-d h:i A', strtotime($booking['pickupDate'])) . "</td>
                        </tr>
                        <tr>
                            <th>Vehicle Type</th>
                            <td>{$booking['cabType']}</td>
                        </tr>
                        <tr>
                            <th>Trip Type</th>
                            <td>" . ucfirst($booking['tripType']) . " - " . ucfirst($booking['tripMode']) . "</td>
                        </tr>
                        <tr>
                            <th>Amount</th>
                            <td>₹" . number_format($booking['totalAmount'], 2) . "</td>
                        </tr>
                        <tr>
                            <th>Status</th>
                            <td>" . ucfirst($booking['status']) . "</td>
                        </tr>
                    </table>
                    
                    <p>We will assign a driver shortly and update you with their details before pickup time.</p>
                    <p>For any changes or inquiries, please contact our customer support.</p>
                    
                    <p>Thank you for choosing our service!</p>
                </div>
                <div class='footer'>
                    <p>This is an automated email. Please do not reply to this message.</p>
                </div>
            </div>
        </body>
        </html>";
        
        // To send HTML mail, the Content-type header must be set
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: CabBooking <noreply@' . $_SERVER['HTTP_HOST'] . '>' . "\r\n";
        $headers .= 'Reply-To: noreply@' . $_SERVER['HTTP_HOST'] . "\r\n";
        
        // Add detailed logging before sending
        logError("Email content ready to send", [
            'to' => $to,
            'subject' => $subject,
            'headers' => $headers,
            'message_length' => strlen($message)
        ]);
        
        // Attempt to send the email with better error capture
        $mailSent = @mail($to, $subject, $message, $headers);
        $mailError = error_get_last();
        
        // If mail fails, try using a different From header
        if (!$mailSent) {
            logError("First mail attempt failed, trying with different headers", [
                'error' => $mailError
            ]);
            
            // Try with a simpler header
            $altHeaders = "MIME-Version: 1.0" . "\r\n";
            $altHeaders .= "Content-type:text/html;charset=UTF-8" . "\r\n";
            $altHeaders .= 'From: booking@example.com' . "\r\n";
            
            $mailSent = @mail($to, $subject, $message, $altHeaders);
            $mailError = error_get_last();
        }
        
        logError("Email sending final result", [
            'sent' => $mailSent ? 'success' : 'failed',
            'to' => $to,
            'subject' => $subject,
            'php_error' => $mailError
        ]);
        
        return $mailSent;
    } catch (Exception $e) {
        logError("Exception in sendBookingEmailNotification", [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}
