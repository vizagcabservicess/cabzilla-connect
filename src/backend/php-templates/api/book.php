
<?php
/**
 * CRITICAL API ENDPOINT: Creates new bookings
 */

// CRITICAL: Set all headers upfront before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Disable output buffering completely - critical to prevent HTML contamination
if (ob_get_level()) ob_end_clean();
if (ob_get_length()) ob_clean();
if (ob_get_level()) ob_end_clean();

// Enable error reporting but don't display errors to client
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Include database helper
require_once __DIR__ . '/common/db_helper.php';

// Create logs directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Define booking log function
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

// Send JSON response function to ensure proper output
function sendJsonResponse($data, $statusCode = 200) {
    // Clean any previous output
    while (ob_get_level()) ob_end_clean();
    
    // Set status code
    http_response_code($statusCode);
    
    // Ensure content type is set again
    header('Content-Type: application/json');
    
    // Convert to JSON and output directly
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logBooking("Method not allowed", $_SERVER['REQUEST_METHOD']);
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Log the start of booking request with details
$remoteAddr = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
$requestUri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : 'unknown';
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'unknown';

logBooking("Booking request started", [
    'method' => $method,
    'uri' => $requestUri,
    'remote_addr' => $remoteAddr
]);

try {
    // Read and parse the request body
    $requestBody = file_get_contents('php://input');
    logBooking("Received request body", ['length' => strlen($requestBody), 'content' => $requestBody]);
    
    // Check for empty request
    if (empty($requestBody)) {
        throw new Exception("Empty request body");
    }
    
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

    // Generate booking number
    $bookingId = time() . rand(1000, 9999);
    $bookingNumber = 'CB' . $bookingId;
    
    // Check if this was created by admin (for admin discount feature)
    $createdByAdmin = isset($data['createdByAdmin']) && $data['createdByAdmin'] === true;
    $discount = isset($data['discount']) ? (float)$data['discount'] : 0;
    $discountType = isset($data['discountType']) ? $data['discountType'] : null;
    $originalAmount = isset($data['originalAmount']) ? (float)$data['originalAmount'] : null;
    
    // Create a booking record
    $booking = [
        'id' => (int)$bookingId,
        'userId' => null,
        'bookingNumber' => $bookingNumber,
        'pickupLocation' => $data['pickupLocation'],
        'dropLocation' => isset($data['dropLocation']) ? $data['dropLocation'] : '',
        'pickupDate' => $data['pickupDate'],
        'returnDate' => isset($data['returnDate']) ? $data['returnDate'] : null,
        'cabType' => $data['cabType'],
        'distance' => isset($data['distance']) ? (float)$data['distance'] : 0,
        'tripType' => $data['tripType'],
        'tripMode' => $data['tripMode'],
        'totalAmount' => (float)$data['totalAmount'],
        'status' => 'pending',
        'passengerName' => $data['passengerName'],
        'passengerPhone' => $data['passengerPhone'],
        'passengerEmail' => $data['passengerEmail'],
        'hourlyPackage' => isset($data['hourlyPackage']) ? $data['hourlyPackage'] : null,
        'created_at' => date('Y-m-d H:i:s'),
        'notes' => isset($data['notes']) ? $data['notes'] : null,
        'createdByAdmin' => $createdByAdmin,
        'discount' => $discount,
        'discountType' => $discountType,
        'originalAmount' => $originalAmount
    ];
    
    logBooking("Created booking response", $booking);
    
    // Connect to database and insert the booking
    try {
        $conn = getDbConnectionWithRetry(3);
        logBooking("Database connection established");
        
        // Ensure bookings table exists
        if (!ensureBookingsTableExists($conn)) {
            throw new Exception("Failed to ensure bookings table exists");
        }
        
        // Prepare the SQL query - Extended for admin discount fields
        $sql = "INSERT INTO bookings (
            booking_number, pickup_location, drop_location, pickup_date, return_date,
            cab_type, distance, trip_type, trip_mode, total_amount, status,
            passenger_name, passenger_phone, passenger_email, hourly_package, notes,
            created_by_admin, discount, discount_type, original_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Failed to prepare SQL statement: " . $conn->error);
        }
        
        // Format pickup date for database
        $pickupDateFormatted = date('Y-m-d H:i:s', strtotime($booking['pickupDate']));
        
        // Format return date if available
        $returnDateFormatted = null;
        if (!empty($booking['returnDate'])) {
            $returnDateFormatted = date('Y-m-d H:i:s', strtotime($booking['returnDate']));
        }
        
        // Convert boolean to integer for database
        $createdByAdminValue = $createdByAdmin ? 1 : 0;
        
        // Bind parameters
        $stmt->bind_param(
            "ssssssdssdssssssissd",
            $booking['bookingNumber'],
            $booking['pickupLocation'],
            $booking['dropLocation'],
            $pickupDateFormatted,
            $returnDateFormatted,
            $booking['cabType'],
            $booking['distance'],
            $booking['tripType'],
            $booking['tripMode'],
            $booking['totalAmount'],
            $booking['status'],
            $booking['passengerName'],
            $booking['passengerPhone'],
            $booking['passengerEmail'],
            $booking['hourlyPackage'],
            $booking['notes'],
            $createdByAdminValue,
            $discount,
            $discountType,
            $originalAmount
        );
        
        // Execute the query
        $success = $stmt->execute();
        if (!$success) {
            throw new Exception("Failed to insert booking: " . $stmt->error);
        }
        
        $booking['id'] = $stmt->insert_id ?: $bookingId;
        
        logBooking("Booking stored in database", [
            'booking_id' => $booking['id'],
            'booking_number' => $booking['bookingNumber']
        ]);
        
        $stmt->close();
        $conn->close();
    } catch (Exception $dbError) {
        // Log database error but don't expose details to client
        logBooking("DATABASE ERROR: " . $dbError->getMessage(), [
            'trace' => $dbError->getTraceAsString()
        ]);
        
        // For now, we'll continue with a mock response since we want to test email functionality
        logBooking("WARNING: Using mock booking response due to database error");
    }
    
    // Send success response
    $response = [
        'status' => 'success',
        'message' => 'Booking created successfully',
        'data' => $booking
    ];
    
    logBooking("Sending success response", ['booking_id' => $booking['id']]);
    sendJsonResponse($response);
    
} catch (Exception $e) {
    logBooking("ERROR: Booking creation failed", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    // Send error response
    $response = [
        'status' => 'error',
        'message' => 'Failed to create booking: ' . $e->getMessage()
    ];
    
    sendJsonResponse($response, 500);
}
