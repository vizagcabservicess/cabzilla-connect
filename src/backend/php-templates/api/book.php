
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
        logError("Prepare statement failed", ['error' => $conn->error, 'sql' => $sql]);
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
