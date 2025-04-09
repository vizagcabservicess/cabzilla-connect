
<?php
/**
 * Direct test for the booking API to check database connection and data insertion
 * This file is intentionally simplified and verbose for diagnostic purposes
 */

// Set proper response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Log to test-booking log file
function logTestMessage($message, $data = []) {
    global $logDir;
    $logFile = $logDir . '/test_booking_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log("[TEST_BOOKING] " . $logEntry);
}

// Helper function to output response and exit
function sendJsonResponse($data, $statusCode = 200) {
    // Ensure proper HTTP status code
    http_response_code($statusCode);
    
    // Clear any output buffering to prevent HTML contamination
    if (ob_get_level()) {
        ob_end_clean();
    }
    
    // Ensure proper JSON encoding
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Log the beginning of the test
logTestMessage("TEST BOOKING API STARTED", [
    'timestamp' => time(),
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI']
]);

// First test: Basic database connection
logTestMessage("Testing database connection");
try {
    // Database credentials
    $dbHost = 'localhost'; 
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    // Create connection
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    logTestMessage("Database connection established successfully");
    
    // Test simple query
    $testResult = $conn->query("SELECT 1");
    if (!$testResult) {
        throw new Exception("Test query failed: " . $conn->error);
    }
    
    logTestMessage("Simple test query executed successfully");
    
    // Test if bookings table exists
    $tableExistsResult = $conn->query("SHOW TABLES LIKE 'bookings'");
    $tableExists = $tableExistsResult->num_rows > 0;
    
    logTestMessage("Bookings table exists check", ['exists' => $tableExists]);
    
    if (!$tableExists) {
        // Create bookings table
        logTestMessage("Creating bookings table");
        
        $createTableSql = "
        CREATE TABLE bookings (
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
        
        $createTableResult = $conn->query($createTableSql);
        
        if (!$createTableResult) {
            throw new Exception("Failed to create bookings table: " . $conn->error);
        }
        
        logTestMessage("Bookings table created successfully");
        $tableExists = true;
    }
    
    // Get booking table structure
    $tableStructureResult = $conn->query("DESCRIBE bookings");
    $tableStructure = [];
    while ($row = $tableStructureResult->fetch_assoc()) {
        $tableStructure[] = $row;
    }
    
    logTestMessage("Bookings table structure", ['columns' => count($tableStructure)]);
    
    // Test 1: Direct simple insertion test - no prepared statement
    logTestMessage("DIRECT INSERTION TEST - no prepared statement");
    
    // Generate test booking number
    $testBookingNumber = 'TEST' . time() . rand(1000, 9999);
    
    // Begin transaction
    $conn->begin_transaction();
    
    // Direct insertion without prepared statement
    $directSql = "INSERT INTO bookings (booking_number, pickup_location, status) VALUES ('$testBookingNumber', 'Direct Test', 'test')";
    $directResult = $conn->query($directSql);
    
    if (!$directResult) {
        throw new Exception("Direct insertion failed: " . $conn->error);
    }
    
    logTestMessage("Direct insertion successful", ['booking_number' => $testBookingNumber]);
    
    // Direct select
    $directSelectResult = $conn->query("SELECT id, booking_number FROM bookings WHERE booking_number = '$testBookingNumber'");
    $directBooking = $directSelectResult->fetch_assoc();
    
    logTestMessage("Direct select successful", ['result' => $directBooking]);
    
    // Direct delete
    $conn->query("DELETE FROM bookings WHERE booking_number = '$testBookingNumber'");
    logTestMessage("Direct deletion successful");
    
    // Commit transaction
    $conn->commit();
    
    // Test 2: Basic prepared statement test
    logTestMessage("BASIC PREPARED STATEMENT TEST");
    
    // Generate test booking number
    $testBookingNumber = 'TEST' . time() . rand(1000, 9999);
    
    // Begin transaction
    $conn->begin_transaction();
    
    // Basic prepared statement
    $basicSql = "INSERT INTO bookings (booking_number, pickup_location, status) VALUES (?, ?, ?)";
    $basicStmt = $conn->prepare($basicSql);
    
    if (!$basicStmt) {
        throw new Exception("Basic prepare statement failed: " . $conn->error);
    }
    
    $testStatus = "test";
    $testLocation = "Basic Test";
    
    $basicStmt->bind_param("sss", $testBookingNumber, $testLocation, $testStatus);
    
    if (!$basicStmt->execute()) {
        throw new Exception("Basic execute statement failed: " . $basicStmt->error);
    }
    
    logTestMessage("Basic prepared statement successful", ['booking_number' => $testBookingNumber]);
    
    // Select with prepared statement
    $selectSql = "SELECT id, booking_number FROM bookings WHERE booking_number = ?";
    $selectStmt = $conn->prepare($selectSql);
    $selectStmt->bind_param("s", $testBookingNumber);
    $selectStmt->execute();
    $selectResult = $selectStmt->get_result();
    $selectedBooking = $selectResult->fetch_assoc();
    
    logTestMessage("Select prepared statement successful", ['result' => $selectedBooking]);
    
    // Delete with prepared statement
    $deleteSql = "DELETE FROM bookings WHERE booking_number = ?";
    $deleteStmt = $conn->prepare($deleteSql);
    $deleteStmt->bind_param("s", $testBookingNumber);
    $deleteStmt->execute();
    
    logTestMessage("Delete prepared statement successful");
    
    // Commit transaction
    $conn->commit();
    
    // Test 3: Full booking insertion test
    logTestMessage("FULL BOOKING INSERTION TEST");
    
    // Generate test booking number
    $testBookingNumber = 'TEST' . time() . rand(1000, 9999);
    
    // Begin transaction
    $conn->begin_transaction();
    
    // Step 1: First insert the essential fields
    $step1Sql = "INSERT INTO bookings (
        booking_number, 
        pickup_location, 
        cab_type, 
        trip_type,
        status, 
        pickup_date, 
        passenger_name, 
        passenger_phone, 
        passenger_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $step1Stmt = $conn->prepare($step1Sql);
    
    if (!$step1Stmt) {
        throw new Exception("Step 1 prepare statement failed: " . $conn->error);
    }
    
    $pickupLocation = "Test Location";
    $cabType = "Sedan";
    $tripType = "local";
    $status = "pending";
    $pickupDate = date('Y-m-d H:i:s');
    $passengerName = "Test User";
    $passengerPhone = "1234567890";
    $passengerEmail = "test@example.com";
    
    $step1Stmt->bind_param(
        "sssssssss",
        $testBookingNumber, 
        $pickupLocation, 
        $cabType, 
        $tripType, 
        $status, 
        $pickupDate,
        $passengerName, 
        $passengerPhone, 
        $passengerEmail
    );
    
    if (!$step1Stmt->execute()) {
        throw new Exception("Step 1 execute statement failed: " . $step1Stmt->error);
    }
    
    logTestMessage("Step 1 insertion successful");
    
    // Step 2: Update with additional fields
    $step2Sql = "UPDATE bookings SET 
        drop_location = ?, 
        distance = ?, 
        trip_mode = ?, 
        total_amount = ?
    WHERE booking_number = ?";
    
    $step2Stmt = $conn->prepare($step2Sql);
    
    if (!$step2Stmt) {
        throw new Exception("Step 2 prepare statement failed: " . $conn->error);
    }
    
    $dropLocation = "Test Drop";
    $distance = 10.5;
    $tripMode = "one-way";
    $totalAmount = 500.00;
    
    $step2Stmt->bind_param(
        "sdsds",
        $dropLocation, 
        $distance, 
        $tripMode, 
        $totalAmount, 
        $testBookingNumber
    );
    
    if (!$step2Stmt->execute()) {
        throw new Exception("Step 2 execute statement failed: " . $step2Stmt->error);
    }
    
    logTestMessage("Step 2 update successful");
    
    // Select final booking
    $finalSelectSql = "SELECT * FROM bookings WHERE booking_number = ?";
    $finalSelectStmt = $conn->prepare($finalSelectSql);
    $finalSelectStmt->bind_param("s", $testBookingNumber);
    $finalSelectStmt->execute();
    $finalSelectResult = $finalSelectStmt->get_result();
    $finalBooking = $finalSelectResult->fetch_assoc();
    
    logTestMessage("Final select successful", ['result' => $finalBooking]);
    
    // Commit transaction
    $conn->commit();
    
    // Clean up
    $conn->query("DELETE FROM bookings WHERE booking_number LIKE 'TEST%'");
    logTestMessage("Test cleanup completed");
    
    // Close database connection
    $conn->close();
    
    // Send success response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'All booking tests passed successfully',
        'tests' => [
            'database_connection' => true,
            'table_exists' => $tableExists,
            'direct_insertion' => true,
            'prepared_statement' => true,
            'full_booking' => true
        ],
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    // Log the error
    logTestMessage("TEST FAILED", [
        'error_message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    // Rollback any ongoing transaction
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }
    
    // Close connection if open
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    
    // Send error response
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Test booking failed: ' . $e->getMessage(),
        'error_details' => [
            'message' => $e->getMessage(),
            'trace' => explode("\n", $e->getTraceAsString())
        ],
        'timestamp' => time()
    ], 500);
}
