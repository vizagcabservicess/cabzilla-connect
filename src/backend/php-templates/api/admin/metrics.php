
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

// Get status filter if provided
$statusFilter = isset($_GET['status']) ? $_GET['status'] : null;

// Get user ID from JWT token and check if admin
$headers = getallheaders();
$userId = null;
$isAdmin = false;

// Log the incoming headers for debugging
logError("Metrics.php headers received", ['headers' => $headers]);

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    logError("Token received in metrics.php", ['token_length' => strlen($token)]);
    
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['user_id'])) {
        $userId = $payload['user_id'];
        $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
        
        logError("User authenticated in metrics.php", [
            'user_id' => $userId,
            'is_admin' => $isAdmin ? 'true' : 'false'
        ]);
    } else {
        logError("JWT verification failed in metrics.php", ['payload' => $payload]);
    }
} else {
    logError("No Authorization header found in metrics.php");
}

// Check if user is admin
if (!$isAdmin) {
    logError("Unauthorized access to metrics.php", ['user_id' => $userId]);
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized access. Admin privileges required.'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    logError("Database connection failed in metrics.php");
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
    
    logError("Date range for metrics.php", ['start' => $startDate, 'end' => $endDate, 'status_filter' => $statusFilter]);
    
    // Base query conditions
    $conditions = " WHERE created_at BETWEEN ? AND ?";
    $params = [$startDate, $endDate];
    $types = "ss";
    
    // Add status filter if provided
    if ($statusFilter) {
        $conditions .= " AND status = ?";
        $params[] = $statusFilter;
        $types .= "s";
        
        logError("Status filter added", ['status' => $statusFilter]);
    }
    
    // Get total bookings in the period with optional status filter
    $query = "SELECT COUNT(*) as total FROM bookings" . $conditions;
    logError("Total bookings query", ['query' => $query, 'params' => $params]);
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        logError("Prepare statement failed for total bookings", ['error' => $conn->error]);
        throw new Exception("Database prepare error: " . $conn->error);
    }
    
    $stmt->bind_param($types, ...$params);
    $executed = $stmt->execute();
    
    if (!$executed) {
        logError("Execute statement failed for total bookings", ['error' => $stmt->error]);
        throw new Exception("Database execute error: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $totalBookingsData = $result->fetch_assoc();
    $totalBookings = $totalBookingsData['total'];
    
    logError("Total bookings found", ['count' => $totalBookings]);
    
    // Get active rides (confirmed status, not completed/cancelled)
    $activeStatus = 'confirmed';
    if ($statusFilter) {
        // If status filter is applied, use it for active rides too
        $stmt = $conn->prepare("SELECT COUNT(*) as active FROM bookings WHERE status = ? AND created_at BETWEEN ? AND ?");
        $stmt->bind_param("sss", $statusFilter, $startDate, $endDate);
    } else {
        $stmt = $conn->prepare("SELECT COUNT(*) as active FROM bookings WHERE status = ? AND created_at BETWEEN ? AND ?");
        $stmt->bind_param("sss", $activeStatus, $startDate, $endDate);
    }
    
    if (!$stmt) {
        logError("Prepare statement failed for active rides", ['error' => $conn->error]);
        $activeRides = 0; // Default value on error
    } else {
        $executed = $stmt->execute();
        if (!$executed) {
            logError("Execute statement failed for active rides", ['error' => $stmt->error]);
            $activeRides = 0; // Default value on error
        } else {
            $result = $stmt->get_result();
            $activeRidesData = $result->fetch_assoc();
            $activeRides = $activeRidesData['active'];
        }
    }
    
    logError("Active rides found", ['count' => $activeRides]);
    
    // Get total revenue in the period with optional status filter
    $query = "SELECT SUM(total_amount) as revenue FROM bookings" . $conditions;
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        logError("Prepare statement failed for revenue", ['error' => $conn->error]);
        $totalRevenue = 0; // Default value on error
    } else {
        $stmt->bind_param($types, ...$params);
        $executed = $stmt->execute();
        
        if (!$executed) {
            logError("Execute statement failed for revenue", ['error' => $stmt->error]);
            $totalRevenue = 0; // Default value on error
        } else {
            $result = $stmt->get_result();
            $revenueData = $result->fetch_assoc();
            $totalRevenue = $revenueData['revenue'] ? floatval($revenueData['revenue']) : 0;
        }
    }
    
    logError("Total revenue", ['amount' => $totalRevenue]);
    
    // Get upcoming rides (with pickup_date in the future)
    $now = date('Y-m-d H:i:s');
    if ($statusFilter) {
        $stmt = $conn->prepare("SELECT COUNT(*) as upcoming FROM bookings WHERE pickup_date > ? AND status = ?");
        $stmt->bind_param("ss", $now, $statusFilter);
    } else {
        $stmt = $conn->prepare("SELECT COUNT(*) as upcoming FROM bookings WHERE pickup_date > ? AND status != 'cancelled'");
        $stmt->bind_param("s", $now);
    }
    
    if (!$stmt) {
        logError("Prepare statement failed for upcoming rides", ['error' => $conn->error]);
        $upcomingRides = 0; // Default value on error
    } else {
        $executed = $stmt->execute();
        
        if (!$executed) {
            logError("Execute statement failed for upcoming rides", ['error' => $stmt->error]);
            $upcomingRides = 0; // Default value on error
        } else {
            $result = $stmt->get_result();
            $upcomingRidesData = $result->fetch_assoc();
            $upcomingRides = $upcomingRidesData['upcoming'];
        }
    }
    
    logError("Upcoming rides", ['count' => $upcomingRides]);
    
    // Get all available statuses from the database
    $statusesQuery = "SELECT DISTINCT status FROM bookings WHERE status IS NOT NULL";
    $statusesResult = $conn->query($statusesQuery);
    $availableStatuses = [];
    
    if ($statusesResult) {
        while ($row = $statusesResult->fetch_assoc()) {
            if (!empty($row['status'])) {
                $availableStatuses[] = $row['status'];
            }
        }
    }
    
    // If no statuses found, use default set
    if (empty($availableStatuses)) {
        $availableStatuses = ['pending', 'confirmed', 'assigned', 'completed', 'cancelled'];
    }
    
    // Check if drivers table exists to avoid error
    $checkDriversTable = $conn->query("SHOW TABLES LIKE 'drivers'");
    $driversTableExists = $checkDriversTable && $checkDriversTable->num_rows > 0;
    
    // Add placeholder values for available and busy drivers
    $availableDrivers = 0;
    $busyDrivers = 0;
    
    if ($driversTableExists) {
        // Only query the drivers table if it exists
        $driverStmt = $conn->prepare("SELECT COUNT(*) as available FROM drivers WHERE status = 'available'");
        if ($driverStmt && $driverStmt->execute()) {
            $driverResult = $driverStmt->get_result();
            $driverData = $driverResult->fetch_assoc();
            $availableDrivers = $driverData['available'];
        }
        
        $busyDriverStmt = $conn->prepare("SELECT COUNT(*) as busy FROM drivers WHERE status = 'busy'");
        if ($busyDriverStmt && $busyDriverStmt->execute()) {
            $busyDriverResult = $busyDriverStmt->get_result();
            $busyDriverData = $busyDriverResult->fetch_assoc();
            $busyDrivers = $busyDriverData['busy'];
        }
    } else {
        // Use default placeholder values if drivers table doesn't exist
        $availableDrivers = 5;
        $busyDrivers = 3;
        logError("Drivers table doesn't exist, using placeholder values");
    }
    
    // Create metrics response
    $metrics = [
        'totalBookings' => intval($totalBookings),
        'activeRides' => intval($activeRides),
        'totalRevenue' => floatval($totalRevenue),
        'availableDrivers' => intval($availableDrivers),
        'busyDrivers' => intval($busyDrivers),
        'avgRating' => 4.7,      // Placeholder value, would be calculated from ratings
        'upcomingRides' => intval($upcomingRides),
        'availableStatuses' => $availableStatuses,
        'currentFilter' => $statusFilter ?: 'all'
    ];
    
    logError("Sending metrics response", ['metrics' => $metrics]);
    
    // Send response with the standard format: status + data
    sendJsonResponse(['status' => 'success', 'data' => $metrics]);
    
} catch (Exception $e) {
    logError("Error fetching admin metrics", ['error' => $e->getMessage(), 'period' => $period, 'status' => $statusFilter]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to get metrics: ' . $e->getMessage()], 500);
}
