
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Prevent any output before headers are sent
ob_start();

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request
error_log("Admin update-booking endpoint called: " . $_SERVER['REQUEST_METHOD']);

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

try {
    // Only allow POST or PUT requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Get JSON input data
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    error_log("Update booking request data: " . print_r($data, true));

    // Validate required fields
    if (!isset($data['bookingId'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database with improved error handling
    try {
        // Direct database connection for maximum reliability
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
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
    
    if ($result->num_rows === 0) {
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
    
    // Check if the booking can be updated (not cancelled or completed)
    if (!$debugMode && ($booking['status'] === 'completed' || $booking['status'] === 'cancelled')) {
        sendJsonResponse(['status' => 'error', 'message' => 'Cannot update a completed or cancelled booking'], 400);
    }
    
    // Prepare update SQL dynamically based on provided fields
    $updateFields = [];
    $types = "";
    $params = [];
    
    // Map fields from request to database columns
    $fieldMappings = [
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
        'status' => 'status',
        'driverName' => 'driver_name',
        'driverPhone' => 'driver_phone',
        'vehicleNumber' => 'vehicle_number',
        'adminNotes' => 'admin_notes'
    ];
    
    // Log the incoming request body for debugging
    error_log("[update-booking] Incoming request body: " . file_get_contents('php://input'));

    // Process extra charges with standardized format
    $receivedExtraCharges = null;
    $extraChargesTotal = 0;
    
    if (array_key_exists('extraCharges', $data)) {
        $receivedExtraCharges = $data['extraCharges'];
        
        // Standardize field names to amount and description
        $standardizedCharges = [];
        foreach ($receivedExtraCharges as $charge) {
            $chargeAmount = isset($charge['amount']) ? (float)$charge['amount'] : 0;
            $standardizedCharge = [
                'amount' => $chargeAmount,
                'description' => isset($charge['description']) ? $charge['description'] : 
                                (isset($charge['label']) ? $charge['label'] : '')
            ];
            $standardizedCharges[] = $standardizedCharge;
            $extraChargesTotal += $chargeAmount;
        }
        
        $receivedExtraCharges = $standardizedCharges;
        
    } elseif (array_key_exists('extra_charges', $data)) {
        $receivedExtraCharges = $data['extra_charges'];
        
        // Standardize if it's under extra_charges key
        if (is_array($receivedExtraCharges)) {
            $standardizedCharges = [];
            foreach ($receivedExtraCharges as $charge) {
                $chargeAmount = isset($charge['amount']) ? (float)$charge['amount'] : 0;
                $standardizedCharge = [
                    'amount' => $chargeAmount,
                    'description' => isset($charge['description']) ? $charge['description'] : 
                                   (isset($charge['label']) ? $charge['label'] : '')
                ];
                $standardizedCharges[] = $standardizedCharge;
                $extraChargesTotal += $chargeAmount;
            }
            $receivedExtraCharges = $standardizedCharges;
        }
    }
    
    // Fallback: if not present in request, use value from DB or set to []
    if ($receivedExtraCharges === null) {
        $checkExtra = $conn->prepare("SELECT extra_charges FROM bookings WHERE id = ?");
        $checkExtra->bind_param("i", $bookingId);
        $checkExtra->execute();
        $resultExtra = $checkExtra->get_result();
        $rowExtra = $resultExtra->fetch_assoc();
        if (!empty($rowExtra['extra_charges'])) {
            $receivedExtraCharges = json_decode($rowExtra['extra_charges'], true);
            if (!is_array($receivedExtraCharges)) $receivedExtraCharges = [];
        } else {
            $receivedExtraCharges = [];
        }
    }
    
    // If totalAmount isn't provided but we have extraCharges, update the total amount
    if (!isset($data['totalAmount']) && $extraChargesTotal > 0) {
        $baseAmount = (float)$booking['total_amount'];
        $newTotal = $baseAmount + $extraChargesTotal;
        $data['totalAmount'] = $newTotal;
        
        logError("Recalculated total amount", [
            'baseAmount' => $baseAmount,
            'extraChargesTotal' => $extraChargesTotal,
            'newTotal' => $newTotal
        ]);
    }
    
    error_log("[update-booking] Will save extraCharges: " . json_encode($receivedExtraCharges));
    $updateFields[] = "extra_charges = ?";
    $types .= "s";
    $params[] = json_encode($receivedExtraCharges);
    
    // Build update query dynamically
    foreach ($fieldMappings as $requestField => $dbField) {
        if (array_key_exists($requestField, $data)) {
            $updateFields[] = "$dbField = ?";
            $types .= getTypeForField($data[$requestField]);
            $params[] = $data[$requestField];
        }
    }
    
    // Always add updated_at
    $updateFields[] = "updated_at = NOW()";
    
    // If nothing to update, just return success
    if (empty($params)) {
        sendJsonResponse([
            'status' => 'success', 
            'message' => 'No fields to update',
            'data' => $booking
        ]);
    }
    
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
        
        // Standardize the format to ensure amount and description fields
        $standardizedExtraCharges = [];
        foreach ($decodedExtraCharges as $charge) {
            $standardizedExtraCharges[] = [
                'amount' => isset($charge['amount']) ? (float)$charge['amount'] : 0,
                'description' => isset($charge['description']) ? $charge['description'] : 
                              (isset($charge['label']) ? $charge['label'] : '')
            ];
        }
        $decodedExtraCharges = $standardizedExtraCharges;
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
    sendJsonResponse([
        'status' => 'success', 
        'message' => 'Booking updated successfully',
        'data' => $formattedBooking
    ]);

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
