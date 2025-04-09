
<?php
// Include required files
require_once __DIR__ . '/utils/database.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// CRITICAL: Set proper response headers for ALL scenarios
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Define a function to log booking-related info
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

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    http_response_code(405);
    exit;
}

// Log request data for debugging
logBooking("Book.php request initiated", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI'],
    'server_info' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
]);

// Get the request body
$requestBody = file_get_contents('php://input');
logBooking("Booking request raw data", ['raw' => $requestBody]);

$data = json_decode($requestBody, true);
if (!$data) {
    logBooking("JSON decode error", ['error' => json_last_error_msg()]);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Invalid JSON data: ' . json_last_error_msg()
    ]);
    http_response_code(400);
    exit;
}

logBooking("Booking request decoded data", $data);

// Different validation rules based on trip type
$requiredFields = [
    'pickupLocation', 'pickupDate', 'cabType', 'tripType', 'tripMode', 'totalAmount', 
    'passengerName', 'passengerPhone', 'passengerEmail'
];

// Handle complex object structures for locations
if (isset($data['pickupLocation']) && is_array($data['pickupLocation'])) {
    // Extract the address from the location object
    if (isset($data['pickupLocation']['address'])) {
        $data['pickupLocation'] = $data['pickupLocation']['address'];
    } elseif (isset($data['pickupLocation']['name'])) {
        $data['pickupLocation'] = $data['pickupLocation']['name'];
    }
}

if (isset($data['dropLocation']) && is_array($data['dropLocation'])) {
    // Extract the address from the location object
    if (isset($data['dropLocation']['address'])) {
        $data['dropLocation'] = $data['dropLocation']['address'];
    } elseif (isset($data['dropLocation']['name'])) {
        $data['dropLocation'] = $data['dropLocation']['name'];
    }
}

// For local trips, don't require distance or dropLocation but set a default distance based on hourly package
if (isset($data['tripType']) && $data['tripType'] === 'local') {
    // Set default distance based on hourly package if missing
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
                    $data['distance'] = 80; // Default to 80km if package not recognized
            }
            logBooking("Setting default distance for local trip", ['distance' => $data['distance']]);
        } else {
            $data['distance'] = 80; // Default fallback
            logBooking("No package specified, using default distance", ['distance' => 80]);
        }
    }
} else {
    // For non-local trips, distance is required
    $requiredFields[] = 'distance';
    $requiredFields[] = 'dropLocation';
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

// Connect to database using direct connection (no retries)
try {
    logBooking("Attempting direct database connection");
    
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
    
    logBooking("Database connection established successfully");
} catch (Exception $e) {
    logBooking("Database connection failed", ['error' => $e->getMessage()]);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    http_response_code(500);
    exit;
}

// Generate a unique booking number
$prefix = 'CB';
$timestamp = time();
$random = mt_rand(1000, 9999);
$bookingNumber = $prefix . $timestamp . $random;

// Debug log the booking number
logBooking("Generated booking number", ['booking_number' => $bookingNumber]);

// Begin transaction for data consistency
$conn->begin_transaction();

try {
    // Directly check if the bookings table exists
    $tableResult = $conn->query("SHOW TABLES LIKE 'bookings'");
    if ($tableResult->num_rows === 0) {
        // Create the bookings table if it doesn't exist
        logBooking("Creating bookings table", ['attempted' => true]);
        
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

    // USING DIRECT QUERY APPROACH - MORE RELIABLE
    // Prepare all the data values with proper escaping
    $bookingNumberEscaped = $conn->real_escape_string($bookingNumber);
    $pickupLocationEscaped = $conn->real_escape_string($data['pickupLocation']);
    $dropLocationEscaped = isset($data['dropLocation']) ? $conn->real_escape_string($data['dropLocation']) : '';
    $pickupDateEscaped = $conn->real_escape_string($data['pickupDate']);
    $returnDateEscaped = isset($data['returnDate']) && !empty($data['returnDate']) ? "'" . $conn->real_escape_string($data['returnDate']) . "'" : "NULL";
    $cabTypeEscaped = $conn->real_escape_string($data['cabType']);
    $distance = floatval($data['distance']);
    $tripTypeEscaped = $conn->real_escape_string($data['tripType']);
    $tripModeEscaped = $conn->real_escape_string($data['tripMode']);
    $totalAmount = floatval($data['totalAmount']);
    $passengerNameEscaped = $conn->real_escape_string($data['passengerName']);
    $passengerPhoneEscaped = $conn->real_escape_string($data['passengerPhone']);
    $passengerEmailEscaped = $conn->real_escape_string($data['passengerEmail']);
    $hourlyPackageEscaped = isset($data['hourlyPackage']) ? "'" . $conn->real_escape_string($data['hourlyPackage']) . "'" : "NULL";
    $tourIdEscaped = isset($data['tourId']) ? "'" . $conn->real_escape_string($data['tourId']) . "'" : "NULL";
    
    logBooking("Prepared data for direct insertion", [
        'booking_number' => $bookingNumberEscaped,
        'pickup_location' => $pickupLocationEscaped,
        'cab_type' => $cabTypeEscaped,
        'total_amount' => $totalAmount
    ]);

    // CRITICAL FIX: Use direct SQL query with properly formatted values
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
    
    logBooking("Executing direct insertion with SQL", ['sql' => $insertSql]);
    
    $insertResult = $conn->query($insertSql);
    if (!$insertResult) {
        logBooking("Direct insertion failed", ['error' => $conn->error]);
        throw new Exception("Direct insertion failed: " . $conn->error);
    }
    
    $bookingId = $conn->insert_id;
    logBooking("Booking created successfully", ['id' => $bookingId, 'booking_number' => $bookingNumber]);

    // Get the created booking 
    $selectSql = "SELECT * FROM bookings WHERE booking_number = '$bookingNumberEscaped'";
    $selectResult = $conn->query($selectSql);
    if (!$selectResult) {
        logBooking("Failed to fetch inserted booking", ['error' => $conn->error]);
        throw new Exception("Failed to fetch inserted booking: " . $conn->error);
    }
    
    $booking = $selectResult->fetch_assoc();
    if (!$booking) {
        logBooking("No booking found after insertion");
        throw new Exception("No booking found after insertion");
    }

    // Commit the transaction
    $conn->commit();
    logBooking("Transaction committed successfully");

    // Format the booking data for response
    $formattedBooking = [
        'id' => (int)$booking['id'],
        'userId' => $booking['user_id'] ? (int)$booking['user_id'] : null,
        'bookingNumber' => $booking['booking_number'],
        'pickupLocation' => $booking['pickup_location'],
        'dropLocation' => $booking['drop_location'],
        'pickupDate' => $booking['pickup_date'],
        'returnDate' => $booking['return_date'],
        'cabType' => $booking['cab_type'],
        'distance' => floatval($booking['distance']),
        'tripType' => $booking['trip_type'],
        'tripMode' => $booking['trip_mode'],
        'totalAmount' => floatval($booking['total_amount']),
        'status' => $booking['status'],
        'passengerName' => $booking['passenger_name'],
        'passengerPhone' => $booking['passenger_phone'],
        'passengerEmail' => $booking['passenger_email'],
        'createdAt' => $booking['created_at'],
        'updatedAt' => $booking['updated_at']
    ];

    // Send successful response
    logBooking("Sending success response", ['booking_id' => $booking['id']]);
    echo json_encode([
        'status' => 'success',
        'message' => 'Booking created successfully',
        'data' => $formattedBooking
    ]);
    http_response_code(201);

} catch (Exception $e) {
    // Roll back the transaction on error
    $conn->rollback();
    
    logBooking("Booking creation failed", [
        'error' => $e->getMessage(), 
        'trace' => $e->getTraceAsString()
    ]);
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to create booking: ' . $e->getMessage()
    ]);
    http_response_code(500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    logBooking("Closing database connection");
    $conn->close();
}
