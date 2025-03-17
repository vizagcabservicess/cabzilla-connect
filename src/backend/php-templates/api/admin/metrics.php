
<?php
// Include the configuration file
require_once __DIR__ . '/../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Log request for debugging
logError("Admin metrics request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'query' => $_SERVER['QUERY_STRING']
]);

// Check authentication
$headers = getallheaders();
if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
    logError("Missing authorization header in admin metrics");
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
    exit;
}

$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
$token = str_replace('Bearer ', '', $authHeader);

$userData = verifyJwtToken($token);
if (!$userData || !isset($userData['user_id'])) {
    logError("Authentication failed in admin metrics");
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid or expired token'], 401);
    exit;
}

// Check if user is admin
$isAdmin = isset($userData['role']) && $userData['role'] === 'admin';
if (!$isAdmin) {
    logError("Non-admin attempted to access admin metrics", ['user_id' => $userData['user_id']]);
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized access'], 403);
    exit;
}

// Get period from query parameter
$period = 'week'; // Default to week
if (isset($_GET['period'])) {
    $validPeriods = ['today', 'week', 'month'];
    $requestedPeriod = $_GET['period'];
    
    if (in_array($requestedPeriod, $validPeriods)) {
        $period = $requestedPeriod;
    }
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    logError("Database connection failed in admin metrics");
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Define date range based on period
    $dateRange = '';
    if ($period === 'today') {
        $dateRange = "DATE(created_at) = CURDATE()";
    } elseif ($period === 'week') {
        $dateRange = "created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    } elseif ($period === 'month') {
        $dateRange = "created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    }
    
    // Get total bookings
    $sql = "SELECT COUNT(*) as total FROM bookings WHERE $dateRange";
    $result = $conn->query($sql);
    $totalBookings = $result->fetch_assoc()['total'];
    
    // Get booking statistics by status
    $sql = "SELECT status, COUNT(*) as count FROM bookings WHERE $dateRange GROUP BY status";
    $result = $conn->query($sql);
    $statusStats = [];
    while ($row = $result->fetch_assoc()) {
        $statusStats[$row['status']] = intval($row['count']);
    }
    
    // Get booking statistics by trip type
    $sql = "SELECT trip_type, COUNT(*) as count FROM bookings WHERE $dateRange GROUP BY trip_type";
    $result = $conn->query($sql);
    $tripTypeStats = [];
    while ($row = $result->fetch_assoc()) {
        $tripTypeStats[$row['trip_type']] = intval($row['count']);
    }
    
    // Get total revenue
    $sql = "SELECT SUM(total_amount) as total_revenue FROM bookings WHERE $dateRange";
    $result = $conn->query($sql);
    $totalRevenue = floatval($result->fetch_assoc()['total_revenue'] ?: 0);
    
    // Get daily revenue for the period
    $sql = "SELECT DATE(created_at) as date, SUM(total_amount) as daily_revenue FROM bookings 
            WHERE $dateRange GROUP BY DATE(created_at) ORDER BY date";
    $result = $conn->query($sql);
    $revenueByDay = [];
    while ($row = $result->fetch_assoc()) {
        $revenueByDay[] = [
            'date' => $row['date'],
            'revenue' => floatval($row['daily_revenue'])
        ];
    }
    
    // Get most popular cab types
    $sql = "SELECT cab_type, COUNT(*) as count FROM bookings WHERE $dateRange GROUP BY cab_type ORDER BY count DESC";
    $result = $conn->query($sql);
    $popularCabs = [];
    while ($row = $result->fetch_assoc()) {
        $popularCabs[] = [
            'cab_type' => $row['cab_type'],
            'count' => intval($row['count'])
        ];
    }
    
    // Get recent bookings
    $sql = "SELECT id, booking_number, passenger_name, pickup_location, drop_location, pickup_date, cab_type, 
            total_amount, status, created_at 
            FROM bookings WHERE $dateRange ORDER BY created_at DESC LIMIT 5";
    $result = $conn->query($sql);
    $recentBookings = [];
    while ($row = $result->fetch_assoc()) {
        $recentBookings[] = [
            'id' => $row['id'],
            'bookingNumber' => $row['booking_number'],
            'passengerName' => $row['passenger_name'],
            'pickupLocation' => $row['pickup_location'],
            'dropLocation' => $row['drop_location'],
            'pickupDate' => $row['pickup_date'],
            'cabType' => $row['cab_type'],
            'totalAmount' => floatval($row['total_amount']),
            'status' => $row['status'],
            'createdAt' => $row['created_at']
        ];
    }
    
    // Send success response
    sendJsonResponse([
        'status' => 'success',
        'data' => [
            'period' => $period,
            'totalBookings' => $totalBookings,
            'totalRevenue' => $totalRevenue,
            'statusStats' => $statusStats,
            'tripTypeStats' => $tripTypeStats,
            'revenueByDay' => $revenueByDay,
            'popularCabs' => $popularCabs,
            'recentBookings' => $recentBookings
        ]
    ]);
    
} catch (Exception $e) {
    logError("Error retrieving admin metrics", [
        'error' => $e->getMessage(),
        'period' => $period
    ]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to retrieve admin metrics: ' . $e->getMessage()
    ], 500);
}
