
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request details for troubleshooting
error_log("get-drivers.php called with method: " . $_SERVER['REQUEST_METHOD'] . ", headers: " . json_encode(getallheaders()));

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

// Function to log errors
function logDriverError($message, $data = []) {
    error_log("DRIVER API: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/driver_api_' . date('Y-m-d') . '.log';
    $dir = dirname($logFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - $message - " . json_encode($data) . "\n",
        FILE_APPEND
    );
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
        logDriverError("Database connection", ['success' => 'Connected to database']);
    } catch (Exception $e) {
        // Log the connection error
        logDriverError("Database connection failed", ['error' => $e->getMessage()]);
        
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
        exit;
    }

    // Check if the drivers table exists
    $tableCheckStmt = $conn->query("SHOW TABLES LIKE 'drivers'");
    if ($tableCheckStmt->num_rows === 0) {
        // Table doesn't exist, create it
        $createDriversTableSql = "
            CREATE TABLE IF NOT EXISTS drivers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100) NOT NULL,
                license_no VARCHAR(50),
                status ENUM('available', 'busy', 'offline') DEFAULT 'available',
                location VARCHAR(255),
                vehicle VARCHAR(50),
                total_rides INT DEFAULT 0,
                rating DECIMAL(2,1) DEFAULT 5.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        try {
            $conn->query($createDriversTableSql);
            logDriverError("Created drivers table", ['success' => true]);
            
            // Insert sample drivers
            $sampleDrivers = [
                ['Rajesh Kumar', '9876543210', 'rajesh@example.com', 'DL-1234567890', 'available', 'Visakhapatnam Railway Station', 'AP 31 AB 1234', 352, 4.8],
                ['Suresh Singh', '8765432109', 'suresh@example.com', 'DL-0987654321', 'available', 'Visakhapatnam Airport', 'AP 31 CD 5678', 215, 4.6],
                ['Mahesh Reddy', '7654321098', 'mahesh@example.com', 'DL-5678901234', 'available', 'Beach Road', 'AP 31 EF 9012', 180, 4.5],
                ['Venkatesh S', '6543210987', 'venkatesh@example.com', 'DL-3456789012', 'available', 'RTC Complex', 'AP 34 XX 3456', 140, 4.7],
                ['Ramesh Babu', '5432109876', 'ramesh@example.com', 'DL-6789012345', 'available', 'Dwaraka Bus Station', 'AP 35 XX 7890', 120, 4.4]
            ];
            
            $insertStmt = $conn->prepare("
                INSERT INTO drivers (name, phone, email, license_no, status, location, vehicle, total_rides, rating) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            foreach ($sampleDrivers as $driver) {
                $insertStmt->bind_param("ssssssidd", $driver[0], $driver[1], $driver[2], $driver[3], $driver[4], $driver[5], $driver[6], $driver[7], $driver[8]);
                $insertStmt->execute();
            }
            
            logDriverError("Inserted sample drivers", ['count' => count($sampleDrivers)]);
        } catch (Exception $tableErr) {
            logDriverError("Failed to create or populate drivers table", ['error' => $tableErr->getMessage()]);
        }
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
        $query .= " AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR location LIKE ? OR vehicle LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types .= "sssss";
    }
    
    logDriverError("Executing driver query", ['query' => $query, 'params' => $params]);
    
    $stmt = $conn->prepare($query);
    
    if (!empty($params)) {
        // Use call_user_func_array to pass bind_param arguments
        $bindParams = array_merge([$types], $params);
        call_user_func_array([$stmt, 'bind_param'], makeValuesReferenced($bindParams));
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
        'drivers' => $drivers,
        'count' => count($drivers)
    ]);

} catch (Exception $e) {
    error_log("Error in get-drivers.php: " . $e->getMessage());
    logDriverError("General error", ['error' => $e->getMessage()]);
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

// Helper function to make values referenced for bind_param
function makeValuesReferenced($arr) {
    $refs = array();
    foreach ($arr as $key => $value) {
        $refs[$key] = &$arr[$key];
    }
    return $refs;
}
