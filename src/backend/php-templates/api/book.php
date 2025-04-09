
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/utils/database.php';

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

// Ensure correct Content-Type
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    http_response_code(405);
    exit;
}

// Log request data for debugging
error_log("Book.php request initiated: " . json_encode([
    'method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI'],
    'server_info' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
]));

// Get the request body
$data = json_decode(file_get_contents('php://input'), true);
error_log("Booking request data: " . json_encode($data));

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
            error_log("Setting default distance for local trip: " . $data['distance']);
        } else {
            $data['distance'] = 80; // Default fallback
            error_log("No package specified, using default distance: 80");
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
        error_log("Missing required field: " . $field);
        echo json_encode(['status' => 'error', 'message' => "Field $field is required"]);
        http_response_code(400);
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
    error_log("Auth token received: " . substr($token, 0, 20) . '...');
    
    if (function_exists('verifyJwtToken')) {
        $payload = verifyJwtToken($token);
        if ($payload && isset($payload['user_id'])) {
            $userId = $payload['user_id'];
            error_log("Authenticated booking for user: " . $userId);
        }
    }
}

// Connect to database with retry
try {
    $conn = getDbConnectionWithRetry(3);
    
    if (!$conn) {
        throw new Exception("Failed to establish database connection after multiple attempts");
    }
    
    // Ensure bookings table exists
    if (!ensureBookingsTableExists($conn)) {
        throw new Exception("Failed to ensure bookings table exists");
    }
} catch (Exception $e) {
    error_log("Database connection failed: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
    http_response_code(500);
    exit;
}

// Generate a unique booking number
$prefix = 'CB';
$timestamp = time();
$random = mt_rand(1000, 9999);
$bookingNumber = $prefix . $timestamp . $random;

// Debug log the user ID
error_log("User ID for booking: " . ($userId ?? 'guest') . ", booking number: " . $bookingNumber);

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
                 hourly_package, tour_id, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
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
        
        error_log("Guest booking - binding values to SQL statement: " . $bookingNumber);
        
        $stmt->bind_param(
            "ssssssdssdsssss",
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
                 hourly_package, tour_id, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
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
        
        error_log("Authenticated booking - binding values to SQL statement for user ID: " . $userId);
        
        $stmt->bind_param(
            "issssssdssdsssss",
            $userId, $bookingNumber, $pickupLocation, $dropLocation, $pickupDate,
            $returnDate, $cabType, $distance, $tripType, $tripMode,
            $totalAmount, $passengerName, $passengerPhone, $passengerEmail,
            $hourlyPackage, $tourId, $status
        );
    }

    error_log("About to execute SQL statement");
    
    if (!$stmt->execute()) {
        throw new Exception("Execute statement failed: " . $stmt->error);
    }

    $bookingId = $conn->insert_id;
    error_log("Booking created successfully: ID=" . $bookingId . ", Number=" . $bookingNumber);

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
        'id' => (int)$booking['id'],
        'userId' => $booking['user_id'] ? (int)$booking['user_id'] : null,
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

    // Send successful response
    echo json_encode([
        'status' => 'success',
        'message' => 'Booking created successfully',
        'data' => $formattedBooking
    ]);
    http_response_code(201);

} catch (Exception $e) {
    // Roll back the transaction on error
    $conn->rollback();
    
    error_log("Booking creation failed: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to create booking: ' . $e->getMessage()
    ]);
    http_response_code(500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
