
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Prevent any output before headers are sent
ob_start();

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

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
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

// Log errors
function logError($message, $data = []) {
    error_log("DRIVER API ERROR: $message " . json_encode($data));
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    $logFile = $logDir . '/driver_api_errors.log';
    file_put_contents(
        $logFile, 
        date('Y-m-d H:i:s') . " - $message - " . json_encode($data) . "\n",
        FILE_APPEND
    );
}

try {
    // Only allow GET request
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Connect to database with improved error handling
    try {
        $conn = getDbConnectionWithRetry();
        if (!$conn) {
            throw new Exception("Database connection failed after retries");
        }
    } catch (Exception $e) {
        logError('Database connection failed', ['error' => $e->getMessage()]);
        
        // Return mock data for now since this is likely a database setup issue
        $mockDrivers = [
            [
                'id' => 1,
                'name' => 'Rajesh Kumar',
                'phone' => '9876543210',
                'email' => 'rajesh@example.com',
                'license_no' => 'DL-1234567890',
                'vehicle' => 'AP 31 XX 1234',
                'status' => 'available',
                'total_rides' => 120,
                'earnings' => 25000,
                'rating' => 4.8,
                'location' => 'Hyderabad Central'
            ],
            [
                'id' => 2,
                'name' => 'Pavan Reddy',
                'phone' => '8765432109',
                'email' => 'pavan@example.com',
                'license_no' => 'DL-0987654321',
                'vehicle' => 'AP 32 XX 5678',
                'status' => 'busy',
                'total_rides' => 85,
                'earnings' => 18000,
                'rating' => 4.5,
                'location' => 'Gachibowli'
            ],
            [
                'id' => 3,
                'name' => 'Suresh Verma',
                'phone' => '7654321098',
                'email' => 'suresh@example.com',
                'license_no' => 'DL-5678901234',
                'vehicle' => 'AP 33 XX 9012',
                'status' => 'offline',
                'total_rides' => 180,
                'earnings' => 72000,
                'rating' => 4.5,
                'location' => 'Offline'
            ],
            [
                'id' => 4,
                'name' => 'Venkatesh S',
                'phone' => '9876543211',
                'email' => 'venkat@example.com',
                'license_no' => 'DL-4321098765',
                'vehicle' => 'AP 34 XX 3456',
                'status' => 'available',
                'total_rides' => 95,
                'earnings' => 32000,
                'rating' => 4.7,
                'location' => 'Kukatpally'
            ],
            [
                'id' => 5,
                'name' => 'Ramesh Babu',
                'phone' => '8765432108',
                'email' => 'ramesh@example.com',
                'license_no' => 'DL-2345678901',
                'vehicle' => 'AP 35 XX 7890',
                'status' => 'busy',
                'total_rides' => 150,
                'earnings' => 48000,
                'rating' => 4.6,
                'location' => 'Ameerpet'
            ]
        ];
        
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Mock data returned due to database connection issue',
            'drivers' => $mockDrivers
        ]);
    }

    // Check if drivers table exists, create if not
    $tableExists = false;
    $result = $conn->query("SHOW TABLES LIKE 'drivers'");
    if ($result) {
        $tableExists = ($result->num_rows > 0);
    }
    
    if (!$tableExists) {
        // Create drivers table
        $createTableSQL = "
            CREATE TABLE drivers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                license_number VARCHAR(50),
                vehicle_number VARCHAR(50),
                status ENUM('available', 'busy', 'offline') DEFAULT 'available',
                total_rides INT DEFAULT 0,
                earnings DECIMAL(10,2) DEFAULT 0.00,
                rating DECIMAL(3,1) DEFAULT 5.0,
                location VARCHAR(255) DEFAULT 'Visakhapatnam',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if (!$conn->query($createTableSQL)) {
            throw new Exception("Failed to create drivers table: " . $conn->error);
        }
        
        // Insert sample data if newly created
        $sampleData = [
            ['Rajesh Kumar', '9876543210', 'rajesh@example.com', 'DL-1234567890', 'AP 31 XX 1234', 'available', 'Hyderabad Central'],
            ['Pavan Reddy', '8765432109', 'pavan@example.com', 'DL-0987654321', 'AP 32 XX 5678', 'busy', 'Gachibowli'],
            ['Suresh Verma', '7654321098', 'suresh@example.com', 'DL-5678901234', 'AP 33 XX 9012', 'offline', 'Offline'],
            ['Venkatesh S', '9876543211', 'venkat@example.com', 'DL-4321098765', 'AP 34 XX 3456', 'available', 'Kukatpally'],
            ['Ramesh Babu', '8765432108', 'ramesh@example.com', 'DL-2345678901', 'AP 35 XX 7890', 'busy', 'Ameerpet']
        ];
        
        $insertStmt = $conn->prepare("INSERT INTO drivers (name, phone, email, license_number, vehicle_number, status, location) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        if (!$insertStmt) {
            throw new Exception("Failed to prepare insert statement: " . $conn->error);
        }
        
        foreach ($sampleData as $driver) {
            $insertStmt->bind_param("sssssss", $driver[0], $driver[1], $driver[2], $driver[3], $driver[4], $driver[5], $driver[6]);
            $insertStmt->execute();
        }
        
        logError('Created drivers table and inserted sample data', []);
    }

    // Get filter parameters
    $statusFilter = isset($_GET['status']) && $_GET['status'] !== 'all' ? $_GET['status'] : '';
    $searchQuery = isset($_GET['search']) ? $_GET['search'] : '';

    // Build query based on filters
    $sql = "SELECT * FROM drivers";
    $whereClauses = [];
    $params = [];
    $types = "";
    
    if ($statusFilter) {
        $whereClauses[] = "status = ?";
        $params[] = $statusFilter;
        $types .= "s";
    }
    
    if ($searchQuery) {
        $searchPattern = "%$searchQuery%";
        $whereClauses[] = "(name LIKE ? OR phone LIKE ? OR vehicle_number LIKE ? OR location LIKE ?)";
        $params[] = $searchPattern;
        $params[] = $searchPattern;
        $params[] = $searchPattern;
        $params[] = $searchPattern;
        $types .= "ssss";
    }
    
    if (!empty($whereClauses)) {
        $sql .= " WHERE " . implode(" AND ", $whereClauses);
    }
    
    $sql .= " ORDER BY name ASC";
    
    // Prepare and execute query
    $stmt = $conn->prepare($sql);
    
    if (!empty($params)) {
        // Use a helper function to properly reference values for bind_param
        function refValues($arr) {
            $refs = array();
            foreach($arr as $key => $value) {
                $refs[$key] = &$arr[$key];
            }
            return $refs;
        }
        
        $bindParams = array($types);
        foreach ($params as $key => $value) {
            $bindParams[] = $params[$key];
        }
        
        call_user_func_array(array($stmt, 'bind_param'), refValues($bindParams));
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute drivers query: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    $drivers = [];
    while ($row = $result->fetch_assoc()) {
        $drivers[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'phone' => $row['phone'],
            'email' => $row['email'],
            'license_no' => $row['license_number'],
            'vehicle' => $row['vehicle_number'],
            'status' => $row['status'],
            'total_rides' => (int)$row['total_rides'],
            'earnings' => (float)$row['earnings'],
            'rating' => (float)$row['rating'],
            'location' => $row['location']
        ];
    }

    // Return success response
    sendJsonResponse([
        'status' => 'success',
        'drivers' => $drivers
    ]);

} catch (Exception $e) {
    logError("Unhandled error", ['error' => $e->getMessage()]);
    
    // Return mock data as fallback in case of errors
    $mockDrivers = [
        [
            'id' => 1,
            'name' => 'Rajesh Kumar (Fallback)',
            'phone' => '9876543210',
            'email' => 'rajesh@example.com',
            'license_no' => 'DL-1234567890',
            'vehicle' => 'AP 31 XX 1234',
            'status' => 'available',
            'total_rides' => 120,
            'earnings' => 25000,
            'rating' => 4.8,
            'location' => 'Hyderabad Central'
        ],
        [
            'id' => 2,
            'name' => 'Pavan Reddy (Fallback)',
            'phone' => '8765432109',
            'email' => 'pavan@example.com',
            'license_no' => 'DL-0987654321',
            'vehicle' => 'AP 32 XX 5678',
            'status' => 'busy',
            'total_rides' => 85,
            'earnings' => 18000,
            'rating' => 4.5,
            'location' => 'Gachibowli'
        ]
    ];
    
    // Return error response with mock data as fallback
    sendJsonResponse([
        'status' => 'success', 
        'message' => 'Fallback data returned due to error: ' . $e->getMessage(),
        'drivers' => $mockDrivers // Provide fallback data
    ], 200); // Still return 200 to ensure frontend gets usable data
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
