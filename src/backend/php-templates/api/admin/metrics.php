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

// Get period from query params (today, week, month)
$period = isset($_GET['period']) ? $_GET['period'] : 'week';
if (!in_array($period, ['today', 'week', 'month'])) {
    $period = 'week'; // Default to week if invalid period
}

// Get user ID from JWT token and check if admin
$headers = getallheaders();
$userId = null;
$isAdmin = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
    }
}

// Check if user is admin
if (!$isAdmin) {
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized access. Admin privileges required.'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Set date range based on period
    $startDate = '';
    $endDate = date('Y-m-d H:i:s'); // Current time
    
    switch ($period) {
        case 'today':
            $startDate = date('Y-m-d 00:00:00'); // Today at midnight
            break;
        case 'week':
            $startDate = date('Y-m-d 00:00:00', strtotime('-7 days')); // 7 days ago
            break;
        case 'month':
            $startDate = date('Y-m-d 00:00:00', strtotime('-30 days')); // 30 days ago
            break;
    }
    
    // Get total bookings in the period
    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM bookings WHERE created_at BETWEEN ? AND ?");
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $totalBookingsData = $result->fetch_assoc();
    $totalBookings = $totalBookingsData['total'];
    
    // Get active rides (confirmed status, not completed/cancelled)
    $activeStatus = 'confirmed';
    $stmt = $conn->prepare("SELECT COUNT(*) as active FROM bookings WHERE status = ? AND created_at BETWEEN ? AND ?");
    $stmt->bind_param("sss", $activeStatus, $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $activeRidesData = $result->fetch_assoc();
    $activeRides = $activeRidesData['active'];
    
    // Get total revenue in the period
    $stmt = $conn->prepare("SELECT SUM(total_amount) as revenue FROM bookings WHERE created_at BETWEEN ? AND ?");
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $revenueData = $result->fetch_assoc();
    $totalRevenue = $revenueData['revenue'] ? floatval($revenueData['revenue']) : 0;
    
    // Get upcoming rides (with pickup_date in the future)
    $now = date('Y-m-d H:i:s');
    $stmt = $conn->prepare("SELECT COUNT(*) as upcoming FROM bookings WHERE pickup_date > ? AND status != 'cancelled'");
    $stmt->bind_param("s", $now);
    $stmt->execute();
    $result = $stmt->get_result();
    $upcomingRidesData = $result->fetch_assoc();
    $upcomingRides = $upcomingRidesData['upcoming'];
    
    // Create metrics response
    $metrics = [
        'totalBookings' => intval($totalBookings),
        'activeRides' => intval($activeRides),
        'totalRevenue' => $totalRevenue,
        'availableDrivers' => 5, // Placeholder value, would be from drivers table 
        'busyDrivers' => 3,      // Placeholder value, would be from drivers table
        'avgRating' => 4.7,      // Placeholder value, would be calculated from ratings
        'upcomingRides' => intval($upcomingRides)
    ];
    
    // Send response
    sendJsonResponse(['status' => 'success', 'data' => $metrics]);
    
} catch (Exception $e) {
    logError("Error fetching admin metrics", ['error' => $e->getMessage(), 'period' => $period]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to get metrics: ' . $e->getMessage()], 500);
}
