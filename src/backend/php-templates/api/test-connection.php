
<?php
/**
 * Quick database connection test endpoint
 * Access via /api/test-connection
 */

// Set proper response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Disable any output buffering
ob_end_clean();
if (ob_get_level()) {
    ob_end_clean();
}

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed'
    ]);
    http_response_code(405);
    exit;
}

// Enable error reporting but don't display to end user
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Create/access logs directory
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Log function for test connection
function logTestConnection($message, $data = []) {
    global $logDir;
    $logFile = $logDir . '/test_connection_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry);
}

// Get debug flag from query string
$debug = isset($_GET['debug']) && $_GET['debug'] === 'true';

logTestConnection("Connection test started", [
    'remote_addr' => $_SERVER['REMOTE_ADDR'],
    'debug_mode' => $debug
]);

try {
    // Use direct database credentials for maximum reliability
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    logTestConnection("Connecting to database", [
        'host' => $dbHost,
        'dbname' => $dbName
    ]);
    
    // Create connection directly (no helper functions)
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    if ($conn->connect_error) {
        logTestConnection("Connection failed", ['error' => $conn->connect_error]);
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");
    logTestConnection("Connected successfully", ['server_info' => $conn->server_info]);
    
    // Test connection with a simple query
    $testQuery = $conn->query("SELECT 1");
    if (!$testQuery) {
        logTestConnection("Test query failed", ['error' => $conn->error]);
        throw new Exception("Test query failed: " . $conn->error);
    }
    logTestConnection("Test query successful");
    
    // Check if bookings table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'bookings'");
    $bookingsTableExists = $tableCheck->num_rows > 0;
    logTestConnection("Bookings table check", ['exists' => $bookingsTableExists]);
    
    // Count existing bookings
    $bookingsCount = 0;
    if ($bookingsTableExists) {
        $countResult = $conn->query("SELECT COUNT(*) as count FROM bookings");
        if ($countResult && $row = $countResult->fetch_assoc()) {
            $bookingsCount = (int)$row['count'];
        }
        logTestConnection("Bookings count", ['count' => $bookingsCount]);
    } else {
        // Create bookings table
        logTestConnection("Creating bookings table");
        
        $createTableSql = "
        CREATE TABLE IF NOT EXISTS bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            booking_number VARCHAR(50) NOT NULL UNIQUE,
            pickup_location TEXT NOT NULL,
            drop_location TEXT,
            pickup_date DATETIME NOT NULL,
            return_date DATETIME,
            cab_type VARCHAR(50) NOT NULL,
            distance DECIMAL(10,2),
            trip_type VARCHAR(20) NOT NULL,
            trip_mode VARCHAR(20) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            passenger_name VARCHAR(100) NOT NULL,
            passenger_phone VARCHAR(20) NOT NULL,
            passenger_email VARCHAR(100) NOT NULL,
            hourly_package VARCHAR(50),
            tour_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        $createResult = $conn->query($createTableSql);
        if (!$createResult) {
            logTestConnection("Failed to create bookings table", ['error' => $conn->error]);
            throw new Exception("Failed to create bookings table: " . $conn->error);
        }
        
        logTestConnection("Bookings table created successfully");
        $bookingsTableExists = true;
    }
    
    // Try to insert and delete a test booking
    $insertTest = false;
    if ($bookingsTableExists) {
        $testBookingNumber = 'TEST_' . time() . '_' . rand(1000, 9999);
        
        $testInsertSql = "
        INSERT INTO bookings (
            booking_number, pickup_location, drop_location, pickup_date, 
            cab_type, distance, trip_type, trip_mode, total_amount,
            passenger_name, passenger_phone, passenger_email
        ) VALUES (
            '$testBookingNumber', 'Test Location', 'Test Destination', NOW(),
            'Test Cab', 10.5, 'test', 'one-way', 1000.00,
            'Test User', '1234567890', 'test@example.com'
        )";
        
        logTestConnection("Testing insert capability", ['sql' => $testInsertSql]);
        
        $testInsertResult = $conn->query($testInsertSql);
        $insertTest = $testInsertResult !== false;
        
        logTestConnection("Insert test result", [
            'success' => $insertTest, 
            'error' => $insertTest ? null : $conn->error
        ]);
        
        // Delete test record if insert succeeded
        if ($insertTest) {
            $conn->query("DELETE FROM bookings WHERE booking_number = '$testBookingNumber'");
            logTestConnection("Deleted test booking");
        }
    }
    
    // Prepare response
    $responseData = [
        'status' => 'success',
        'message' => 'Database connection test successful',
        'connection' => true,
        'timestamp' => time(),
        'server_info' => $conn->server_info,
        'php_version' => phpversion(),
        'bookings_table_exists' => $bookingsTableExists,
        'bookings_count' => $bookingsCount,
        'insert_test' => $insertTest
    ];
    
    // Add debug info if requested
    if ($debug) {
        $responseData['debug'] = [
            'host' => $dbHost,
            'database' => $dbName,
            'user' => $dbUser,
            'error_reporting' => error_reporting(),
            'display_errors' => ini_get('display_errors'),
            'request_time' => date('Y-m-d H:i:s')
        ];
    }
    
    echo json_encode($responseData);
    logTestConnection("Test completed successfully");
    
    // Close connection
    $conn->close();
    
} catch (Exception $e) {
    logTestConnection("Test failed", ['error' => $e->getMessage()]);
    
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'connection' => false,
        'timestamp' => time(),
        'debug' => $debug ? [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ] : null
    ]);
    
    http_response_code(500);
}
