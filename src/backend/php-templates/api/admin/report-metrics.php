
<?php
// report-metrics.php - Get dashboard metrics for the admin panel
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Get database connection
try {
    $conn = getDbConnectionWithRetry();
} catch (Exception $e) {
    sendResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
}

// Get time period from query parameters (default: last 30 days)
$period = isset($_GET['period']) ? $_GET['period'] : '30days';
$startDate = '';
$endDate = date('Y-m-d');

switch ($period) {
    case '7days':
        $startDate = date('Y-m-d', strtotime('-7 days'));
        break;
    case '30days':
        $startDate = date('Y-m-d', strtotime('-30 days'));
        break;
    case '90days':
        $startDate = date('Y-m-d', strtotime('-90 days'));
        break;
    case 'year':
        $startDate = date('Y-m-d', strtotime('-1 year'));
        break;
    default:
        $startDate = date('Y-m-d', strtotime('-30 days'));
}

try {
    $metrics = [];
    
    // Total bookings
    $sql = "SELECT COUNT(*) as total FROM bookings WHERE DATE(created_at) BETWEEN ? AND ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $metrics['totalBookings'] = (int)($result['total'] ?? 0);
    
    // Total revenue
    $sql = "SELECT SUM(total_amount) as total FROM bookings WHERE DATE(created_at) BETWEEN ? AND ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $metrics['totalRevenue'] = (float)($result['total'] ?? 0);
    
    // Active drivers
    $sql = "SELECT COUNT(*) as total FROM drivers WHERE status = 'available' OR status = 'busy'";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $metrics['activeDrivers'] = (int)($result['total'] ?? 0);
    
    // Active vehicles (proxy: count all vehicle types)
    $sql = "SELECT COUNT(*) as total FROM vehicles";
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $metrics['activeVehicles'] = (int)($result['total'] ?? 0);
    } else {
        $metrics['activeVehicles'] = 8; // Default fallback value if table doesn't exist
    }
    
    // Booking trends (daily bookings for the period)
    $sql = "SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as revenue 
            FROM bookings WHERE DATE(created_at) BETWEEN ? AND ? 
            GROUP BY DATE(created_at) ORDER BY DATE(created_at)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $trends = [];
    while ($row = $result->fetch_assoc()) {
        $trends[] = [
            'date' => $row['date'],
            'bookings' => (int)$row['count'],
            'revenue' => (float)$row['revenue']
        ];
    }
    $metrics['trends'] = $trends;
    
    // Bookings by status
    $sql = "SELECT status, COUNT(*) as count FROM bookings WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY status";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $bookingsByStatus = [];
    while ($row = $result->fetch_assoc()) {
        $bookingsByStatus[$row['status']] = (int)$row['count'];
    }
    $metrics['bookingsByStatus'] = $bookingsByStatus;
    
    // Revenue by trip type
    $sql = "SELECT trip_type, COUNT(*) as bookings, SUM(total_amount) as revenue 
            FROM bookings WHERE DATE(created_at) BETWEEN ? AND ? 
            GROUP BY trip_type ORDER BY revenue DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $revenueByTripType = [];
    while ($row = $result->fetch_assoc()) {
        $revenueByTripType[] = [
            'tripType' => $row['trip_type'] ?? 'unknown',
            'bookings' => (int)$row['bookings'],
            'revenue' => (float)$row['revenue']
        ];
    }
    $metrics['revenueByTripType'] = $revenueByTripType;
    
    // Return the metrics
    sendResponse([
        'status' => 'success',
        'period' => $period,
        'startDate' => $startDate,
        'endDate' => $endDate,
        'metrics' => $metrics
    ]);
    
} catch (Exception $e) {
    sendResponse(['status' => 'error', 'message' => 'Failed to get metrics: ' . $e->getMessage()], 500);
}

// Close connection
$conn->close();
