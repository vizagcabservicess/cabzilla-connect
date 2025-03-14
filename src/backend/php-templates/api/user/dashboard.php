
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
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Add CORS headers for all responses
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Log start of request processing
logError("Dashboard.php request initiated", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders(),
    'query' => $_GET
]);

try {
    // Check if this is an admin metrics request
    $isAdminMetricsRequest = isset($_GET['admin']) && $_GET['admin'] === 'true';
    
    // Get period filter if provided (today, week, month)
    $period = isset($_GET['period']) ? $_GET['period'] : 'week';
    
    // Authenticate user with improved logging
    $headers = getallheaders();
    logError("Request headers", ['headers' => $headers]);
    
    if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
        logError("Missing authorization header");
        sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
        exit;
    }
    
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $userData = authenticate();
    if (!$userData || !isset($userData['user_id'])) {
        logError("Authentication failed in dashboard.php", ['token' => substr($token, 0, 20) . '...']);
        sendJsonResponse(['status' => 'error', 'message' => 'Authentication failed'], 401);
        exit;
    }
    
    $userId = $userData['user_id'];
    $isAdmin = isset($userData['is_admin']) && $userData['is_admin'] === true;
    
    logError("User authenticated successfully", [
        'user_id' => $userId, 
        'is_admin' => $isAdmin ? 'true' : 'false',
        'token' => substr($token, 0, 20) . '...'
    ]);

    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        logError("Database connection failed in dashboard.php");
        throw new Exception('Database connection failed');
    }

    // If this is an admin metrics request and the user is an admin
    if ($isAdminMetricsRequest && $isAdmin) {
        logError("Processing admin metrics request", ['period' => $period]);
        
        // Get date range based on period
        $dateCondition = "";
        switch ($period) {
            case 'today':
                $dateCondition = "WHERE DATE(created_at) = CURDATE()";
                break;
            case 'week':
                $dateCondition = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                break;
            case 'month':
            default:
                $dateCondition = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
                break;
        }
        
        // Get total bookings for the period
        $totalBookingsQuery = "SELECT COUNT(*) as total FROM bookings $dateCondition";
        $totalBookingsResult = $conn->query($totalBookingsQuery);
        $totalBookings = $totalBookingsResult->fetch_assoc()['total'] ?? 0;
        
        // Get active rides (confirmed status with today's date)
        $activeRidesQuery = "SELECT COUNT(*) as total FROM bookings 
                             WHERE status = 'confirmed' 
                             AND DATE(pickup_date) = CURDATE()";
        $activeRidesResult = $conn->query($activeRidesQuery);
        $activeRides = $activeRidesResult->fetch_assoc()['total'] ?? 0;
        
        // Get total revenue for the period
        $totalRevenueQuery = "SELECT SUM(total_amount) as total FROM bookings $dateCondition";
        $totalRevenueResult = $conn->query($totalRevenueQuery);
        $totalRevenue = $totalRevenueResult->fetch_assoc()['total'] ?? 0;
        
        // Simulate driver metrics (in a real app, this would come from a drivers table)
        $availableDrivers = 12;
        $busyDrivers = 8;
        
        // Get average rating (simulated - would come from a ratings table)
        $avgRating = 4.7;
        
        // Get upcoming rides (pending/confirmed with future date)
        $upcomingRidesQuery = "SELECT COUNT(*) as total FROM bookings 
                               WHERE (status = 'pending' OR status = 'confirmed')
                               AND DATE(pickup_date) > CURDATE()";
        $upcomingRidesResult = $conn->query($upcomingRidesQuery);
        $upcomingRides = $upcomingRidesResult->fetch_assoc()['total'] ?? 0;
        
        // Prepare the metrics response
        $metrics = [
            'totalBookings' => (int)$totalBookings,
            'activeRides' => (int)$activeRides,
            'totalRevenue' => (float)$totalRevenue,
            'availableDrivers' => (int)$availableDrivers,
            'busyDrivers' => (int)$busyDrivers,
            'avgRating' => (float)$avgRating,
            'upcomingRides' => (int)$upcomingRides
        ];
        
        logError("Sending admin metrics response", ['metrics' => $metrics]);
        sendJsonResponse(['status' => 'success', 'data' => $metrics]);
        exit;
    }

    // Get user's bookings - adding more logging for debugging
    logError("Preparing to fetch bookings for user", ['user_id' => $userId]);

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

    // Debug: Log the SQL query for debugging
    logError("SQL Query executed", [
        'query' => "SELECT * FROM bookings WHERE user_id = {$userId} ORDER BY created_at DESC"
    ]);

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
            'driverName' => $row['driver_name'] ?? null,
            'driverPhone' => $row['driver_phone'] ?? null,
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? $row['created_at']
        ];
        $bookings[] = $booking;
    }

    // Log count of real bookings found
    logError("Real bookings found", ['count' => count($bookings), 'user_id' => $userId]);

    // Return empty array if no bookings found instead of providing demo data
    if (empty($bookings)) {
        logError("No bookings found, returning empty array");
    }

    // Ensure the response format is consistent
    $response = [
        'status' => 'success',
        'data' => $bookings
    ];
    
    logError("Sending response", ['response_size' => strlen(json_encode($response))]);
    echo json_encode($response);
    exit;
    
} catch (Exception $e) {
    logError("Exception in dashboard.php", [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    sendJsonResponse(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()], 500);
}
