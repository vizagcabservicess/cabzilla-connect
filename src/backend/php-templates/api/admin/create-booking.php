<?php
// Enable error reporting and logging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/debug.log');

// Log that the script is starting
error_log("=== CREATE BOOKING SCRIPT STARTED ===");
error_log("Timestamp: " . date('Y-m-d H:i:s'));

// Include configuration file
try {
    require_once __DIR__ . '/../../config.php';
    error_log("Config file loaded successfully");
} catch (Exception $e) {
    error_log("Config file error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Configuration error']);
    exit;
}

try {
    require_once __DIR__ . '/../utils/auth.php';
    error_log("Auth utils loaded successfully");
} catch (Exception $e) {
    error_log("Auth utils error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Auth utils error']);
    exit;
}

// Fallback function for sendJsonResponse if not defined
if (!function_exists('sendJsonResponse')) {
    function sendJsonResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}

// Set response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Get request body
error_log("Debug - Getting request body");
$rawInput = file_get_contents('php://input');
error_log("Debug - Raw input length: " . strlen($rawInput));
error_log("Debug - Raw input: " . $rawInput);

$requestData = json_decode($rawInput, true);
error_log("Debug - JSON decode result: " . (is_array($requestData) ? 'SUCCESS' : 'FAILED'));

// Debug: Log the raw request data
error_log("Debug - Raw request data: " . json_encode($requestData));

// Check for JSON decode errors
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("Debug - JSON decode error: " . json_last_error_msg());
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid JSON data'], 400);
    exit;
}

// Validate required fields
$requiredFields = ['pickupLocation', 'cabType', 'pickupDate', 'passengerName', 'passengerPhone', 'passengerEmail', 'tripType', 'tripMode', 'totalAmount'];
foreach ($requiredFields as $field) {
    if (!isset($requestData[$field]) || empty($requestData[$field])) {
        sendJsonResponse(['status' => 'error', 'message' => "Missing required field: $field"], 400);
        exit;
    }
}

// Connect to database
error_log("Debug - Attempting database connection...");
try {
    $conn = getDbConnection();
    if (!$conn) {
        error_log("Debug - Database connection failed - getDbConnection returned null");
        sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
        exit;
    }
    error_log("Debug - Database connection successful");
    
    // Test the connection with a simple query
    $testQuery = $conn->query("SELECT 1 as test");
    if ($testQuery) {
        error_log("Debug - Database test query successful");
    } else {
        error_log("Debug - Database test query failed: " . $conn->error);
    }
} catch (Exception $e) {
    error_log("Debug - Database connection exception: " . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
    exit;
}

// Since advance_paid_amount column already exists, we can proceed with the full SQL
error_log("Debug - advance_paid_amount column exists, proceeding with full SQL");

try {
    // Extract user_id from JWT token if present
    $user_id = null;
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!empty($auth_header) && strpos($auth_header, 'Bearer ') === 0) {
        $token = substr($auth_header, 7);
        $payload = verifyJwtToken($token);
        if ($payload && isset($payload['user_id'])) {
            $user_id = $payload['user_id'];
        }
    }
    
    // Generate unique booking number
    $bookingNumber = 'VTH' . date('ymd') . strtoupper(substr(uniqid(), -6));
    
    // Prepare SQL query - including user_id and tour_id
    $sql = "INSERT INTO bookings (
                booking_number, 
                pickup_location, 
                drop_location, 
                pickup_date, 
                return_date, 
                cab_type, 
                distance, 
                trip_type, 
                trip_mode, 
                total_amount, 
                status, 
                passenger_name, 
                passenger_phone, 
                passenger_email, 
                hourly_package,
                admin_notes,
                discount_amount,
                discount_type,
                discount_value,
                is_paid,
                advance_paid_amount,
                payment_status,
                created_by,
                user_id,
                tour_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    // Set default values
    $status = 'pending';
    $dropLocation = isset($requestData['dropLocation']) ? $requestData['dropLocation'] : '';
    $returnDate = isset($requestData['returnDate']) && !empty($requestData['returnDate']) ? $requestData['returnDate'] : null;
    $distance = isset($requestData['distance']) ? $requestData['distance'] : 0;
    $hourlyPackage = isset($requestData['hourlyPackage']) ? $requestData['hourlyPackage'] : null;
    $adminNotes = isset($requestData['adminNotes']) ? $requestData['adminNotes'] : '';
    $discountAmount = isset($requestData['discountAmount']) ? $requestData['discountAmount'] : 0;
    $discountType = isset($requestData['discountType']) ? $requestData['discountType'] : null;
    $discountValue = isset($requestData['discountValue']) ? $requestData['discountValue'] : 0;
    $isPaid = isset($requestData['isPaid']) && $requestData['isPaid'] ? 1 : 0;
    
    // Handle partial payment fields
    $partialPaymentReceived = isset($requestData['partialPaymentReceived']) && $requestData['partialPaymentReceived'] ? 1 : 0;
    $partialPaymentAmount = isset($requestData['partialPaymentAmount']) ? (float)$requestData['partialPaymentAmount'] : 0;
    $advancePaidAmount = $partialPaymentReceived ? $partialPaymentAmount : 0;
    $paymentStatus = $partialPaymentReceived && $partialPaymentAmount > 0 ? 'partial_payment' : ($isPaid ? 'paid' : 'pending');
    
    $createdBy = isset($requestData['createdBy']) ? $requestData['createdBy'] : 'admin';
    $tourId = isset($requestData['tourId']) ? $requestData['tourId'] : null;
    
    // Additional validation for tour bookings
    if (isset($requestData['tripType']) && $requestData['tripType'] === 'tour' && empty($tourId)) {
        error_log("ERROR: Tour booking created without tourId. Request data: " . json_encode($requestData));
        // Don't fail the booking, but log the issue
    }
    
    // Debug: Log all variables before binding
    error_log("Debug - Variables before bind_param:");
    error_log("bookingNumber: " . ($bookingNumber ?? 'NULL'));
    error_log("pickupLocation: " . ($requestData['pickupLocation'] ?? 'NULL'));
    error_log("dropLocation: " . ($dropLocation ?? 'NULL'));
    error_log("pickupDate: " . ($requestData['pickupDate'] ?? 'NULL'));
    error_log("returnDate: " . ($returnDate ?? 'NULL'));
    error_log("cabType: " . ($requestData['cabType'] ?? 'NULL'));
    error_log("distance: " . ($distance ?? 'NULL'));
    error_log("tripType: " . ($requestData['tripType'] ?? 'NULL'));
    error_log("tripMode: " . ($requestData['tripMode'] ?? 'NULL'));
    error_log("totalAmount: " . ($requestData['totalAmount'] ?? 'NULL'));
    error_log("status: " . ($status ?? 'NULL'));
    error_log("passengerName: " . ($requestData['passengerName'] ?? 'NULL'));
    error_log("passengerPhone: " . ($requestData['passengerPhone'] ?? 'NULL'));
    error_log("passengerEmail: " . ($requestData['passengerEmail'] ?? 'NULL'));
    error_log("hourlyPackage: " . ($hourlyPackage ?? 'NULL'));
    error_log("adminNotes: " . ($adminNotes ?? 'NULL'));
    error_log("discountAmount: " . ($discountAmount ?? 'NULL'));
    error_log("discountType: " . ($discountType ?? 'NULL'));
    error_log("discountValue: " . ($discountValue ?? 'NULL'));
    error_log("isPaid: " . ($isPaid ?? 'NULL'));
    error_log("advancePaidAmount: " . ($advancePaidAmount ?? 'NULL'));
    error_log("paymentStatus: " . ($paymentStatus ?? 'NULL'));
    error_log("createdBy: " . ($createdBy ?? 'NULL'));
    error_log("user_id: " . ($user_id ?? 'NULL'));
    error_log("tourId: " . ($tourId ?? 'NULL'));
    
    // Check for any null values that could cause binding issues
    $nullVars = [];
    if (is_null($bookingNumber)) $nullVars[] = 'bookingNumber';
    if (is_null($requestData['pickupLocation'])) $nullVars[] = 'pickupLocation';
    if (is_null($dropLocation)) $nullVars[] = 'dropLocation';
    if (is_null($requestData['pickupDate'])) $nullVars[] = 'pickupDate';
    if (is_null($requestData['cabType'])) $nullVars[] = 'cabType';
    if (is_null($distance)) $nullVars[] = 'distance';
    if (is_null($requestData['tripType'])) $nullVars[] = 'tripType';
    if (is_null($requestData['tripMode'])) $nullVars[] = 'tripMode';
    if (is_null($requestData['totalAmount'])) $nullVars[] = 'totalAmount';
    if (is_null($status)) $nullVars[] = 'status';
    if (is_null($requestData['passengerName'])) $nullVars[] = 'passengerName';
    if (is_null($requestData['passengerPhone'])) $nullVars[] = 'passengerPhone';
    if (is_null($requestData['passengerEmail'])) $nullVars[] = 'passengerEmail';
    if (is_null($adminNotes)) $nullVars[] = 'adminNotes';
    if (is_null($discountAmount)) $nullVars[] = 'discountAmount';
    if (is_null($discountValue)) $nullVars[] = 'discountValue';
    if (is_null($isPaid)) $nullVars[] = 'isPaid';
    if (is_null($advancePaidAmount)) $nullVars[] = 'advancePaidAmount';
    if (is_null($paymentStatus)) $nullVars[] = 'paymentStatus';
    if (is_null($createdBy)) $nullVars[] = 'createdBy';
    if (is_null($user_id)) $nullVars[] = 'user_id';
    
    if (!empty($nullVars)) {
        error_log("Debug - NULL variables found: " . implode(', ', $nullVars));
    }
    
    // Prepare statement
    error_log("Debug - Preparing SQL statement...");
    error_log("Debug - SQL query: " . $sql);
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log("Debug - Statement preparation failed: " . $conn->error);
        error_log("Debug - MySQL error code: " . $conn->errno);
        throw new Exception("Failed to prepare statement: " . $conn->error . " (Error code: " . $conn->errno . ")");
    }
    error_log("Debug - Statement prepared successfully");
    
    // Bind parameters - including user_id and tour_id at the end
    error_log("Debug - About to bind parameters. Type string: 'ssssdssdssdsssssdssdidsis' (length: " . strlen("ssssdssdssdsssssdssdidsis") . ")");
    error_log("Debug - Number of parameters: 25");
    
    // Store all parameters in an array for easier debugging
    $params = [
        $bookingNumber,
        $requestData['pickupLocation'],
        $dropLocation,
        $requestData['pickupDate'],
        $returnDate,
        $requestData['cabType'],
        $distance,
        $requestData['tripType'],
        $requestData['tripMode'],
        $requestData['totalAmount'],
        $status,
        $requestData['passengerName'],
        $requestData['passengerPhone'],
        $requestData['passengerEmail'],
        $hourlyPackage,
        $adminNotes,
        $discountAmount,
        $discountType,
        $discountValue,
        $isPaid,
        $advancePaidAmount,
        $paymentStatus,
        $createdBy,
        $user_id,
        $tourId
    ];
    
    $typeString = "ssssdssdssdsssssdssdidsis";
    
    error_log("Debug - Parameter count: " . count($params));
    error_log("Debug - Type string: " . $typeString . " (length: " . strlen($typeString) . ")");
    
    // Log each parameter with its index
    for ($i = 0; $i < count($params); $i++) {
        error_log("Debug - Param $i: " . (is_null($params[$i]) ? 'NULL' : (is_string($params[$i]) ? $params[$i] : (string)$params[$i])));
    }
    
    // Try bind_param with spread operator
    $bindResult = $stmt->bind_param($typeString, ...$params);
    
    if (!$bindResult) {
        error_log("Debug - bind_param failed: " . $stmt->error);
        error_log("Debug - MySQL error: " . $conn->error);
        error_log("Debug - Error code: " . $stmt->errno);
        throw new Exception("Failed to bind parameters: " . $stmt->error . " (MySQL Error: " . $conn->error . ")");
    }
    
    error_log("Debug - bind_param successful");
    
    // Execute query
    $success = $stmt->execute();
    if (!$success) {
        throw new Exception("Failed to create booking: " . $stmt->error);
    }
    
    // Get inserted booking ID
    $bookingId = $conn->insert_id;
    
    // Optional: Persist GST details if provided from guest submission
    try {
        $gstEnabled = isset($requestData['gstEnabled']) && $requestData['gstEnabled'] ? 1 : 0;
        $hasGstDetails = isset($requestData['gstDetails']) && is_array($requestData['gstDetails']);
        if ($gstEnabled || $hasGstDetails) {
            $gstNumber = $hasGstDetails && isset($requestData['gstDetails']['gstNumber']) ? $requestData['gstDetails']['gstNumber'] : '';
            $companyName = $hasGstDetails && isset($requestData['gstDetails']['companyName']) ? $requestData['gstDetails']['companyName'] : '';
            $companyAddress = $hasGstDetails && isset($requestData['gstDetails']['companyAddress']) ? $requestData['gstDetails']['companyAddress'] : '';
            $companyEmail = $hasGstDetails && isset($requestData['gstDetails']['companyEmail']) ? $requestData['gstDetails']['companyEmail'] : '';
            $gstDetailsJson = json_encode([
                'gstNumber' => $gstNumber,
                'companyName' => $companyName,
                'companyAddress' => $companyAddress,
                'companyEmail' => $companyEmail
            ]);
            
            // Attempt to update bookings table with both JSON and column fields when available
            // JSON field (gst_details)
            $updateSql = "UPDATE bookings SET gst_enabled = ?, gst_number = COALESCE(?, gst_number), company_name = COALESCE(?, company_name), company_address = COALESCE(?, company_address), gst_details = ? WHERE id = ?";
            $up = $conn->prepare($updateSql);
            if ($up) {
                $up->bind_param('issssi', $gstEnabled, $gstNumber, $companyName, $companyAddress, $gstDetailsJson, $bookingId);
                $up->execute();
                $up->close();
            }
        }
    } catch (Throwable $persistGstEx) {
        // Do not fail booking creation if GST persistence fails
        error_log('create-booking.php GST persist warning: ' . $persistGstEx->getMessage());
    }
    
    // Fetch the created booking
    $selectStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $selectStmt->bind_param("i", $bookingId);
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    $booking = $result->fetch_assoc();
    
    // Format response
    $response = [
        'status' => 'success',
        'message' => 'Booking created successfully',
        'id' => $bookingId,
        'booking_number' => $bookingNumber,
        'data' => $booking
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    logError("Error creating booking", ['error' => $e->getMessage(), 'request' => $requestData]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to create booking: ' . $e->getMessage()], 500);
}

// Close connection
$conn->close();
