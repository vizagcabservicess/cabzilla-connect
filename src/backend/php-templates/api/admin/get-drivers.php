
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set all response headers first before any output
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
    } catch (Exception $e) {
        logError('Database connection failed', ['error' => $e->getMessage()]);
        
        // Return mock data for now since this is likely a database setup issue
        $mockDrivers = [
            [
                'id' => 1,
                'name' => 'Rajesh Kumar',
                'phone' => '9876543210',
                'email' => 'rajesh@example.com',
                'vehicle' => 'AP 31 AB 1234',
                'status' => 'available'
            ],
            [
                'id' => 2,
                'name' => 'Suresh Singh',
                'phone' => '9876543211',
                'email' => 'suresh@example.com',
                'vehicle' => 'AP 31 CD 5678',
                'status' => 'available'
            ],
            // Add more mock drivers here
        ];
        
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Mock data returned due to database connection issue',
            'drivers' => $mockDrivers
        ]);
        exit;
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        $conn->query($createTableSQL);
        
        // Insert sample data if newly created
        $sampleData = [
            ['Rajesh Kumar', '9876543210', 'rajesh@example.com', 'DL123456', 'AP 31 AB 1234', 'available'],
            ['Suresh Singh', '9876543211', 'suresh@example.com', 'DL789012', 'AP 31 CD 5678', 'available'],
            ['Mahesh Reddy', '9876543212', 'mahesh@example.com', 'DL345678', 'AP 31 EF 9012', 'available'],
            ['Venkatesh S', '9876543213', 'venkatesh@example.com', 'DL901234', 'AP 34 XX 3456', 'busy'],
            ['Ramesh Babu', '8765432108', 'ramesh@example.com', 'DL567890', 'AP 35 XX 7890', 'offline']
        ];
        
        $insertStmt = $conn->prepare("INSERT INTO drivers (name, phone, email, license_number, vehicle_number, status) VALUES (?, ?, ?, ?, ?, ?)");
        
        foreach ($sampleData as $driver) {
            $insertStmt->bind_param("ssssss", $driver[0], $driver[1], $driver[2], $driver[3], $driver[4], $driver[5]);
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
        $whereClauses[] = "(name LIKE ? OR phone LIKE ? OR vehicle_number LIKE ?)";
        $params[] = $searchPattern;
        $params[] = $searchPattern;
        $params[] = $searchPattern;
        $types .= "sss";
    }
    
    if (!empty($whereClauses)) {
        $sql .= " WHERE " . implode(" AND ", $whereClauses);
    }
    
    $sql .= " ORDER BY name ASC";
    
    // Prepare and execute query
    $stmt = $conn->prepare($sql);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
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
            'rating' => (float)$row['rating']
        ];
    }

    // Return success response
    sendJsonResponse([
        'status' => 'success',
        'drivers' => $drivers
    ]);

} catch (Exception $e) {
    logError("Unhandled error", ['error' => $e->getMessage()]);
    
    // Return error response
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to retrieve drivers: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
