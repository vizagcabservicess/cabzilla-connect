
<?php
// Include database configuration
require_once __DIR__ . '/../../config.php';

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Handle only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Access-Control-Allow-Origin: *');
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Check for authorization
$headers = getallheaders();
if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
    sendJsonResponse(['status' => 'error', 'message' => 'Authentication required'], 401);
    exit;
}

$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
$token = str_replace('Bearer ', '', $authHeader);

$userData = verifyJwtToken($token);
if (!$userData || !isset($userData['user_id']) || !isset($userData['role']) || $userData['role'] !== 'admin') {
    sendJsonResponse(['status' => 'error', 'message' => 'Admin access required'], 403);
    exit;
}

// Get period from query parameter, default to 'day'
$period = isset($_GET['period']) ? $_GET['period'] : 'day';
$validPeriods = ['today', 'week', 'month', 'year'];

if (!in_array($period, $validPeriods)) {
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid period parameter. Use today, week, month, or year'], 400);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Get date ranges based on period
    $now = new DateTime();
    $nowFormatted = $now->format('Y-m-d H:i:s');
    
    $dateStart = new DateTime();
    
    switch ($period) {
        case 'today':
            $dateStart->setTime(0, 0, 0);
            break;
        case 'week':
            $dateStart->modify('-7 days');
            break;
        case 'month':
            $dateStart->modify('-30 days');
            break;
        case 'year':
            $dateStart->modify('-365 days');
            break;
    }
    
    $dateStartFormatted = $dateStart->format('Y-m-d H:i:s');
    
    // Calculate previous period for comparison
    $previousPeriodStart = clone $dateStart;
    $previousPeriodEnd = clone $dateStart;
    
    switch ($period) {
        case 'today':
            $previousPeriodStart->modify('-1 day');
            break;
        case 'week':
            $previousPeriodStart->modify('-7 days');
            break;
        case 'month':
            $previousPeriodStart->modify('-30 days');
            break;
        case 'year':
            $previousPeriodStart->modify('-365 days');
            break;
    }
    
    $previousPeriodStartFormatted = $previousPeriodStart->format('Y-m-d H:i:s');
    $previousPeriodEndFormatted = $previousPeriodEnd->format('Y-m-d H:i:s');
    
    // Log the query parameters for debugging
    logError("Admin metrics query parameters", [
        'period' => $period,
        'dateStart' => $dateStartFormatted,
        'dateEnd' => $nowFormatted,
        'previousStart' => $previousPeriodStartFormatted,
        'previousEnd' => $previousPeriodEndFormatted
    ]);
    
    // Get total bookings for current period
    $stmt = $conn->prepare("SELECT COUNT(*) as total_bookings FROM bookings WHERE created_at BETWEEN ? AND ?");
    $stmt->bind_param("ss", $dateStartFormatted, $nowFormatted);
    $stmt->execute();
    $result = $stmt->get_result();
    $totalBookings = $result->fetch_assoc()['total_bookings'];
    
    // Get active rides (with status 'confirmed')
    $status = 'confirmed';
    $stmt = $conn->prepare("SELECT COUNT(*) as active_rides FROM bookings WHERE status = ? AND pickup_date BETWEEN ? AND ?");
    $stmt->bind_param("sss", $status, $dateStartFormatted, $nowFormatted);
    $stmt->execute();
    $result = $stmt->get_result();
    $activeRides = $result->fetch_assoc()['active_rides'];
    
    // Get total revenue
    $stmt = $conn->prepare("SELECT SUM(total_amount) as total_revenue FROM bookings WHERE created_at BETWEEN ? AND ?");
    $stmt->bind_param("ss", $dateStartFormatted, $nowFormatted);
    $stmt->execute();
    $result = $stmt->get_result();
    $totalRevenue = $result->fetch_assoc()['total_revenue'] ?: 0;
    
    // Get driver statistics
    $availableStatus = 'available';
    $busyStatus = 'busy';
    
    $stmt = $conn->prepare("SELECT 
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as available_drivers,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as busy_drivers
        FROM drivers");
    $stmt->bind_param("ss", $availableStatus, $busyStatus);
    $stmt->execute();
    $result = $stmt->get_result();
    $driverStats = $result->fetch_assoc();
    
    // Get average rating
    $stmt = $conn->prepare("SELECT AVG(rating) as avg_rating FROM drivers");
    $stmt->execute();
    $result = $stmt->get_result();
    $avgRating = $result->fetch_assoc()['avg_rating'] ?: 4.5;
    
    // Get upcoming rides
    $currentDate = date('Y-m-d H:i:s');
    $confirmedStatus = 'confirmed';
    
    $stmt = $conn->prepare("SELECT COUNT(*) as upcoming_rides FROM bookings 
        WHERE status = ? AND pickup_date > ?");
    $stmt->bind_param("ss", $confirmedStatus, $currentDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $upcomingRides = $result->fetch_assoc()['upcoming_rides'];
    
    // Get previous period revenue for comparison
    $stmt = $conn->prepare("SELECT SUM(total_amount) as prev_revenue FROM bookings 
        WHERE created_at BETWEEN ? AND ?");
    $stmt->bind_param("ss", $previousPeriodStartFormatted, $previousPeriodEndFormatted);
    $stmt->execute();
    $result = $stmt->get_result();
    $prevRevenue = $result->fetch_assoc()['prev_revenue'] ?: 0;
    
    // Calculate percentage change
    $percentChange = 0;
    if ($prevRevenue > 0) {
        $percentChange = (($totalRevenue - $prevRevenue) / $prevRevenue) * 100;
    }
    
    // Prepare response data
    $metrics = [
        'totalBookings' => (int)$totalBookings,
        'activeRides' => (int)$activeRides,
        'totalRevenue' => (float)$totalRevenue,
        'availableDrivers' => (int)($driverStats['available_drivers'] ?? 5),
        'busyDrivers' => (int)($driverStats['busy_drivers'] ?? 3),
        'avgRating' => (float)$avgRating,
        'upcomingRides' => (int)$upcomingRides,
        'comparison' => [
            'previous' => (float)$prevRevenue,
            'percentChange' => round($percentChange, 2)
        ],
        'period' => $period
    ];
    
    // Send response
    sendJsonResponse([
        'status' => 'success',
        'data' => $metrics
    ]);
    
} catch (Exception $e) {
    logError("Error fetching admin metrics", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Error fetching metrics: ' . $e->getMessage()], 500);
}
