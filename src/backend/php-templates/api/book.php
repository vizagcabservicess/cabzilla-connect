
<?php
/**
 * CRITICAL API ENDPOINT: Creates new bookings
 */

// First, set all headers upfront
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting and logging
ini_set('display_errors', 0); // Don't display errors to client
error_reporting(E_ALL); // But report all errors in logs

// Create logs directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Define booking log function with timestamp
function logBooking($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/booking_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        } else {
            $logEntry .= ": " . $data;
        }
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry); // Also log to PHP error log
}

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logBooking("Method not allowed", $_SERVER['REQUEST_METHOD']);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    http_response_code(405);
    exit;
}

// Log the start of booking request
logBooking("Booking request started", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'remote_addr' => $_SERVER['REMOTE_ADDR']
]);

try {
    // Read and parse the request body
    $requestBody = file_get_contents('php://input');
    logBooking("Received request body", ['length' => strlen($requestBody)]);
    
    // Parse JSON data with error handling
    $data = json_decode($requestBody, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON data: " . json_last_error_msg());
    }
    
    // Log parsed data (without sensitive information)
    $logData = $data;
    if (isset($logData['passengerPhone'])) {
        $logData['passengerPhone'] = substr($logData['passengerPhone'], 0, 3) . '****' . substr($logData['passengerPhone'], -3);
    }
    if (isset($logData['passengerEmail'])) {
        $logData['passengerEmail'] = substr($logData['passengerEmail'], 0, 3) . '****' . strstr($logData['passengerEmail'], '@');
    }
    logBooking("Parsed booking data", $logData);
    
    // Validate required fields
    $requiredFields = [
        'pickupLocation', 'cabType', 'tripType', 'tripMode', 
        'totalAmount', 'passengerName', 'passengerPhone', 'passengerEmail', 'pickupDate'
    ];
    
    // For non-local trips, require drop location
    if (!isset($data['tripType']) || $data['tripType'] !== 'local') {
        $requiredFields[] = 'dropLocation';
    }
    
    // Validate all required fields
    $missingFields = [];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missingFields[] = $field;
        }
    }
    
    if (!empty($missingFields)) {
        throw new Exception("Missing required fields: " . implode(', ', $missingFields));
    }
    
    // Database connection - hard-coded for maximum reliability
    logBooking("Attempting database connection");
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");
    logBooking("Database connection established");
    
    // Test connection with a simple query
    $testQuery = $conn->query("SELECT 1");
    if (!$testQuery) {
        throw new Exception("Database test query failed: " . $conn->error);
    }
    logBooking("Database test query successful");
    
    // Generate unique booking number
    $prefix = 'CB';
    $timestamp = time();
    $random = mt_rand(1000, 9999);
    $bookingNumber = $prefix . $timestamp . $random;
    logBooking("Generated booking number", $bookingNumber);
    
    // Begin transaction
    $conn->begin_transaction();
    logBooking("Transaction started");
    
    // Check if bookings table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'bookings'");
    if ($tableCheck->num_rows === 0) {
        logBooking("Bookings table doesn't exist, creating it");
        
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
        
        $tableResult = $conn->query($createTableSql);
        if (!$tableResult) {
            throw new Exception("Failed to create bookings table: " . $conn->error);
        }
        logBooking("Bookings table created successfully");
    }
    
    // Clean and escape input data
    $bookingNumberEscaped = $conn->real_escape_string($bookingNumber);
    $pickupLocationEscaped = $conn->real_escape_string($data['pickupLocation']);
    $dropLocationEscaped = isset($data['dropLocation']) ? $conn->real_escape_string($data['dropLocation']) : '';
    $pickupDateEscaped = $conn->real_escape_string($data['pickupDate']);
    $returnDateEscaped = isset($data['returnDate']) && !empty($data['returnDate']) ? "'" . $conn->real_escape_string($data['returnDate']) . "'" : "NULL";
    $cabTypeEscaped = $conn->real_escape_string($data['cabType']);
    $distanceValue = isset($data['distance']) && is_numeric($data['distance']) ? (float)$data['distance'] : 0;
    $tripTypeEscaped = $conn->real_escape_string($data['tripType']);
    $tripModeEscaped = $conn->real_escape_string($data['tripMode']);
    $totalAmountValue = isset($data['totalAmount']) && is_numeric($data['totalAmount']) ? (float)$data['totalAmount'] : 0;
    $passengerNameEscaped = $conn->real_escape_string($data['passengerName']);
    $passengerPhoneEscaped = $conn->real_escape_string($data['passengerPhone']);
    $passengerEmailEscaped = $conn->real_escape_string($data['passengerEmail']);
    $hourlyPackageEscaped = isset($data['hourlyPackage']) ? "'" . $conn->real_escape_string($data['hourlyPackage']) . "'" : "NULL";
    $tourIdEscaped = isset($data['tourId']) ? "'" . $conn->real_escape_string($data['tourId']) . "'" : "NULL";
    
    // Log the prepared data
    logBooking("Data prepared for insertion", [
        'booking_number' => $bookingNumberEscaped,
        'pickup_location' => $pickupLocationEscaped,
        'trip_type' => $tripTypeEscaped,
        'total_amount' => $totalAmountValue
    ]);
    
    // Use simple insert query to avoid prepared statement issues
    $insertSql = "
    INSERT INTO bookings (
        booking_number, pickup_location, drop_location, pickup_date, 
        return_date, cab_type, distance, trip_type, trip_mode, 
        total_amount, passenger_name, passenger_phone, passenger_email, 
        hourly_package, tour_id
    ) VALUES (
        '$bookingNumberEscaped', '$pickupLocationEscaped', '$dropLocationEscaped', '$pickupDateEscaped',
        $returnDateEscaped, '$cabTypeEscaped', $distanceValue, '$tripTypeEscaped', '$tripModeEscaped',
        $totalAmountValue, '$passengerNameEscaped', '$passengerPhoneEscaped', '$passengerEmailEscaped',
        $hourlyPackageEscaped, $tourIdEscaped
    )";
    
    logBooking("Executing SQL insert", ['sql' => $insertSql]);
    
    // Execute the insert
    $insertResult = $conn->query($insertSql);
    if (!$insertResult) {
        throw new Exception("Insertion failed: " . $conn->error . " (SQL: $insertSql)");
    }
    
    $bookingId = $conn->insert_id;
    logBooking("Booking inserted successfully", ['id' => $bookingId]);
    
    // Verify insertion by selecting the record
    $verifyQuery = "SELECT * FROM bookings WHERE id = $bookingId";
    $verifyResult = $conn->query($verifyQuery);
    
    if (!$verifyResult || $verifyResult->num_rows === 0) {
        throw new Exception("Failed to verify booking was inserted (id = $bookingId)");
    }
    
    $booking = $verifyResult->fetch_assoc();
    logBooking("Booking verification successful", [
        'id' => $booking['id'],
        'booking_number' => $booking['booking_number']
    ]);
    
    // Commit the transaction
    $conn->commit();
    logBooking("Transaction committed successfully");
    
    // Format response
    $formattedBooking = [
        'id' => (int)$booking['id'],
        'bookingNumber' => $booking['booking_number'],
        'pickupLocation' => $booking['pickup_location'],
        'dropLocation' => $booking['drop_location'],
        'pickupDate' => $booking['pickup_date'],
        'returnDate' => $booking['return_date'],
        'cabType' => $booking['cab_type'],
        'distance' => (float)$booking['distance'],
        'tripType' => $booking['trip_type'],
        'tripMode' => $booking['trip_mode'],
        'totalAmount' => (float)$booking['total_amount'],
        'status' => $booking['status'],
        'passengerName' => $booking['passenger_name'],
        'passengerPhone' => $booking['passenger_phone'],
        'passengerEmail' => $booking['passenger_email']
    ];
    
    // Send success response
    $response = [
        'status' => 'success',
        'message' => 'Booking created successfully',
        'data' => $formattedBooking
    ];
    
    logBooking("Sending success response", ['booking_id' => $booking['id']]);
    echo json_encode($response);
    
} catch (Exception $e) {
    // Rollback transaction if started
    if (isset($conn) && $conn instanceof mysqli && !$conn->connect_error) {
        try {
            $conn->rollback();
            logBooking("Transaction rolled back");
        } catch (Exception $rollbackException) {
            logBooking("Error during rollback", $rollbackException->getMessage());
        }
    }
    
    logBooking("ERROR: Booking creation failed", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    // Send error response
    $response = [
        'status' => 'error',
        'message' => 'Failed to create booking: ' . $e->getMessage()
    ];
    
    echo json_encode($response);
    http_response_code(500);
} finally {
    // Close connection if exists
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
        logBooking("Database connection closed");
    }
    
    logBooking("Request processing complete");
}
