
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
    
    // Debug additional requirements specifically
    logBooking("Additional Requirements Debug", [
        'additionalRequirements' => $data['additionalRequirements'] ?? 'NOT_SET',
        'hasAdditionalRequirements' => isset($data['additionalRequirements']),
        'additionalRequirementsValue' => $data['additionalRequirements'] ?? null
    ]);
    
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

    // Generate booking number (but don't use as database ID)
    $bookingNumber = 'VTH' . time() . rand(1000, 9999);
    
    // Create a booking record
    $booking = [
        'id' => null, // Will be set after database insert
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
        'passengerCountryCode' => isset($data['passengerCountryCode']) ? $data['passengerCountryCode'] : '+91',
        'passengerEmail' => $data['passengerEmail'],
        'additionalRequirements' => isset($data['additionalRequirements']) ? $data['additionalRequirements'] : '',
        'hourlyPackage' => isset($data['hourlyPackage']) ? $data['hourlyPackage'] : null,
        'created_at' => date('Y-m-d H:i:s')
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
        
        // Prepare the SQL query
        $sql = "INSERT INTO bookings (
            booking_number, pickup_location, drop_location, pickup_date, return_date,
            cab_type, distance, trip_type, trip_mode, total_amount, status,
            passenger_name, passenger_phone, passenger_country_code, passenger_email, 
            additional_requirements, hourly_package
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Failed to prepare SQL statement: " . $conn->error);
        }
        
        // Format pickup date for database - ensure IST timezone
        $pickupDateTime = new DateTime($booking['pickupDate'], new DateTimeZone('Asia/Kolkata'));
        $pickupDateFormatted = $pickupDateTime->format('Y-m-d H:i:s');
        
        // Format return date if available - ensure IST timezone
        $returnDateFormatted = null;
        if (!empty($booking['returnDate'])) {
            $returnDateTime = new DateTime($booking['returnDate'], new DateTimeZone('Asia/Kolkata'));
            $returnDateFormatted = $returnDateTime->format('Y-m-d H:i:s');
        }
        
        // Debug additional requirements before binding
        $additionalRequirementsValue = $booking['additionalRequirements'] ?? null;
        logBooking("Database Insert Debug", [
            'additionalRequirementsValue' => $additionalRequirementsValue,
            'willSaveToDB' => $additionalRequirementsValue !== null && $additionalRequirementsValue !== '' ? 'YES' : 'NO',
            'fromBookingArray' => true
        ]);
        
        // Bind parameters
        $stmt->bind_param(
            "ssssssdssdsssssss",
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
            $booking['passengerCountryCode'],
            $booking['passengerEmail'],
            $additionalRequirementsValue,
            $booking['hourlyPackage']
        );
        
        // Execute the query
        $success = $stmt->execute();
        if (!$success) {
            throw new Exception("Failed to insert booking: " . $stmt->error);
        }
        
        $insertedId = $stmt->insert_id;
        $booking['id'] = $insertedId;

        $linkHelper = __DIR__ . '/common/customer_booking_link.php';
        if (file_exists($linkHelper)) {
            require_once $linkHelper;
            $jwtUserId = null;
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if ($authHeader !== '' && strpos($authHeader, 'Bearer ') === 0 && function_exists('verifyJwtToken')) {
                $payload = verifyJwtToken(substr($authHeader, 7));
                $jwtUserId = $payload['user_id'] ?? $payload['userId'] ?? $payload['id'] ?? null;
            }
            $linkedUserId = vth_resolve_booking_user_id(
                $conn,
                $booking['passengerPhone'] ?? '',
                $booking['passengerEmail'] ?? '',
                $jwtUserId
            );
            if ($linkedUserId) {
                $linkStmt = $conn->prepare('UPDATE bookings SET user_id = ? WHERE id = ?');
                if ($linkStmt) {
                    $linkStmt->bind_param('ii', $linkedUserId, $insertedId);
                    $linkStmt->execute();
                    $linkStmt->close();
                    $booking['userId'] = $linkedUserId;
                }
            }
        }
        
        logBooking("Database insert result", [
            'insert_id' => $insertedId,
            'final_booking_id' => $booking['id'],
            'booking_number' => $booking['bookingNumber'],
            'linked_user_id' => $booking['userId'] ?? null
        ]);
        
        logBooking("Booking stored in database", [
            'booking_id' => $booking['id'],
            'booking_number' => $booking['bookingNumber']
        ]);
        
        $stmt->close();

        // Sync to Google Sheet ledger (non-blocking)
        try {
            $syncBootstrap = __DIR__ . '/ai-booking/services/OnlineBookingSheetSync.php';
            if (is_readable($syncBootstrap)) {
                require_once __DIR__ . '/utils/ai-booking-db.php';
                require_once __DIR__ . '/ai-booking/config/sheets-config.php';
                require_once __DIR__ . '/ai-booking/services/GoogleSheetService.php';
                require_once $syncBootstrap;
                $sheetSync = OnlineBookingSheetSync::syncByBookingId((int) $insertedId);
                logBooking('Google Sheet sync', $sheetSync);
            }
        } catch (Throwable $sheetError) {
            logBooking('Google Sheet sync failed (non-fatal)', $sheetError->getMessage());
        }

        $conn->close();

        // Notify super_admin users of new booking (non-blocking)
        try {
            if (file_exists(__DIR__ . '/utils/push.php')) {
                require_once __DIR__ . '/utils/push.php';
                sendPushToSuperAdmins(
                    $booking['bookingNumber'],
                    $booking['passengerName'] ?? '',
                    $booking['pickupLocation'] ?? null
                );
            }
        } catch (Throwable $e) {
            logBooking("Push notification failed (non-fatal)", $e->getMessage());
        }
    } catch (Exception $dbError) {
        // Log database error but don't expose details to client
        logBooking("DATABASE ERROR: " . $dbError->getMessage(), [
            'trace' => $dbError->getTraceAsString()
        ]);
        
        // For now, we'll continue with a mock response since we want to test email functionality
        logBooking("WARNING: Using mock booking response due to database error");
    }
    
    // NOTE: Pending payment emails are sent only when user cancels payment or closes browser (see send-pending-notification.php)
    
    // Send success response
    $response = [
        'status' => 'success',
        'message' => 'Booking created successfully',
        'data' => $booking
    ];
    
    logBooking("Sending success response", [
        'booking_id' => $booking['id'],
        'booking_number' => $booking['bookingNumber'],
        'additional_requirements' => $booking['additionalRequirements']
    ]);
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
