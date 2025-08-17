
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Prevent any output before headers are sent
ob_start();

// CRITICAL: Set all response headers first before any output
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Content-Type: application/json');
header('Pragma: no-cache');
header('Expires: 0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);
error_log("[update-booking] Debug mode: " . ($debugMode ? 'true' : 'false'));
error_log("[update-booking] HTTP_X_DEBUG: " . ($_SERVER['HTTP_X_DEBUG'] ?? 'not set'));

// Log request
error_log("Admin update-booking endpoint called: " . $_SERVER['REQUEST_METHOD']);

// Force immediate output for debugging
if (isset($_GET['debug_output'])) {
    echo "DEBUG: update-booking.php called at " . date('Y-m-d H:i:s') . PHP_EOL;
    echo "DEBUG: Request method: " . $_SERVER['REQUEST_METHOD'] . PHP_EOL;
    echo "DEBUG: Request body: " . file_get_contents('php://input') . PHP_EOL;
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Function to log detailed errors
function logError($message, $data = []) {
    error_log("UPDATE BOOKING ERROR: $message " . json_encode($data));
    // Also log to file if needed
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/booking_errors.log';
    file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - $message - " . json_encode($data) . "\n",
        FILE_APPEND
    );
}

// Function to log debug info to custom file
function logDebug($message, $data = []) {
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/update_booking_debug.log';
    $logEntry = date('Y-m-d H:i:s') . " - $message";
    if (!empty($data)) {
        $logEntry .= " - " . json_encode($data);
    }
    $logEntry .= "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    // Also write to a simple test file for immediate visibility
    $testFile = __DIR__ . '/update_test.log';
    file_put_contents($testFile, $logEntry, FILE_APPEND);
}

try {
    // Only allow POST or PUT requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Get JSON input data
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    error_log("Update booking request data: " . print_r($data, true));
    
    // Force immediate debug output
    logDebug("Request received", $data);

    // Validate required fields
    if (!isset($data['bookingId'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database with improved error handling
    try {
        // Direct database connection for maximum reliability
        $dbHost = 'localhost';
        $dbName = defined('DB_NAME') ? DB_NAME : 'u644605165_db_be';
        $dbUser = defined('DB_USER') ? DB_USER : 'u644605165_usr_be';
        $dbPass = defined('DB_PASS') ? DB_PASS : 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set character set
        $conn->set_charset("utf8mb4");
    } catch (Exception $e) {
        logError("Database connection failed", ['error' => $e->getMessage()]);
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
    
    // Extract booking ID
    $bookingId = $data['bookingId'];
    
    // Ensure bookings table has all required fields
    try {
        // Check if the billing_address field exists
        $checkColumn = $conn->query("SHOW COLUMNS FROM bookings LIKE 'billing_address'");
        
        if ($checkColumn->num_rows === 0) {
            // Add billing_address field if it doesn't exist
            $alterTable = "ALTER TABLE bookings ADD COLUMN billing_address TEXT AFTER passenger_email";
            $conn->query($alterTable);
            
            if ($conn->error) {
                logError("Failed to add billing_address column", ['error' => $conn->error]);
            } else {
                error_log("Added billing_address column to bookings table");
            }
        }
        // PATCH: Add extra_charges column if missing
        $checkExtraCharges = $conn->query("SHOW COLUMNS FROM bookings LIKE 'extra_charges'");
        if ($checkExtraCharges->num_rows === 0) {
            $conn->query("ALTER TABLE bookings ADD COLUMN extra_charges TEXT NULL AFTER admin_notes");
            if ($conn->error) {
                logError("Failed to add extra_charges column", ['error' => $conn->error]);
            } else {
                error_log("Added extra_charges column to bookings table");
            }
        }
    } catch (Exception $e) {
        logError("Error checking/updating table schema", ['error' => $e->getMessage()]);
        // Continue execution - non-fatal error
    }
    
    // Verify booking exists
    $checkStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $checkStmt->bind_param("i", $bookingId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    error_log("[update-booking] Checking if booking $bookingId exists. Found rows: " . $result->num_rows);
    
    if ($result->num_rows === 0) {
        error_log("[update-booking] Booking $bookingId not found in database");
        error_log("[update-booking] Debug mode: " . ($debugMode ? 'true' : 'false'));
        // For testing, if booking doesn't exist in DB, return mock success response
        if ($debugMode) {
            $mockBooking = [
                'id' => $bookingId,
                'booking_number' => 'TEST' . str_pad($bookingId, 8, '0', STR_PAD_LEFT),
                'passenger_name' => $data['passengerName'] ?? 'Test User',
                'passenger_phone' => $data['passengerPhone'] ?? '9876543210',
                'passenger_email' => $data['passengerEmail'] ?? 'test@example.com',
                'billing_address' => $data['billingAddress'] ?? null,
                'pickup_location' => $data['pickupLocation'] ?? 'Test Pickup',
                'drop_location' => $data['dropLocation'] ?? 'Test Drop',
                'pickup_date' => $data['pickupDate'] ?? date('Y-m-d H:i:s'),
                'return_date' => $data['returnDate'] ?? null,
                'cab_type' => $data['cabType'] ?? 'sedan',
                'total_amount' => $data['totalAmount'] ?? 1500,
                'status' => $data['status'] ?? 'confirmed',
                'driver_name' => $data['driverName'] ?? null,
                'driver_phone' => $data['driverPhone'] ?? null,
                'vehicle_number' => $data['vehicleNumber'] ?? null,
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            sendJsonResponse([
                'status' => 'success', 
                'message' => 'Booking updated successfully (mock response)',
                'data' => $mockBooking
            ]);
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
    }
    
    $booking = $result->fetch_assoc();
    
    // Debug: Log current booking status
    logDebug("Current booking status in DB", ['status' => $booking['status'] ?? 'NULL']);
    logDebug("Requested status", ['status' => $data['status'] ?? 'NULL']);
    
    // Check if the booking can be updated (not cancelled or completed) - but allow status changes
    $currentStatus = $booking['status'] ?? '';
    $requestedStatus = $data['status'] ?? '';
    $isStatusUpdate = isset($data['status']) && $requestedStatus !== $currentStatus;
    
    logDebug("Is status update", ['isStatusUpdate' => $isStatusUpdate]);
    
    if (!$debugMode && !$isStatusUpdate && ($currentStatus === 'completed' || $currentStatus === 'cancelled')) {
        sendJsonResponse(['status' => 'error', 'message' => 'Cannot update a completed or cancelled booking'], 400);
    }
    
    // Prepare update SQL dynamically based on provided fields
    $updateFields = [];
    $types = "";
    $params = [];
    

    
    // Log the incoming request body for debugging
    error_log("[update-booking] Incoming request body: " . file_get_contents('php://input'));
    error_log("[update-booking] Parsed data: " . json_encode($data));

    // Simple direct update approach like cancel-booking.php
    $updateFields = [];
    $types = "";
    $params = [];
    
    // Process status update (most common case)
    if (array_key_exists('status', $data)) {
        logDebug("Processing status update", ['status' => $data['status']]);
        $updateFields[] = "status = ?";
        $types .= "s";
        $params[] = $data['status'];
    }
    
    // Process other fields if provided
    $otherFields = [
        'passengerName' => 'passenger_name',
        'passengerPhone' => 'passenger_phone',
        'passengerEmail' => 'passenger_email',
        'billingAddress' => 'billing_address',
        'pickupLocation' => 'pickup_location',
        'dropLocation' => 'drop_location',
        'pickupDate' => 'pickup_date',
        'returnDate' => 'return_date',
        'cabType' => 'cab_type',
        'totalAmount' => 'total_amount',
        'driverName' => 'driver_name',
        'driverPhone' => 'driver_phone',
        'vehicleNumber' => 'vehicle_number',
        'adminNotes' => 'admin_notes'
    ];
    
    foreach ($otherFields as $requestField => $dbField) {
        if (array_key_exists($requestField, $data)) {
            logDebug("Processing field", ['field' => $requestField, 'dbField' => $dbField, 'value' => $data[$requestField]]);
            $updateFields[] = "$dbField = ?";
            $types .= getTypeForField($data[$requestField]);
            $params[] = $data[$requestField];
        }
    }
    
    // Process extra charges if provided
    if (array_key_exists('extraCharges', $data) || array_key_exists('extra_charges', $data)) {
        $receivedExtraCharges = $data['extraCharges'] ?? $data['extra_charges'] ?? [];
        
        // Standardize field names to amount and description
        $standardizedCharges = [];
        foreach ($receivedExtraCharges as $charge) {
            $standardizedCharge = [
                'amount' => isset($charge['amount']) ? (float)$charge['amount'] : 0,
                'description' => isset($charge['description']) ? $charge['description'] : 
                                (isset($charge['label']) ? $charge['label'] : '')
            ];
            $standardizedCharges[] = $standardizedCharge;
        }
        
        error_log("[update-booking] Processing extraCharges: " . json_encode($standardizedCharges));
        $updateFields[] = "extra_charges = ?";
        $types .= "s";
        $params[] = json_encode($standardizedCharges);
    }
    
    // Always add updated_at
    $updateFields[] = "updated_at = NOW()";
    
    // Check if there are any actual field updates (excluding updated_at)
    $actualFieldUpdates = 0;
    foreach ($updateFields as $field) {
        if ($field !== "updated_at = NOW()") {
            $actualFieldUpdates++;
        }
    }
    
    logDebug("Total update fields", ['count' => count($updateFields)]);
    logDebug("Actual field updates (excluding updated_at)", ['count' => $actualFieldUpdates]);
    
    // If no actual field updates (only updated_at), return success
    if ($actualFieldUpdates === 0) {
        $response = [
            'status' => 'success', 
            'message' => 'No changes to apply',
            'data' => $booking
        ];
        logDebug("Sending 'No changes' response", $response);
        sendJsonResponse($response);
    }
    
    logDebug("Update fields", ['fields' => $updateFields]);
    logDebug("Types and parameters", ['types' => $types, 'params' => $params]);
    
    // Add bookingId as the last parameter
    $types .= "i";
    $params[] = $bookingId;
    
    // Log the update query for debugging
    logError("Update query details", [
        'fields' => $updateFields,
        'types' => $types,
        'params' => $params
    ]);
    
    // Prepare and execute the update query
    $sql = "UPDATE bookings SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $updateStmt = $conn->prepare($sql);
    if (!$updateStmt) {
        error_log("[update-booking] Failed to prepare update statement: $sql | Error: " . $conn->error);
        throw new Exception("Failed to prepare update statement: " . $conn->error);
    }
    
    // Use a helper function to properly reference values for bind_param
    function refValues($arr) {
        $refs = array();
        foreach($arr as $key => $value) {
            $refs[$key] = &$arr[$key];
        }
        return $refs;
    }
    
    // Dynamically bind parameters with proper referencing
    $bindParams = array($types);
    foreach ($params as $key => $value) {
        $bindParams[] = $params[$key];
    }
    
    error_log("[update-booking] Executing SQL: $sql | Types: $types | Params: " . json_encode($params));
    call_user_func_array(array($updateStmt, 'bind_param'), refValues($bindParams));
    $success = $updateStmt->execute();
    
    if (!$success) {
        error_log("[update-booking] SQL execution failed: " . $updateStmt->error);
        throw new Exception("Failed to update booking: " . $updateStmt->error);
    }
    
    // Fetch the updated booking
    $getStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $getStmt->bind_param("i", $bookingId);
    $getStmt->execute();
    $result = $getStmt->get_result();
    $updatedBooking = $result->fetch_assoc();
    
    error_log("[update-booking] After update, extra_charges in DB: " . $updatedBooking['extra_charges']);
    
    // Always decode extra_charges for the response
    $decodedExtraCharges = [];
    if (!empty($updatedBooking['extra_charges'])) {
        $decodedExtraCharges = json_decode($updatedBooking['extra_charges'], true);
        if (!is_array($decodedExtraCharges)) $decodedExtraCharges = [];
    }
    
    // Format response with standardized extra charges format
    $formattedBooking = [
        'id' => (int)$updatedBooking['id'],
        'bookingNumber' => $updatedBooking['booking_number'],
        'pickupLocation' => $updatedBooking['pickup_location'],
        'dropLocation' => $updatedBooking['drop_location'],
        'pickupDate' => $updatedBooking['pickup_date'],
        'returnDate' => $updatedBooking['return_date'],
        'cabType' => $updatedBooking['cab_type'],
        'totalAmount' => (float)$updatedBooking['total_amount'],
        'status' => $updatedBooking['status'],
        'passengerName' => $updatedBooking['passenger_name'],
        'passengerPhone' => $updatedBooking['passenger_phone'],
        'passengerEmail' => $updatedBooking['passenger_email'],
        'billingAddress' => isset($updatedBooking['billing_address']) ? $updatedBooking['billing_address'] : null,
        'driverName' => $updatedBooking['driver_name'],
        'driverPhone' => $updatedBooking['driver_phone'],
        'vehicleNumber' => $updatedBooking['vehicle_number'],
        'adminNotes' => isset($updatedBooking['admin_notes']) ? $updatedBooking['admin_notes'] : null,
        'extraCharges' => $decodedExtraCharges,
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    // Send success response
    $response = [
        'status' => 'success', 
        'message' => 'Booking updated successfully',
        'data' => $formattedBooking
    ];
    
    logDebug("Sending success response", $response);
    sendJsonResponse($response);

} catch (Exception $e) {
    logError("Exception in update-booking.php", [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to update booking: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Helper function to determine parameter type
function getTypeForField($value) {
    if (is_null($value)) return "s"; // treat null as string (will be NULL in SQL)
    if (is_int($value)) return "i"; // integer
    if (is_float($value)) return "d"; // double/float
    return "s"; // string (default)
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
