
<?php
require_once '../config.php';

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Get the request body
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$requiredFields = [
    'pickupLocation', 'pickupDate', 'cabType', 'distance', 
    'tripType', 'tripMode', 'totalAmount', 
    'passengerName', 'passengerPhone', 'passengerEmail'
];

foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        sendJsonResponse(['error' => "Field $field is required"], 400);
    }
}

// Get user ID if authenticated
$userId = null;
$headers = getallheaders();
if (isset($headers['Authorization'])) {
    $authHeader = $headers['Authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
    }
}

// Connect to database
$conn = getDbConnection();

// Generate a unique booking number
$bookingNumber = generateBookingNumber();

// Prepare the SQL query
$sql = "INSERT INTO bookings 
        (user_id, booking_number, pickup_location, drop_location, pickup_date, 
         return_date, cab_type, distance, trip_type, trip_mode, 
         total_amount, passenger_name, passenger_phone, passenger_email, 
         hourly_package, tour_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

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

$stmt->bind_param(
    "issssssdssdsssss",
    $userId, $bookingNumber, $pickupLocation, $dropLocation, $pickupDate,
    $returnDate, $cabType, $distance, $tripType, $tripMode,
    $totalAmount, $passengerName, $passengerPhone, $passengerEmail,
    $hourlyPackage, $tourId
);

if (!$stmt->execute()) {
    sendJsonResponse(['error' => 'Failed to create booking: ' . $stmt->error], 500);
}

$bookingId = $conn->insert_id;

// Get the created booking
$stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
$stmt->bind_param("i", $bookingId);
$stmt->execute();
$result = $stmt->get_result();
$booking = $result->fetch_assoc();

// Send response
sendJsonResponse([
    'success' => true,
    'message' => 'Booking created successfully',
    'booking' => $booking
], 201);
