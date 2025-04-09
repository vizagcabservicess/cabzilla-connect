
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

// Enable error reporting in case of issues
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Define a function to log database testing info
function logDbTest($message, $data = []) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/db_test_' . date('Y-m-d') . '.log';
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

try {
    // Database credentials - USING DIRECT CREDENTIALS FOR RELIABILITY
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    logDbTest("Trying database connection", [
        'host' => $dbHost,
        'dbname' => $dbName,
        'user' => $dbUser
    ]);
    
    // Create connection directly
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    if ($conn->connect_error) {
        logDbTest("Connection failed", ['error' => $conn->connect_error]);
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    logDbTest("Database connection successful", ['server_info' => $conn->server_info]);
    
    // Check if bookings table exists
    $tableResult = $conn->query("SHOW TABLES LIKE 'bookings'");
    $bookingsTableExists = $tableResult->num_rows > 0;
    
    logDbTest("Bookings table check", ['exists' => $bookingsTableExists]);
    
    if (!$bookingsTableExists) {
        // Create bookings table if it doesn't exist
        logDbTest("Creating bookings table", ['attempted' => true]);
        
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
            logDbTest("Failed to create bookings table", ['error' => $conn->error]);
            throw new Exception("Failed to create bookings table: " . $conn->error);
        }
        
        logDbTest("Bookings table created successfully");
        $bookingsTableExists = true;
    }
    
    // Try to insert a test booking
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
        
        logDbTest("Testing insert capability", ['sql' => $testInsertSql]);
        
        $testInsertResult = $conn->query($testInsertSql);
        $insertSuccess = $testInsertResult !== false;
        $insertId = $insertSuccess ? $conn->insert_id : 0;
        
        logDbTest("Insert test result", [
            'success' => $insertSuccess, 
            'insert_id' => $insertId,
            'error' => $insertSuccess ? null : $conn->error
        ]);
        
        // Delete the test record
        if ($insertSuccess) {
            $conn->query("DELETE FROM bookings WHERE booking_number = '$testBookingNumber'");
            logDbTest("Deleted test booking record", ['booking_number' => $testBookingNumber]);
        }
    }
    
    // Count existing bookings
    $bookingsCount = 0;
    $countResult = $conn->query("SELECT COUNT(*) as count FROM bookings");
    if ($countResult && $row = $countResult->fetch_assoc()) {
        $bookingsCount = (int)$row['count'];
    }
    
    logDbTest("Current bookings count", ['count' => $bookingsCount]);
    
    // Prepare response data
    $responseData = [
        'status' => 'success',
        'message' => 'Database connection test successful',
        'connection' => true,
        'timestamp' => time(),
        'server_info' => $conn->server_info,
        'php_version' => phpversion(),
        'bookings_table_exists' => $bookingsTableExists,
        'bookings_count' => $bookingsCount,
        'insert_test' => $insertSuccess ?? false
    ];
    
    // Add debug info if requested
    if ($debug) {
        $responseData['debug'] = [
            'host' => $dbHost,
            'database' => $dbName,
            'user' => $dbUser,
            'error_reporting' => error_reporting(),
            'display_errors' => ini_get('display_errors')
        ];
    }
    
    echo json_encode($responseData);
    logDbTest("Test connection response sent", ['status' => 'success']);
    
    $conn->close();
    
} catch (Exception $e) {
    logDbTest("Test connection failed", ['error' => $e->getMessage()]);
    
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
}
