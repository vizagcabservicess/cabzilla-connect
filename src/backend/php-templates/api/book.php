
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/utils/email.php';

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
    'headers' => getallheaders(),
    'request_uri' => $_SERVER['REQUEST_URI']
]);

// Get the request body
$data = json_decode(file_get_contents('php://input'), true);
logError("Booking request data", ['data' => $data]);

// Different validation rules based on trip type
$requiredFields = [
    'pickupLocation', 'pickupDate', 'cabType', 'tripType', 'tripMode', 'totalAmount', 
    'passengerName', 'passengerPhone', 'passengerEmail'
];

// Handle complex object structures for locations
if (isset($data['pickupLocation']) && is_array($data['pickupLocation'])) {
    // Extract the address from the location object
    if (isset($data['pickupLocation']['address'])) {
        $data['pickupLocation'] = $data['pickupLocation']['address'];
    } elseif (isset($data['pickupLocation']['name'])) {
        $data['pickupLocation'] = $data['pickupLocation']['name'];
    }
}

if (isset($data['dropLocation']) && is_array($data['dropLocation'])) {
    // Extract the address from the location object
    if (isset($data['dropLocation']['address'])) {
        $data['dropLocation'] = $data['dropLocation']['address'];
    } elseif (isset($data['dropLocation']['name'])) {
        $data['dropLocation'] = $data['dropLocation']['name'];
    }
}

// For local trips, don't require distance or dropLocation but set a default distance based on hourly package
if (isset($data['tripType']) && $data['tripType'] === 'local') {
    // Set default distance based on hourly package if missing
    if (!isset($data['distance']) || empty($data['distance']) || $data['distance'] == 0) {
        if (isset($data['hourlyPackage'])) {
            switch ($data['hourlyPackage']) {
                case '8hrs-80km':
                    $data['distance'] = 80;
                    break;
                case '10hrs-100km':
                    $data['distance'] = 100;
                    break;
                default:
                    $data['distance'] = 80; // Default to 80km if package not recognized
            }
            logError("Setting default distance for local trip", ['distance' => $data['distance'], 'package' => $data['hourlyPackage']]);
        } else {
            $data['distance'] = 80; // Default fallback
            logError("No package specified, using default distance", ['distance' => $data['distance']]);
        }
    }
} else {
    // For non-local trips, distance is required
    $requiredFields[] = 'distance';
    $requiredFields[] = 'dropLocation';
}

// Validate required fields
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
        logError("Missing required field", ['field' => $field]);
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
    
    // Log token for debugging
    logError("Auth token received", ['token_length' => strlen($token)]);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        
        // Verify user exists in the database
        $conn = getDbConnection();
        $checkUserStmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
        $checkUserStmt->bind_param("i", $userId);
        $checkUserStmt->execute();
        $userResult = $checkUserStmt->get_result();
        
        if ($userResult->num_rows === 0) {
            logError("User ID from token not found in database", ['user_id' => $userId]);
            // Don't set userId if user doesn't exist in db
            $userId = null;
        }
        
        logError("Authenticated booking", ['user_id' => $userId, 'verified' => ($userResult->num_rows > 0 ? 'yes' : 'no')]);
    } else {
        logError("Invalid token for booking", ['token_prefix' => substr($token, 0, 20) . '...']);
        // Continue with guest booking (user_id will be NULL)
    }
} else {
    // For debugging - log the headers we received
    logError("No authorization header found", ['headers' => array_keys($headers)]);
    // Continue with guest booking (user_id will be NULL)
}

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
logError("User ID for booking", ['user_id' => $userId, 'booking_number' => $bookingNumber]);

// Begin transaction for data consistency
$conn->begin_transaction();

try {
    // Check if the SQL needs user_id parameter
    if ($userId === null) {
        // SQL for guest booking (NULL user_id)
        $sql = "INSERT INTO bookings 
                (booking_number, pickup_location, drop_location, pickup_date, 
                 return_date, cab_type, distance, trip_type, trip_mode, 
                 total_amount, passenger_name, passenger_phone, passenger_email, 
                 hourly_package, tour_id, status, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
                
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        // Get values
        $pickupLocation = $data['pickupLocation'];
        $dropLocation = isset($data['dropLocation']) ? $data['dropLocation'] : '';
        $pickupDate = $data['pickupDate'];
        $returnDate = isset($data['returnDate']) ? $data['returnDate'] : null;
        $cabType = $data['cabType'];
        $distance = $data['distance']; 
        $tripType = $data['tripType'];
        $tripMode = $data['tripMode'];
        $totalAmount = $data['totalAmount'];
        $passengerName = $data['passengerName'];
        $passengerPhone = $data['passengerPhone'];
        $passengerEmail = $data['passengerEmail'];
        $hourlyPackage = isset($data['hourlyPackage']) ? $data['hourlyPackage'] : null;
        $tourId = isset($data['tourId']) ? $data['tourId'] : null;
        $status = 'pending'; // Default status for new bookings
        
        logError("Guest booking - binding values to SQL statement", [
            'booking_number' => $bookingNumber,
            'passenger_details' => $passengerName . ' / ' . $passengerPhone,
            'passenger_email' => $passengerEmail
        ]);
        
        $stmt->bind_param(
            "ssssssdssdsssiss",
            $bookingNumber, $pickupLocation, $dropLocation, $pickupDate,
            $returnDate, $cabType, $distance, $tripType, $tripMode,
            $totalAmount, $passengerName, $passengerPhone, $passengerEmail,
            $hourlyPackage, $tourId, $status
        );
    } else {
        // SQL for authenticated user booking
        $sql = "INSERT INTO bookings 
                (user_id, booking_number, pickup_location, drop_location, pickup_date, 
                 return_date, cab_type, distance, trip_type, trip_mode, 
                 total_amount, passenger_name, passenger_phone, passenger_email, 
                 hourly_package, tour_id, status, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
                
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        // Get values
        $pickupLocation = $data['pickupLocation'];
        $dropLocation = isset($data['dropLocation']) ? $data['dropLocation'] : '';
        $pickupDate = $data['pickupDate'];
        $returnDate = isset($data['returnDate']) ? $data['returnDate'] : null;
        $cabType = $data['cabType'];
        $distance = $data['distance']; 
        $tripType = $data['tripType'];
        $tripMode = $data['tripMode'];
        $totalAmount = $data['totalAmount'];
        $passengerName = $data['passengerName'];
        $passengerPhone = $data['passengerPhone'];
        $passengerEmail = $data['passengerEmail'];
        $hourlyPackage = isset($data['hourlyPackage']) ? $data['hourlyPackage'] : null;
        $tourId = isset($data['tourId']) ? $data['tourId'] : null;
        $status = 'pending'; // Default status for new bookings
        
        logError("Authenticated booking - binding values to SQL statement", [
            'user_id' => $userId,
            'booking_number' => $bookingNumber,
            'passenger_details' => $passengerName . ' / ' . $passengerPhone,
            'passenger_email' => $passengerEmail
        ]);
        
        $stmt->bind_param(
            "issssssdssdsssiss",
            $userId, $bookingNumber, $pickupLocation, $dropLocation, $pickupDate,
            $returnDate, $cabType, $distance, $tripType, $tripMode,
            $totalAmount, $passengerName, $passengerPhone, $passengerEmail,
            $hourlyPackage, $tourId, $status
        );
    }

    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }

    $bookingId = $conn->insert_id;
    logError("Booking created", ['booking_id' => $bookingId, 'booking_number' => $bookingNumber, 'user_id' => $userId]);

    // Get the created booking
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    if (!$stmt) {
        throw new Exception("Prepare statement failed for select: " . $conn->error);
    }

    $stmt->bind_param("i", $bookingId);
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed for select: " . $stmt->error);
    }

    $result = $stmt->get_result();
    $booking = $result->fetch_assoc();

    if (!$booking) {
        throw new Exception("No booking found after insertion");
    }

    // Commit the transaction
    $conn->commit();

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
    
    // Send confirmation emails with detailed error logging
    logError("Attempting to send confirmation emails", [
        'booking_id' => $bookingId,
        'passenger_email' => $booking['passenger_email']
    ]);
    
    // Initialize email results array
    $emailSuccess = ['customer' => false, 'admin' => false];
    
    // Wrap email sending in try-catch for better error handling
    try {
        $emailSuccess['customer'] = sendBookingConfirmationEmail($formattedBooking);
        logError("Customer email sending attempt completed", [
            'result' => $emailSuccess['customer'] ? 'success' : 'failed',
            'email' => $booking['passenger_email']
        ]);
    } catch (Exception $e) {
        logError("Exception while sending customer email", [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        $emailSuccess['customer'] = false;
    }
    
    try {
        $emailSuccess['admin'] = sendAdminNotificationEmail($formattedBooking);
        logError("Admin email sending attempt completed", [
            'result' => $emailSuccess['admin'] ? 'success' : 'failed'
        ]);
    } catch (Exception $e) {
        logError("Exception while sending admin email", [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        $emailSuccess['admin'] = false;
    }
    
    logError("Email sending results", [
        'customer_email_sent' => $emailSuccess['customer'] ? 'yes' : 'no',
        'admin_email_sent' => $emailSuccess['admin'] ? 'yes' : 'no',
        'booking_id' => $bookingId
    ]);

    // Send response including email status
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Booking created successfully',
        'data' => $formattedBooking,
        'emailSent' => $emailSuccess['customer'],
        'adminEmailSent' => $emailSuccess['admin']
    ], 201);

} catch (Exception $e) {
    // Roll back the transaction on error
    $conn->rollback();
    
    logError("Booking creation failed", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'data' => $data
    ]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to create booking: ' . $e->getMessage()
    ], 500);
}
