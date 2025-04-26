
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Get filter parameters
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $search = isset($_GET['search']) ? $_GET['search'] : null;

    // Try to connect to database
    try {
        $conn = getDbConnectionWithRetry();
    } catch (Exception $e) {
        // Return mock data if database connection fails
        error_log("Database connection failed: " . $e->getMessage() . ". Using mock data.");
        $mockDrivers = [
            [
                'id' => 1,
                'name' => 'Rajesh Kumar',
                'phone' => '9876543210',
                'email' => 'rajesh@example.com',
                'license_no' => 'DL-1234567890',
                'status' => 'available',
                'location' => 'Visakhapatnam Railway Station',
                'vehicle' => 'AP 31 AB 1234',
                'total_rides' => 352,
                'rating' => 4.8
            ],
            [
                'id' => 2,
                'name' => 'Suresh Singh',
                'phone' => '8765432109',
                'email' => 'suresh@example.com',
                'license_no' => 'DL-0987654321',
                'status' => 'available',
                'location' => 'Visakhapatnam Airport',
                'vehicle' => 'AP 31 CD 5678',
                'total_rides' => 215,
                'rating' => 4.6
            ],
            [
                'id' => 3,
                'name' => 'Mahesh Reddy',
                'phone' => '7654321098',
                'email' => 'mahesh@example.com',
                'license_no' => 'DL-5678901234',
                'status' => 'available',
                'location' => 'Beach Road',
                'vehicle' => 'AP 31 EF 9012',
                'total_rides' => 180,
                'rating' => 4.5
            ],
            [
                'id' => 4,
                'name' => 'Venkatesh S',
                'phone' => '6543210987',
                'email' => 'venkatesh@example.com',
                'license_no' => 'DL-3456789012',
                'status' => 'available',
                'location' => 'RTC Complex',
                'vehicle' => 'AP 34 XX 3456',
                'total_rides' => 140,
                'rating' => 4.7
            ],
            [
                'id' => 5,
                'name' => 'Ramesh Babu',
                'phone' => '5432109876',
                'email' => 'ramesh@example.com',
                'license_no' => 'DL-6789012345',
                'status' => 'available',
                'location' => 'Dwaraka Bus Station',
                'vehicle' => 'AP 35 XX 7890',
                'total_rides' => 120,
                'rating' => 4.4
            ]
        ];
        
        // Filter mock data if needed
        if ($status) {
            $mockDrivers = array_filter($mockDrivers, function($driver) use ($status) {
                return $driver['status'] === $status;
            });
        }
        
        if ($search) {
            $search = strtolower($search);
            $mockDrivers = array_filter($mockDrivers, function($driver) use ($search) {
                return strpos(strtolower($driver['name']), $search) !== false ||
                       strpos(strtolower($driver['phone']), $search) !== false ||
                       strpos(strtolower($driver['email']), $search) !== false ||
                       strpos(strtolower($driver['location']), $search) !== false;
            });
        }
        
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Drivers retrieved successfully (mock data)',
            'drivers' => array_values($mockDrivers), // Reset array keys
            'testing_mode' => true
        ]);
    }

    // Query database for drivers
    $query = "SELECT * FROM drivers WHERE 1=1";
    $params = [];
    $types = "";
    
    if ($status) {
        $query .= " AND status = ?";
        $params[] = $status;
        $types .= "s";
    }
    
    if ($search) {
        $query .= " AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR location LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types .= "ssss";
    }
    
    $stmt = $conn->prepare($query);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $drivers = [];
    while ($row = $result->fetch_assoc()) {
        $drivers[] = $row;
    }
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Drivers retrieved successfully',
        'drivers' => $drivers
    ]);

} catch (Exception $e) {
    error_log("Error in get-drivers.php: " . $e->getMessage());
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to retrieve drivers',
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
