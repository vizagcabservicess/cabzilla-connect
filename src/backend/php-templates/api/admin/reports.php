
<?php
// reports.php - Generate various types of reports
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

// Get report parameters from query string
$reportType = isset($_GET['type']) ? $_GET['type'] : 'bookings';
$startDate = isset($_GET['startDate']) ? $_GET['startDate'] : date('Y-m-d', strtotime('-30 days'));
$endDate = isset($_GET['endDate']) ? $_GET['endDate'] : date('Y-m-d');
$format = isset($_GET['format']) ? $_GET['format'] : 'json';
$detailed = isset($_GET['detailed']) ? filter_var($_GET['detailed'], FILTER_VALIDATE_BOOLEAN) : false;

try {
    $reportData = [];
    
    switch ($reportType) {
        case 'bookings':
            // Get booking statistics
            if ($detailed) {
                $sql = "SELECT * FROM bookings WHERE DATE(created_at) BETWEEN ? AND ? ORDER BY created_at DESC";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $bookings = [];
                while ($row = $result->fetch_assoc()) {
                    $bookings[] = $row;
                }
                $reportData['bookings'] = $bookings;
            } else {
                // Summary report
                $summaryData = [];
                
                // Total bookings
                $sql = "SELECT COUNT(*) as total FROM bookings WHERE DATE(created_at) BETWEEN ? AND ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result()->fetch_assoc();
                $summaryData['totalBookings'] = (int)$result['total'];
                
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
                $summaryData['bookingsByStatus'] = $bookingsByStatus;
                
                // Daily booking counts
                $sql = "SELECT DATE(created_at) as date, COUNT(*) as count FROM bookings 
                        WHERE DATE(created_at) BETWEEN ? AND ? 
                        GROUP BY DATE(created_at) ORDER BY DATE(created_at)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $dailyBookings = [];
                while ($row = $result->fetch_assoc()) {
                    $dailyBookings[] = [
                        'date' => $row['date'],
                        'count' => (int)$row['count']
                    ];
                }
                $summaryData['dailyBookings'] = $dailyBookings;
                
                $reportData = $summaryData;
            }
            break;
            
        case 'revenue':
            // Get revenue statistics
            if ($detailed) {
                $sql = "SELECT id, booking_number, passenger_name, passenger_phone, total_amount, created_at 
                        FROM bookings WHERE DATE(created_at) BETWEEN ? AND ? ORDER BY created_at DESC";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $transactions = [];
                while ($row = $result->fetch_assoc()) {
                    $transactions[] = $row;
                }
                $reportData['transactions'] = $transactions;
            } else {
                // Summary revenue report
                $summaryData = [];
                
                // Total revenue
                $sql = "SELECT SUM(total_amount) as total FROM bookings WHERE DATE(created_at) BETWEEN ? AND ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result()->fetch_assoc();
                $summaryData['totalRevenue'] = (float)($result['total'] ?? 0);
                
                // Revenue by trip type
                $sql = "SELECT trip_type, SUM(total_amount) as total FROM bookings 
                        WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY trip_type";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $revenueByTripType = [];
                while ($row = $result->fetch_assoc()) {
                    $revenueByTripType[$row['trip_type']] = (float)$row['total'];
                }
                $summaryData['revenueByTripType'] = $revenueByTripType;
                
                // Daily revenue
                $sql = "SELECT DATE(created_at) as date, SUM(total_amount) as total FROM bookings 
                        WHERE DATE(created_at) BETWEEN ? AND ? 
                        GROUP BY DATE(created_at) ORDER BY DATE(created_at)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $dailyRevenue = [];
                while ($row = $result->fetch_assoc()) {
                    $dailyRevenue[] = [
                        'date' => $row['date'],
                        'total' => (float)$row['total']
                    ];
                }
                $summaryData['dailyRevenue'] = $dailyRevenue;
                
                $reportData = $summaryData;
            }
            break;
            
        case 'drivers':
            // Get driver statistics
            if ($detailed) {
                $sql = "SELECT * FROM drivers ORDER BY name";
                $stmt = $conn->prepare($sql);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $drivers = [];
                while ($row = $result->fetch_assoc()) {
                    $drivers[] = $row;
                }
                $reportData['drivers'] = $drivers;
            } else {
                // Summary driver report
                $summaryData = [];
                
                // Driver count by status
                $sql = "SELECT status, COUNT(*) as count FROM drivers GROUP BY status";
                $stmt = $conn->prepare($sql);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $driversByStatus = [];
                while ($row = $result->fetch_assoc()) {
                    $driversByStatus[$row['status']] = (int)$row['count'];
                }
                $summaryData['driversByStatus'] = $driversByStatus;
                
                // Top drivers by earnings
                $sql = "SELECT name, phone, earnings, total_rides, rating FROM drivers ORDER BY earnings DESC LIMIT 5";
                $stmt = $conn->prepare($sql);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $topDrivers = [];
                while ($row = $result->fetch_assoc()) {
                    $topDrivers[] = $row;
                }
                $summaryData['topDrivers'] = $topDrivers;
                
                $reportData = $summaryData;
            }
            break;
            
        case 'vehicles':
            // Get vehicle utilization statistics
            
            // Try to get booking data grouped by vehicle type
            $sql = "SELECT cab_type, COUNT(*) as bookings, SUM(total_amount) as revenue 
                    FROM bookings WHERE DATE(created_at) BETWEEN ? AND ? 
                    GROUP BY cab_type ORDER BY bookings DESC";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ss", $startDate, $endDate);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $vehicleStats = [];
            while ($row = $result->fetch_assoc()) {
                $vehicleStats[] = [
                    'vehicleType' => $row['cab_type'],
                    'bookings' => (int)$row['bookings'],
                    'revenue' => (float)$row['revenue']
                ];
            }
            $reportData['vehicleStats'] = $vehicleStats;
            break;
            
        default:
            sendResponse(['status' => 'error', 'message' => 'Unknown report type'], 400);
    }
    
    // Return the report data
    sendResponse([
        'status' => 'success',
        'reportType' => $reportType,
        'startDate' => $startDate,
        'endDate' => $endDate,
        'data' => $reportData
    ]);
    
} catch (Exception $e) {
    sendResponse(['status' => 'error', 'message' => 'Failed to generate report: ' . $e->getMessage()], 500);
}

// Close connection
$conn->close();
