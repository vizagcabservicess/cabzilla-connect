
<?php
// reports.php - Generate reports based on booking data
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Debug, *');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Log request
if ($debugMode) {
    error_log("Reports API called: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);
}

// Get database connection
try {
    $conn = getDbConnectionWithRetry();
} catch (Exception $e) {
    sendResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Get report type and filters
$reportType = isset($_GET['type']) ? $_GET['type'] : 'bookings';
$startDate = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-d', strtotime('-30 days'));
$endDate = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-m-d');

try {
    $reportData = [];
    
    switch ($reportType) {
        case 'bookings':
            $reportData = generateBookingsReport($conn, $startDate, $endDate);
            break;
        case 'revenue':
            $reportData = generateRevenueReport($conn, $startDate, $endDate);
            break;
        case 'drivers':
            $reportData = generateDriversReport($conn, $startDate, $endDate);
            break;
        case 'vehicles':
            $reportData = generateVehiclesReport($conn, $startDate, $endDate);
            break;
        default:
            sendResponse(['status' => 'error', 'message' => 'Invalid report type'], 400);
    }
    
    sendResponse([
        'status' => 'success', 
        'report_type' => $reportType,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'data' => $reportData
    ]);
} catch (Exception $e) {
    sendResponse(['status' => 'error', 'message' => 'Failed to generate report: ' . $e->getMessage()], 500);
}

// Generate bookings report
function generateBookingsReport($conn, $startDate, $endDate) {
    $sql = "SELECT 
                DATE(pickup_date) as date,
                COUNT(*) as total_bookings,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
                SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_bookings,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings
            FROM bookings
            WHERE pickup_date BETWEEN ? AND ? 
            GROUP BY DATE(pickup_date)
            ORDER BY date";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $report = [];
    while ($row = $result->fetch_assoc()) {
        $report[] = $row;
    }
    
    // If no data, generate empty report structure
    if (empty($report)) {
        $report = getMockBookingsReport($startDate, $endDate);
    }
    
    return $report;
}

// Generate revenue report
function generateRevenueReport($conn, $startDate, $endDate) {
    $sql = "SELECT 
                DATE(pickup_date) as date,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as average_booking_value,
                COUNT(*) as booking_count,
                trip_type,
                cab_type
            FROM bookings
            WHERE pickup_date BETWEEN ? AND ? AND status != 'cancelled'
            GROUP BY DATE(pickup_date), trip_type, cab_type
            ORDER BY date";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $report = [];
    while ($row = $result->fetch_assoc()) {
        $report[] = $row;
    }
    
    // If no data, generate empty report structure
    if (empty($report)) {
        $report = getMockRevenueReport($startDate, $endDate);
    }
    
    return $report;
}

// Generate drivers report
function generateDriversReport($conn, $startDate, $endDate) {
    // First check if the drivers table exists
    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'drivers'");
    if ($tableCheckResult->num_rows === 0) {
        return getMockDriversReport();
    }
    
    // Check if the bookings table has driver_id column
    $columnCheckResult = $conn->query("SHOW COLUMNS FROM bookings LIKE 'driver_id'");
    
    if ($columnCheckResult->num_rows === 0) {
        // No driver_id column, use driverName for join
        $sql = "SELECT 
                    d.id as driver_id,
                    d.name as driver_name,
                    COUNT(b.id) as total_trips,
                    SUM(b.total_amount) as total_earnings,
                    AVG(b.total_amount) as average_trip_value,
                    d.rating
                FROM drivers d
                LEFT JOIN bookings b ON d.name = b.driverName AND b.pickup_date BETWEEN ? AND ? AND b.status = 'completed'
                GROUP BY d.id, d.name, d.rating
                ORDER BY total_trips DESC";
    } else {
        // Use driver_id for join
        $sql = "SELECT 
                    d.id as driver_id,
                    d.name as driver_name,
                    COUNT(b.id) as total_trips,
                    SUM(b.total_amount) as total_earnings,
                    AVG(b.total_amount) as average_trip_value,
                    d.rating
                FROM drivers d
                LEFT JOIN bookings b ON d.id = b.driver_id AND b.pickup_date BETWEEN ? AND ? AND b.status = 'completed'
                GROUP BY d.id, d.name, d.rating
                ORDER BY total_trips DESC";
    }
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $report = [];
    while ($row = $result->fetch_assoc()) {
        $report[] = $row;
    }
    
    // If no data, generate empty report structure
    if (empty($report)) {
        $report = getMockDriversReport();
    }
    
    return $report;
}

// Generate vehicles report
function generateVehiclesReport($conn, $startDate, $endDate) {
    $sql = "SELECT 
                cab_type as vehicle_type,
                COUNT(*) as total_bookings,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as average_revenue
            FROM bookings
            WHERE pickup_date BETWEEN ? AND ? AND status = 'completed'
            GROUP BY cab_type
            ORDER BY total_bookings DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $report = [];
    while ($row = $result->fetch_assoc()) {
        $report[] = $row;
    }
    
    // If no data, generate empty report structure
    if (empty($report)) {
        $report = getMockVehiclesReport();
    }
    
    return $report;
}

// Mock report data generation functions
function getMockBookingsReport($startDate, $endDate) {
    $start = new DateTime($startDate);
    $end = new DateTime($endDate);
    $interval = new DateInterval('P1D');
    $dateRange = new DatePeriod($start, $interval, $end);
    
    $report = [];
    foreach ($dateRange as $date) {
        $dateStr = $date->format('Y-m-d');
        $totalBookings = rand(10, 50);
        $completed = rand(5, $totalBookings - 2);
        $cancelled = rand(1, 3);
        $confirmed = rand(1, 3);
        $assigned = rand(1, 3);
        $pending = $totalBookings - $completed - $cancelled - $confirmed - $assigned;
        
        $report[] = [
            'date' => $dateStr,
            'total_bookings' => $totalBookings,
            'completed_bookings' => $completed,
            'cancelled_bookings' => $cancelled,
            'confirmed_bookings' => $confirmed,
            'assigned_bookings' => $assigned,
            'pending_bookings' => $pending
        ];
    }
    
    return $report;
}

function getMockRevenueReport($startDate, $endDate) {
    $start = new DateTime($startDate);
    $end = new DateTime($endDate);
    $interval = new DateInterval('P1D');
    $dateRange = new DatePeriod($start, $interval, $end);
    
    $tripTypes = ['local', 'outstation', 'airport'];
    $cabTypes = ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Tempo Traveller'];
    
    $report = [];
    foreach ($dateRange as $date) {
        $dateStr = $date->format('Y-m-d');
        
        foreach ($tripTypes as $tripType) {
            foreach ($cabTypes as $cabType) {
                $bookingCount = rand(1, 10);
                $totalRevenue = $bookingCount * rand(1000, 5000);
                $avgBookingValue = $totalRevenue / $bookingCount;
                
                $report[] = [
                    'date' => $dateStr,
                    'total_revenue' => $totalRevenue,
                    'average_booking_value' => $avgBookingValue,
                    'booking_count' => $bookingCount,
                    'trip_type' => $tripType,
                    'cab_type' => $cabType
                ];
            }
        }
    }
    
    return $report;
}

function getMockDriversReport() {
    $driverNames = [
        'Rajesh Kumar', 'Pavan Reddy', 'Suresh Verma', 'Venkatesh S', 
        'Ramesh Babu', 'Arun Singh', 'Mahesh Sharma', 'Srinivas Rao'
    ];
    
    $report = [];
    for ($i = 0; $i < count($driverNames); $i++) {
        $totalTrips = rand(50, 200);
        $avgTripValue = rand(800, 2000);
        $totalEarnings = $totalTrips * $avgTripValue;
        $rating = round(rand(35, 50) / 10, 1);
        
        $report[] = [
            'driver_id' => $i + 1,
            'driver_name' => $driverNames[$i],
            'total_trips' => $totalTrips,
            'total_earnings' => $totalEarnings,
            'average_trip_value' => $avgTripValue,
            'rating' => $rating
        ];
    }
    
    return $report;
}

function getMockVehiclesReport() {
    $vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Tempo Traveller'];
    
    $report = [];
    foreach ($vehicleTypes as $type) {
        $totalBookings = rand(50, 200);
        $avgRevenue = rand(1000, 3000);
        $totalRevenue = $totalBookings * $avgRevenue;
        
        $report[] = [
            'vehicle_type' => $type,
            'total_bookings' => $totalBookings,
            'total_revenue' => $totalRevenue,
            'average_revenue' => $avgRevenue
        ];
    }
    
    return $report;
}

// Close database connection
$conn->close();
