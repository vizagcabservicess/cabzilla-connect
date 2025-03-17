
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Get admin user ID from JWT token
$headers = getallheaders();
$userId = null;
$isAdmin = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        
        // Check if user is admin
        $conn = getDbConnection();
        if ($conn) {
            $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $isAdmin = ($row['role'] === 'admin');
            }
        }
    }
}

// Only allow admin users to access this endpoint
if (!$isAdmin) {
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized access'], 401);
    exit;
}

// Get the period from query parameters with validation
$validPeriods = ['today', 'week', 'month'];
$period = isset($_GET['period']) ? $_GET['period'] : 'today';

if (!in_array($period, $validPeriods)) {
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid period parameter'], 400);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

// Calculate date ranges based on period
$today = date('Y-m-d');
$startDate = '';
$endDate = $today . ' 23:59:59';

switch ($period) {
    case 'today':
        $startDate = $today . ' 00:00:00';
        break;
    case 'week':
        $startDate = date('Y-m-d', strtotime('-7 days')) . ' 00:00:00';
        break;
    case 'month':
        $startDate = date('Y-m-d', strtotime('-30 days')) . ' 00:00:00';
        break;
}

try {
    // Total bookings count for the period
    $stmt = $conn->prepare("SELECT COUNT(*) as total_bookings FROM bookings WHERE created_at BETWEEN ? AND ?");
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $totalBookings = $stmt->get_result()->fetch_assoc()['total_bookings'];
    
    // Total revenue for the period
    $stmt = $conn->prepare("SELECT SUM(total_amount) as total_revenue FROM bookings WHERE created_at BETWEEN ? AND ?");
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $totalRevenue = $stmt->get_result()->fetch_assoc()['total_revenue'] ?: 0;
    
    // Bookings by status
    $bookingsByStatus = [];
    $stmt = $conn->prepare("SELECT status, COUNT(*) as count FROM bookings WHERE created_at BETWEEN ? AND ? GROUP BY status");
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $bookingsByStatus[$row['status']] = (int)$row['count'];
    }
    
    // Bookings by trip type
    $bookingsByTripType = [];
    $stmt = $conn->prepare("SELECT trip_type, COUNT(*) as count FROM bookings WHERE created_at BETWEEN ? AND ? GROUP BY trip_type");
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $bookingsByTripType[$row['trip_type']] = (int)$row['count'];
    }
    
    // Bookings by cab type
    $bookingsByCabType = [];
    $stmt = $conn->prepare("SELECT cab_type, COUNT(*) as count FROM bookings WHERE created_at BETWEEN ? AND ? GROUP BY cab_type");
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $bookingsByCabType[$row['cab_type']] = (int)$row['count'];
    }
    
    // Recent bookings
    $recentBookings = [];
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 5");
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $recentBookings[] = [
            'id' => $row['id'],
            'bookingNumber' => $row['booking_number'],
            'passengerName' => $row['passenger_name'],
            'pickupLocation' => $row['pickup_location'],
            'dropLocation' => $row['drop_location'],
            'pickupDate' => $row['pickup_date'],
            'status' => $row['status'],
            'totalAmount' => (float)$row['total_amount'],
            'createdAt' => $row['created_at']
        ];
    }
    
    // Daily revenue data for charts
    $dailyRevenue = [];
    $daysToFetch = ($period === 'today') ? 1 : (($period === 'week') ? 7 : 30);
    
    for ($i = 0; $i < $daysToFetch; $i++) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $dayStart = $date . ' 00:00:00';
        $dayEnd = $date . ' 23:59:59';
        
        $stmt = $conn->prepare("SELECT SUM(total_amount) as revenue FROM bookings WHERE created_at BETWEEN ? AND ?");
        $stmt->bind_param("ss", $dayStart, $dayEnd);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        $dailyRevenue[] = [
            'date' => $date,
            'revenue' => (float)($row['revenue'] ?: 0)
        ];
    }
    
    // Prepare response data
    $metrics = [
        'totalBookings' => (int)$totalBookings,
        'totalRevenue' => (float)$totalRevenue,
        'bookingsByStatus' => $bookingsByStatus,
        'bookingsByTripType' => $bookingsByTripType,
        'bookingsByCabType' => $bookingsByCabType,
        'recentBookings' => $recentBookings,
        'dailyRevenue' => $dailyRevenue,
        'period' => $period
    ];
    
    sendJsonResponse(['status' => 'success', 'data' => $metrics]);
    
} catch (Exception $e) {
    logError("Error fetching dashboard metrics", ['error' => $e->getMessage(), 'period' => $period]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to fetch dashboard metrics: ' . $e->getMessage()], 500);
}
