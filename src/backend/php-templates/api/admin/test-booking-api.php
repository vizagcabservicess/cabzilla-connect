
<?php
/**
 * Diagnostic endpoint for testing booking API functionality
 */

// Set headers first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database utilities
require_once __DIR__ . '/../utils/database.php';

// Create response array
$response = [
    'status' => 'success',
    'message' => 'Booking API test endpoint is working',
    'timestamp' => date('Y-m-d H:i:s'),
    'request_info' => [
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'],
        'headers' => getallheaders(),
        'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
    ],
    'php_info' => [
        'version' => PHP_VERSION,
        'extensions' => get_loaded_extensions()
    ]
];

// Log function for the test
function logTestMessage($message) {
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/test_booking_api_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
    
    error_log($message);
}

logTestMessage("Test booking API was called");

// Test database connection
$response['database_test'] = [
    'attempted' => true,
    'success' => false,
    'message' => 'Not tested yet',
    'error' => null,
    'config_file_exists' => false,
    'bookings_table_exists' => false,
    'bookings_count' => 0
];

try {
    // Check if config file exists
    $configPath = __DIR__ . '/../../config.php';
    $response['database_test']['config_file_exists'] = file_exists($configPath);
    
    logTestMessage("Config file exists: " . ($response['database_test']['config_file_exists'] ? 'Yes' : 'No'));
    
    // First try direct connection
    logTestMessage("Attempting direct database connection");
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    if ($conn->connect_error) {
        throw new Exception("Direct connection failed: " . $conn->connect_error);
    }
    
    logTestMessage("Direct database connection succeeded");
    $response['database_test']['direct_connection'] = true;
    
    // Set charset for proper handling of special characters
    $conn->set_charset("utf8mb4");
    
    // Test a simple query to confirm connection is working
    $testResult = $conn->query("SELECT 1 as test");
    if (!$testResult) {
        throw new Exception("Test query failed: " . $conn->error);
    }
    
    $testRow = $testResult->fetch_assoc();
    logTestMessage("Test query result: " . ($testRow['test'] ?? 'null'));
    
    $response['database_test']['success'] = true;
    $response['database_test']['message'] = "Successfully connected to database";
    
    // Check if bookings table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'bookings'");
    $response['database_test']['bookings_table_exists'] = $tableCheck->num_rows > 0;
    
    logTestMessage("Bookings table exists: " . ($response['database_test']['bookings_table_exists'] ? 'Yes' : 'No'));
    
    if ($response['database_test']['bookings_table_exists']) {
        // Get booking count
        $countResult = $conn->query("SELECT COUNT(*) as count FROM bookings");
        $countData = $countResult->fetch_assoc();
        $response['database_test']['bookings_count'] = (int)$countData['count'];
        
        logTestMessage("Bookings count: " . $response['database_test']['bookings_count']);
        
        // Get a sample booking for verification
        $sampleResult = $conn->query("SELECT * FROM bookings ORDER BY id DESC LIMIT 1");
        if ($sampleResult && $sampleResult->num_rows > 0) {
            $sample = $sampleResult->fetch_assoc();
            $response['database_test']['sample_booking'] = [
                'id' => (int)$sample['id'],
                'booking_number' => $sample['booking_number'],
                'status' => $sample['status'],
                'passenger_name' => $sample['passenger_name'],
                'pickup_location' => $sample['pickup_location'],
                'created_at' => $sample['created_at']
            ];
            
            logTestMessage("Retrieved sample booking: ID=" . $sample['id'] . ", Number=" . $sample['booking_number']);
        } else {
            logTestMessage("No sample booking found");
        }
    } else {
        // Create the bookings table if it doesn't exist
        logTestMessage("Attempting to create bookings table");
        
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $tableCreationResult = $conn->query($createTableSql);
        $response['database_test']['table_creation_attempted'] = true;
        $response['database_test']['table_creation_success'] = !!$tableCreationResult;
        
        if (!$tableCreationResult) {
            logTestMessage("Failed to create bookings table: " . $conn->error);
            $response['database_test']['table_creation_error'] = $conn->error;
        } else {
            logTestMessage("Successfully created bookings table");
        }
        
        // Check if table was created
        $recheckTable = $conn->query("SHOW TABLES LIKE 'bookings'");
        $tableNowExists = $recheckTable->num_rows > 0;
        $response['database_test']['table_now_exists'] = $tableNowExists;
        
        logTestMessage("Table now exists: " . ($tableNowExists ? 'Yes' : 'No'));
    }
    
    // Try to insert a test booking (this is crucial to test the full flow)
    if ($response['database_test']['bookings_table_exists'] || $response['database_test']['table_now_exists']) {
        $response['database_test']['test_insert_attempted'] = true;
        
        // Generate test booking number
        $testBookingNumber = 'TEST' . time() . mt_rand(1000, 9999);
        logTestMessage("Generated test booking number: " . $testBookingNumber);
        
        // Start transaction to safely test and roll back
        $conn->begin_transaction();
        
        // Prepare the insert statement - use very simple prepared statement to minimize potential issues
        // FIXED: The problematic statement - corrected parameter binding
        $testSql = "INSERT INTO bookings 
            (booking_number, pickup_location, drop_location, pickup_date, 
             cab_type, distance, trip_type, trip_mode, 
             total_amount, passenger_name, passenger_phone, passenger_email, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
        logTestMessage("Preparing insert statement");
        $testStmt = $conn->prepare($testSql);
        
        if (!$testStmt) {
            logTestMessage("Failed to prepare statement: " . $conn->error);
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        // Test data
        $pickupLocation = "Test Pickup";
        $dropLocation = "Test Dropoff";
        $pickupDate = date('Y-m-d H:i:s');
        $cabType = "sedan";
        $distance = 10.5;
        $tripType = "local";
        $tripMode = "one-way";
        $totalAmount = 500.00;
        $passengerName = "Test User";
        $passengerPhone = "1234567890";
        $passengerEmail = "test@example.com";
        $status = "test";
        
        logTestMessage("Binding parameters to insert statement");
        
        // FIXED: Make sure the binding string matches the number of parameters
        $testStmt->bind_param(
            "ssssdsssdssss",
            $testBookingNumber, $pickupLocation, $dropLocation, $pickupDate,
            $cabType, $distance, $tripType, $tripMode,
            $totalAmount, $passengerName, $passengerPhone, $passengerEmail, $status
        );
        
        logTestMessage("Executing insert statement");
        $testInsertSuccess = $testStmt->execute();
        $response['database_test']['test_insert_success'] = $testInsertSuccess;
        
        if (!$testInsertSuccess) {
            logTestMessage("Insert failed: " . $testStmt->error);
            $response['database_test']['test_insert_error'] = $testStmt->error;
        } else {
            logTestMessage("Insert succeeded, insert_id=" . $conn->insert_id);
            $testBookingId = $conn->insert_id;
            $response['database_test']['test_booking_id'] = $testBookingId;
            
            // Verify the record exists
            $verifyStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            $verifyStmt->bind_param("i", $testBookingId);
            $verifyStmt->execute();
            $verifyResult = $verifyStmt->get_result();
            
            if ($verifyResult && $verifyResult->num_rows > 0) {
                $verifyRow = $verifyResult->fetch_assoc();
                logTestMessage("Verified booking exists with number: " . $verifyRow['booking_number']);
                $response['database_test']['verification_success'] = true;
            } else {
                logTestMessage("Failed to verify booking exists");
                $response['database_test']['verification_success'] = false;
            }
            
            // Delete the test booking to clean up
            logTestMessage("Deleting test booking");
            $deleteSql = "DELETE FROM bookings WHERE id = ?";
            $deleteStmt = $conn->prepare($deleteSql);
            $deleteStmt->bind_param("i", $testBookingId);
            $deleteSuccess = $deleteStmt->execute();
            
            $response['database_test']['test_delete_success'] = $deleteSuccess;
            
            if (!$deleteSuccess) {
                logTestMessage("Delete failed: " . $deleteStmt->error);
            } else {
                logTestMessage("Delete succeeded");
            }
        }
        
        // Rollback the transaction regardless of success to ensure no test data remains
        logTestMessage("Rolling back transaction");
        $conn->rollback();
    }
    
    // Close database connection
    $conn->close();
    logTestMessage("Database connection closed");
    
} catch (Exception $e) {
    logTestMessage("Exception: " . $e->getMessage());
    $response['database_test']['success'] = false;
    $response['database_test']['message'] = "Database test failed";
    $response['database_test']['error'] = $e->getMessage();
    $response['database_test']['error_trace'] = $e->getTraceAsString();
}

// Output the response
logTestMessage("Sending response: " . json_encode(['status' => $response['status'], 'db_success' => $response['database_test']['success']]));
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
