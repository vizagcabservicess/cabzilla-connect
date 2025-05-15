<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Check if db_helper exists and include it
if (file_exists(__DIR__ . '/../common/db_helper.php')) {
    require_once __DIR__ . '/../common/db_helper.php';
}

// Set response headers first - CRUCIAL to ensure we get JSON, not HTML
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Forward POST requests to create-booking.php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require __DIR__ . '/create-booking.php';
    exit;
}

// Only allow GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Debug mode for detailed response
$debugMode = isset($_GET['debug']) || isset($_GET['dev_mode']);
if ($debugMode) {
    error_log("Admin Bookings API Debug Mode: ON");
    error_log("Request Headers: " . json_encode(getallheaders()));
    error_log("Request Params: " . json_encode($_GET));
}

// Create logging directory if it doesn't exist
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/admin_bookings_api_' . date('Y-m-d') . '.log';

// Helper logging function
function logMessage($message, $data = null) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $logMessage .= ": " . json_encode($data);
        } else {
            $logMessage .= ": $data";
        }
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
    error_log($logMessage);
}

logMessage("Admin bookings request received", ['headers' => array_keys(getallheaders())]);

// Connect to database
try {
    // Try using the helper function first
    $conn = null;
    if (function_exists('getDbConnectionWithRetry')) {
        $conn = getDbConnectionWithRetry(2);
    } else if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
    } else {
        // Direct connection as fallback
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
    }
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // Check if bookings table exists - but don't create if missing
    $tableExists = $conn->query("SHOW TABLES LIKE 'bookings'");
    if (!$tableExists || $tableExists->num_rows === 0) {
        logMessage("Bookings table doesn't exist");
        throw new Exception("Bookings table doesn't exist");
    }
    
    // Admin sees all bookings
    $sql = "SELECT * FROM bookings ORDER BY created_at DESC";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        logMessage("Failed to prepare admin bookings query", ['error' => $conn->error]);
        throw new Exception("Failed to prepare query: " . $conn->error);
    }
    
    $success = $stmt->execute();
    
    if (!$success) {
        logMessage("Failed to execute admin bookings query", ['error' => $stmt->error]);
        throw new Exception("Failed to execute query: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if (!$result) {
        logMessage("Failed to get result", ['error' => $stmt->error]);
        throw new Exception("Failed to get result: " . $stmt->error);
    }
    
    // Create an array of bookings
    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        $booking = [
            'id' => (int)$row['id'],
            'userId' => isset($row['user_id']) ? (int)$row['user_id'] : null,
            'bookingNumber' => $row['booking_number'] ?? ('BK' . rand(10000, 99999)),
            'pickupLocation' => $row['pickup_location'],
            'dropLocation' => $row['drop_location'],
            'pickupDate' => $row['pickup_date'],
            'returnDate' => $row['return_date'],
            'cabType' => $row['cab_type'],
            'distance' => (float)($row['distance'] ?? 0),
            'tripType' => $row['trip_type'],
            'tripMode' => $row['trip_mode'],
            'totalAmount' => (float)$row['total_amount'],
            'status' => $row['status'],
            'passengerName' => $row['passenger_name'],
            'passengerPhone' => $row['passenger_phone'],
            'passengerEmail' => $row['passenger_email'],
            'driverName' => $row['driver_name'] ?? null,
            'driverPhone' => $row['driver_phone'] ?? null,
            'vehicleNumber' => $row['vehicle_number'] ?? null,
            'billingAddress' => $row['billing_address'] ?? null,
            'extraCharges' => json_decode($row['extra_charges'] ?? '[]'),
            'payment_status' => $row['payment_status'] ?? 'pending',
            'payment_method' => $row['payment_method'] ?? '',
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? $row['created_at']
        ];
        $bookings[] = $booking;
    }
    
    logMessage("Found bookings for admin", ['count' => count($bookings)]);
    
    // Return the bookings
    echo json_encode([
        'status' => 'success', 
        'bookings' => $bookings,
        'count' => count($bookings),
        'auth_status' => 'success'
    ]);
    
} catch (Exception $e) {
    logMessage("Error in admin bookings endpoint", ['error' => $e->getMessage()]);
    
    // Return error message to client
    echo json_encode([
        'status' => 'error', 
        'message' => 'Failed to fetch bookings from database: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}
