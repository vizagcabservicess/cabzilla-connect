
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../config.php';

// Log the incoming request
logError("Book endpoint called", [
    'method' => $_SERVER['REQUEST_METHOD'], 
    'headers' => getAllHeaders(),
    'raw_input' => file_get_contents('php://input')
]);

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

// Set cache control headers
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

try {
    // Get the request body
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    logError("Booking request data", ['data' => $data]);

    // Validate required fields
    $requiredFields = [
        'pickupLocation', 'pickupDate', 'cabType', 'distance', 
        'tripType', 'tripMode', 'totalAmount', 
        'passengerName', 'passengerPhone', 'passengerEmail'
    ];

    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            sendJsonResponse(['status' => 'error', 'message' => "Field $field is required"], 400);
        }
    }

    // Get user ID if authenticated
    $userId = null;
    $headers = getAllHeaders();
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

    // Generate a unique booking number
    $bookingNumber = generateBookingNumber();

    // Prepare the SQL query with transactions for better reliability
    $conn->begin_transaction();

    try {
        $sql = "INSERT INTO bookings 
                (user_id, booking_number, pickup_location, drop_location, pickup_date, 
                return_date, cab_type, distance, trip_type, trip_mode, 
                total_amount, passenger_name, passenger_phone, passenger_email, 
                hourly_package, tour_id, status, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Database prepare error: " . $conn->error);
        }

        // Get values
        $pickupLocation = $data['pickupLocation'];
        $dropLocation = isset($data['dropLocation']) ? $data['dropLocation'] : null;
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

        $stmt->bind_param(
            "issssssdssdsssiss",
            $userId, $bookingNumber, $pickupLocation, $dropLocation, $pickupDate,
            $returnDate, $cabType, $distance, $tripType, $tripMode,
            $totalAmount, $passengerName, $passengerPhone, $passengerEmail,
            $hourlyPackage, $tourId, $status
        );

        if (!$stmt->execute()) {
            throw new Exception("Failed to execute booking query: " . $stmt->error);
        }

        $bookingId = $conn->insert_id;
        
        // Commit the transaction
        $conn->commit();
        
        logError("Booking created successfully", [
            'booking_id' => $bookingId, 
            'booking_number' => $bookingNumber, 
            'user_id' => $userId
        ]);

        // Get the created booking
        $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        if (!$stmt) {
            throw new Exception("Failed to prepare select query: " . $conn->error);
        }

        $stmt->bind_param("i", $bookingId);
        if (!$stmt->execute()) {
            throw new Exception("Failed to execute select query: " . $stmt->error);
        }

        $result = $stmt->get_result();
        $booking = $result->fetch_assoc();

        if (!$booking) {
            throw new Exception("Booking was created but could not be retrieved");
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

        // Send success response
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Booking created successfully',
            'data' => $formattedBooking
        ], 201);
        
    } catch (Exception $ex) {
        // Rollback transaction on error
        $conn->rollback();
        throw $ex;
    }
    
} catch (Exception $e) {
    logError("Error creating booking", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to create booking: ' . $e->getMessage()
    ], 500);
}
