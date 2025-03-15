
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Authenticate user
$userData = authenticate();
$userId = $userData['user_id'];

// Connect to database
$conn = getDbConnection();

// Log for debugging
logError("Fetching bookings for user", ['user_id' => $userId]);

// Get user's bookings
$stmt = $conn->prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if (!$result) {
    logError("Database error", ['error' => $conn->error]);
    sendJsonResponse(['error' => 'Database error: ' . $conn->error], 500);
}

$bookings = [];
while ($row = $result->fetch_assoc()) {
    // Ensure all required fields are present
    $booking = [
        'id' => $row['id'],
        'userId' => $row['user_id'],
        'bookingNumber' => $row['booking_number'] ?? ('BK' . rand(10000, 99999)),
        'pickupLocation' => $row['pickup_location'],
        'dropLocation' => $row['drop_location'],
        'pickupDate' => $row['pickup_date'],
        'returnDate' => $row['return_date'] ?? null,
        'cabType' => $row['cab_type'] ?? 'Sedan',
        'distance' => floatval($row['distance'] ?? 0),
        'tripType' => $row['trip_type'] ?? 'local',
        'tripMode' => $row['trip_mode'] ?? 'one-way',
        'totalAmount' => floatval($row['total_amount'] ?? 0),
        'status' => $row['status'] ?? 'pending',
        'passengerName' => $row['passenger_name'] ?? $userData['name'],
        'passengerPhone' => $row['passenger_phone'] ?? '',
        'passengerEmail' => $row['passenger_email'] ?? $userData['email'],
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'] ?? $row['created_at']
    ];
    $bookings[] = $booking;
}

// If no bookings found, provide sample data for demo purposes
if (empty($bookings)) {
    // Create sample booking data
    $bookings = [
        [
            'id' => 1,
            'userId' => $userId,
            'bookingNumber' => 'BK' . rand(10000, 99999),
            'pickupLocation' => 'Airport, Visakhapatnam',
            'dropLocation' => 'Vijayawada, Andhra Pradesh',
            'pickupDate' => date('Y-m-d H:i:s', strtotime('+2 days')),
            'returnDate' => null,
            'cabType' => 'Sedan',
            'distance' => 349,
            'tripType' => 'outstation',
            'tripMode' => 'one-way',
            'totalAmount' => 5140,
            'status' => 'confirmed',
            'passengerName' => $userData['name'],
            'passengerPhone' => '9550099336',
            'passengerEmail' => $userData['email'],
            'createdAt' => date('Y-m-d H:i:s', strtotime('-1 day')),
            'updatedAt' => date('Y-m-d H:i:s')
        ],
        [
            'id' => 2,
            'userId' => $userId,
            'bookingNumber' => 'BK' . rand(10000, 99999),
            'pickupLocation' => 'Rushikonda Beach',
            'dropLocation' => 'RK Beach',
            'pickupDate' => date('Y-m-d H:i:s', strtotime('+1 week')),
            'returnDate' => null,
            'cabType' => 'SUV',
            'distance' => 15,
            'tripType' => 'local',
            'tripMode' => 'one-way',
            'totalAmount' => 1200,
            'status' => 'pending',
            'passengerName' => $userData['name'],
            'passengerPhone' => '9550099336',
            'passengerEmail' => $userData['email'],
            'createdAt' => date('Y-m-d H:i:s', strtotime('-2 days')),
            'updatedAt' => date('Y-m-d H:i:s')
        ]
    ];
    
    logError("No bookings found, providing sample data", ['count' => count($bookings)]);
}

// Log for debugging
logError("Retrieved bookings", ['count' => count($bookings)]);

// Send response
sendJsonResponse($bookings);
