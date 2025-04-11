
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

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

// Get status filter if provided
$statusFilter = isset($_GET['status']) ? $_GET['status'] : null;

// Log the incoming request for debugging
error_log("Admin metrics request received: " . $_SERVER['REQUEST_URI']);
error_log("Headers received: " . json_encode(getallheaders()));

// Get user ID from JWT token and check if admin
$headers = getallheaders();
$userId = null;
$isAdmin = false;

try {
    if (isset($headers['Authorization']) || isset($headers['authorization'])) {
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
        $token = str_replace('Bearer ', '', $authHeader);
        
        error_log("Token received in metrics.php: " . (strlen($token) > 0 ? substr($token, 0, 15) . '...' : 'empty token'));
        
        if (function_exists('verifyJwtToken')) {
            $payload = verifyJwtToken($token);
            if ($payload && isset($payload['user_id'])) {
                $userId = $payload['user_id'];
                $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
                
                error_log("User authenticated in metrics.php: user_id=$userId, is_admin=" . ($isAdmin ? 'true' : 'false'));
            } else {
                error_log("JWT verification failed in metrics.php: invalid payload");
            }
        } else {
            error_log("verifyJwtToken function not available in metrics.php");
        }
    } else {
        error_log("No Authorization header found in metrics.php");
    }
    
    // For development/testing purposes, allow access even without proper authentication
    // Remove this in production
    $isAdmin = true;
    
    // Create the metrics data (for now we'll use fallback data)
    $metrics = [
        'totalBookings' => 24,
        'activeRides' => 3,
        'totalRevenue' => 35600,
        'availableDrivers' => 8,
        'busyDrivers' => 6,
        'avgRating' => 4.7,
        'upcomingRides' => 5,
        'availableStatuses' => ['pending', 'confirmed', 'completed', 'cancelled'],
        'currentFilter' => 'all'
    ];
    
    // Modify metrics based on period
    if ($period === 'today') {
        $metrics['totalBookings'] = 8;
        $metrics['totalRevenue'] = 12500;
    } else if ($period === 'month') {
        $metrics['totalBookings'] = 72;
        $metrics['totalRevenue'] = 95000;
    }
    
    // Send the metrics data
    sendJsonResponse(['status' => 'success', 'data' => $metrics]);
    
} catch (Exception $e) {
    error_log("Error in metrics.php: " . $e->getMessage());
    
    // Return error with default values
    $defaultMetrics = [
        'totalBookings' => 0,
        'activeRides' => 0,
        'totalRevenue' => 0,
        'availableDrivers' => 0,
        'busyDrivers' => 0,
        'avgRating' => 0,
        'upcomingRides' => 0,
        'availableStatuses' => ['pending', 'confirmed', 'completed', 'cancelled'],
        'currentFilter' => 'all'
    ];
    
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to get metrics: ' . $e->getMessage(),
        'data' => $defaultMetrics
    ], 500);
}

// Helper function to send JSON responses
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
