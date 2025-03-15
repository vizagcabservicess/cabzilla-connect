
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    // Add CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Add CORS headers for all responses
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Log start of request processing
logError("Dashboard.php request initiated", ['method' => $_SERVER['REQUEST_METHOD'], 'headers' => getallheaders()]);

try {
    // Authenticate user
    $userData = authenticate();
    if (!$userData || !isset($userData['user_id'])) {
        logError("Authentication failed in dashboard.php", ['headers' => getallheaders()]);
        http_response_code(401);
        echo json_encode(['error' => 'Authentication failed']);
        exit;
    }
    
    $userId = $userData['user_id'];
    logError("User authenticated successfully", ['user_id' => $userId]);

    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        logError("Database connection failed in dashboard.php");
        throw new Exception('Database connection failed');
    }

    // Log for debugging
    logError("Fetching bookings for user", ['user_id' => $userId]);

    // Get user's bookings
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC");
    if (!$stmt) {
        logError("Prepare statement failed", ['error' => $conn->error]);
        throw new Exception('Database prepare error: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $userId);
    $executed = $stmt->execute();
    
    if (!$executed) {
        logError("Execute statement failed", ['error' => $stmt->error]);
        throw new Exception('Database execute error: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if (!$result) {
        logError("Get result failed", ['error' => $stmt->error]);
        throw new Exception('Database result error: ' . $stmt->error);
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

    // Log count of real bookings found
    logError("Real bookings found", ['count' => count($bookings)]);

    // Always provide sample data for demo purposes
    if (empty($bookings)) {
        // Create sample booking data with current user ID
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
            ],
            [
                'id' => 3,
                'userId' => $userId,
                'bookingNumber' => 'BK' . rand(10000, 99999),
                'pickupLocation' => 'Araku Valley',
                'dropLocation' => 'Visakhapatnam',
                'pickupDate' => date('Y-m-d H:i:s', strtotime('-3 days')),
                'returnDate' => null,
                'cabType' => 'Innova',
                'distance' => 115,
                'tripType' => 'outstation',
                'tripMode' => 'one-way',
                'totalAmount' => 3200,
                'status' => 'completed',
                'passengerName' => $userData['name'],
                'passengerPhone' => '9550099336',
                'passengerEmail' => $userData['email'],
                'createdAt' => date('Y-m-d H:i:s', strtotime('-5 days')),
                'updatedAt' => date('Y-m-d H:i:s', strtotime('-3 days'))
            ]
        ];
        
        logError("No bookings found, providing sample data", ['count' => count($bookings)]);
    }

    // Send response with proper JSON content type
    echo json_encode(['status' => 'success', 'data' => $bookings]);
    exit;
    
} catch (Exception $e) {
    logError("Exception in dashboard.php", [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    
    // Send error response with proper JSON content type
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit;
}
