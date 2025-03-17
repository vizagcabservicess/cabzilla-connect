
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
$jsonData = file_get_contents('php://input');
logError("Raw request data", ['json' => $jsonData]);

$data = json_decode($jsonData, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    logError("JSON parsing error", ['error' => json_last_error_msg()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid JSON data: ' . json_last_error_msg()], 400);
    exit;
}

logError("Booking request data parsed", ['data' => $data]);

// Different validation rules based on trip type
$requiredFields = [
    'pickupLocation', 'pickupDate', 'cabType', 'tripType', 'tripMode', 'totalAmount', 
    'passengerName', 'passengerPhone', 'passengerEmail'
];

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
        'message' => "Required fields are missing: " . implode(', ', $missingFields)
    ], 400);
    exit;
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

// Begin transaction for data consistency
try {
    $conn->begin_transaction();

    // Sanitize and prepare data
    $pickupLocation = $conn->real_escape_string($data['pickupLocation']);
    $dropLocation = isset($data['dropLocation']) ? $conn->real_escape_string($data['dropLocation']) : '';
    $pickupDate = $conn->real_escape_string($data['pickupDate']);
    $returnDate = isset($data['returnDate']) ? $conn->real_escape_string($data['returnDate']) : null;
    $cabType = $conn->real_escape_string($data['cabType']);
    $distance = floatval($data['distance']); 
    $tripType = $conn->real_escape_string($data['tripType']);
    $tripMode = $conn->real_escape_string($data['tripMode']);
    $totalAmount = floatval($data['totalAmount']);
    $passengerName = $conn->real_escape_string($data['passengerName']);
    $passengerPhone = $conn->real_escape_string($data['passengerPhone']);
    $passengerEmail = $conn->real_escape_string($data['passengerEmail']);
    $hourlyPackage = isset($data['hourlyPackage']) ? $conn->real_escape_string($data['hourlyPackage']) : null;
    $tourId = isset($data['tourId']) ? intval($data['tourId']) : null;
    $status = 'pending'; // Default status for new bookings

    // Log prepared data
    logError("Prepared data for insertion", [
        'pickupLocation' => $pickupLocation,
        'dropLocation' => $dropLocation,
        'pickupDate' => $pickupDate,
        'returnDate' => $returnDate,
        'cabType' => $cabType,
        'distance' => $distance,
        'tripType' => $tripType,
        'tripMode' => $tripMode,
        'totalAmount' => $totalAmount,
        'hourlyPackage' => $hourlyPackage,
        'tourId' => $tourId
    ]);

    // Prepare the SQL query
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

    logError("SQL prepared", ['sql' => $sql]);

    $stmt->bind_param(
        "issssssdssdsssiss",
        $userId, $bookingNumber, $pickupLocation, $dropLocation, $pickupDate,
        $returnDate, $cabType, $distance, $tripType, $tripMode,
        $totalAmount, $passengerName, $passengerPhone, $passengerEmail,
        $hourlyPackage, $tourId, $status
    );

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

    // Send response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Booking created successfully',
        'data' => $formattedBooking
    ], 201);

} catch (Exception $e) {
    // Roll back the transaction on error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    logError("Booking creation failed", [
        'error' => $e->getMessage(),
        'data' => $data,
        'trace' => $e->getTraceAsString()
    ]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to create booking: ' . $e->getMessage()
    ], 500);
}
