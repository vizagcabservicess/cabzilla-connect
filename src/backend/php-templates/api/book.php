
<?php
/**
 * CRITICAL API ENDPOINT: Creates new bookings
 * DO NOT MODIFY WITHOUT TESTING!
 */

// First, set all headers upfront to avoid any output issues
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error logging for this critical file
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    http_response_code(405);
    exit;
}

// Define booking log function
function logBooking($message, $data = []) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/booking_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry);
}

// Log request start
logBooking("Booking request started", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI']
]);

// Get request data
$requestBody = file_get_contents('php://input');
logBooking("Received request data", ['raw_length' => strlen($requestBody)]);

// Parse JSON data
$data = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    logBooking("Invalid JSON data", ['error' => json_last_error_msg()]);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON data: ' . json_last_error_msg()]);
    http_response_code(400);
    exit;
}

// Log parsed data (without sensitive fields)
$logData = $data;
if (isset($logData['passengerPhone'])) $logData['passengerPhone'] = '****' . substr($logData['passengerPhone'], -4);
if (isset($logData['passengerEmail'])) $logData['passengerEmail'] = '****' . substr($logData['passengerEmail'], -10);
logBooking("Parsed booking data", $logData);

// Check required fields based on trip type
$requiredFields = [
    'pickupLocation', 'pickupDate', 'cabType', 'tripType', 'tripMode', 
    'totalAmount', 'passengerName', 'passengerPhone', 'passengerEmail'
];

// For non-local trips, require drop location and distance
if (!isset($data['tripType']) || $data['tripType'] !== 'local') {
    $requiredFields[] = 'dropLocation';
    $requiredFields[] = 'distance';
}

// Handle object structures for locations (common in frontend frameworks)
if (isset($data['pickupLocation']) && is_array($data['pickupLocation'])) {
    if (isset($data['pickupLocation']['address'])) {
        $data['pickupLocation'] = $data['pickupLocation']['address'];
    } elseif (isset($data['pickupLocation']['name'])) {
        $data['pickupLocation'] = $data['pickupLocation']['name'];
    }
}

if (isset($data['dropLocation']) && is_array($data['dropLocation'])) {
    if (isset($data['dropLocation']['address'])) {
        $data['dropLocation'] = $data['dropLocation']['address'];
    } elseif (isset($data['dropLocation']['name'])) {
        $data['dropLocation'] = $data['dropLocation']['name'];
    }
}

// For local trips with hourly packages, set default distance
if (isset($data['tripType']) && $data['tripType'] === 'local') {
    if (!isset($data['distance']) || empty($data['distance']) || $data['distance'] == 0) {
        if (isset($data['hourlyPackage'])) {
            switch ($data['hourlyPackage']) {
                case '8hrs-80km':
                    $data['distance'] = 80;
                    break;
                case '10hrs-100km':
                    $data['distance'] = 100;
                    break;
                default:
                    $data['distance'] = 80;
            }
        } else {
            $data['distance'] = 80; // Default fallback
        }
        logBooking("Set default distance for local trip", ['distance' => $data['distance']]);
    }
}

// Validate required fields
$missingFields = [];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    logBooking("Missing required fields", ['fields' => $missingFields]);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Missing required fields: ' . implode(', ', $missingFields)
    ]);
    http_response_code(400);
    exit;
}

// DIRECT DATABASE CONNECTION - maximum reliability approach
try {
    // Database credentials - directly hardcoded for reliability
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    logBooking("Creating database connection", ['host' => $dbHost, 'db' => $dbName]);
    
    // Create connection
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    // Check connection
    if ($conn->connect_error) {
        logBooking("Database connection failed", ['error' => $conn->connect_error]);
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Set charset
    $conn->set_charset("utf8mb4");
    
    logBooking("Database connection established");
    
    // Generate unique booking number
    $prefix = 'CB';
    $timestamp = time();
    $random = mt_rand(1000, 9999);
    $bookingNumber = $prefix . $timestamp . $random;
    
    logBooking("Generated booking number", ['number' => $bookingNumber]);
    
    // Begin transaction
    $conn->begin_transaction();
    logBooking("Transaction started");
    
    // Check if bookings table exists, create if not
    $tableResult = $conn->query("SHOW TABLES LIKE 'bookings'");
    if ($tableResult->num_rows === 0) {
        logBooking("Bookings table doesn't exist, creating");
        
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
        
        $tableCreationResult = $conn->query($createTableSql);
        if (!$tableCreationResult) {
            logBooking("Failed to create bookings table", ['error' => $conn->error]);
            throw new Exception("Failed to create bookings table: " . $conn->error);
        }
        
        logBooking("Created bookings table successfully");
    }
    
    // Prepare data with proper escaping
    $bookingNumberEscaped = $conn->real_escape_string($bookingNumber);
    $pickupLocationEscaped = $conn->real_escape_string($data['pickupLocation']);
    $dropLocationEscaped = isset($data['dropLocation']) ? $conn->real_escape_string($data['dropLocation']) : '';
    $pickupDateEscaped = $conn->real_escape_string($data['pickupDate']);
    $returnDateEscaped = isset($data['returnDate']) && !empty($data['returnDate']) ? "'" . $conn->real_escape_string($data['returnDate']) . "'" : "NULL";
    $cabTypeEscaped = $conn->real_escape_string($data['cabType']);
    $distance = isset($data['distance']) ? floatval($data['distance']) : 0;
    $tripTypeEscaped = $conn->real_escape_string($data['tripType']);
    $tripModeEscaped = $conn->real_escape_string($data['tripMode']);
    $totalAmount = floatval($data['totalAmount']);
    $passengerNameEscaped = $conn->real_escape_string($data['passengerName']);
    $passengerPhoneEscaped = $conn->real_escape_string($data['passengerPhone']);
    $passengerEmailEscaped = $conn->real_escape_string($data['passengerEmail']);
    $hourlyPackageEscaped = isset($data['hourlyPackage']) ? "'" . $conn->real_escape_string($data['hourlyPackage']) . "'" : "NULL";
    $tourIdEscaped = isset($data['tourId']) ? "'" . $conn->real_escape_string($data['tourId']) . "'" : "NULL";
    
    logBooking("Data prepared for insertion", [
        'number' => $bookingNumberEscaped,
        'location' => $pickupLocationEscaped,
        'type' => $tripTypeEscaped
    ]);
    
    // CRITICAL FIX: Use direct SQL for insertion with all required fields
    $insertSql = "
    INSERT INTO bookings (
        booking_number, pickup_location, drop_location, pickup_date, 
        return_date, cab_type, distance, trip_type, trip_mode, 
        total_amount, status, passenger_name, passenger_phone, 
        passenger_email, hourly_package, tour_id
    ) VALUES (
        '$bookingNumberEscaped', '$pickupLocationEscaped', '$dropLocationEscaped', '$pickupDateEscaped',
        $returnDateEscaped, '$cabTypeEscaped', $distance, '$tripTypeEscaped', '$tripModeEscaped',
        $totalAmount, 'pending', '$passengerNameEscaped', '$passengerPhoneEscaped',
        '$passengerEmailEscaped', $hourlyPackageEscaped, $tourIdEscaped
    )";
    
    logBooking("Executing SQL insert", ['sql' => $insertSql]);
    
    $insertResult = $conn->query($insertSql);
    if (!$insertResult) {
        logBooking("Insertion failed", ['error' => $conn->error]);
        throw new Exception("Insertion failed: " . $conn->error);
    }
    
    $bookingId = $conn->insert_id;
    logBooking("Booking inserted successfully", ['id' => $bookingId]);
    
    // Verify the booking was created by selecting it
    $verifySql = "SELECT * FROM bookings WHERE id = $bookingId";
    $verifyResult = $conn->query($verifySql);
    
    if (!$verifyResult || $verifyResult->num_rows === 0) {
        logBooking("Couldn't verify booking", ['error' => $conn->error]);
        throw new Exception("Failed to verify booking was inserted");
    }
    
    $booking = $verifyResult->fetch_assoc();
    logBooking("Booking verified", ['booking_id' => $booking['id'], 'number' => $booking['booking_number']]);
    
    // Commit transaction
    $conn->commit();
    logBooking("Transaction committed successfully");
    
    // Format response data
    $formattedBooking = [
        'id' => (int)$booking['id'],
        'userId' => $booking['user_id'] ? (int)$booking['user_id'] : null,
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
        'passengerEmail' => $booking['passenger_email'],
        'createdAt' => $booking['created_at'],
        'updatedAt' => $booking['updated_at']
    ];
    
    // Send success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Booking created successfully',
        'data' => $formattedBooking
    ]);
    logBooking("Success response sent", ['id' => $booking['id']]);
    
} catch (Exception $e) {
    // Rollback transaction if active
    if (isset($conn) && $conn instanceof mysqli && !$conn->connect_error) {
        $conn->rollback();
        logBooking("Transaction rolled back");
    }
    
    logBooking("Booking creation failed", ['error' => $e->getMessage()]);
    
    // Send error response
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to create booking: ' . $e->getMessage()
    ]);
    http_response_code(500);
}

// Close connection if exists
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
    logBooking("Database connection closed");
}

logBooking("Request processing complete");
