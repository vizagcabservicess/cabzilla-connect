
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';

// CORS Headers - Critical for cross-domain requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helper function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Helper function to log errors
function logError($message, $data = []) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/api_errors_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logData = "[$timestamp] $message: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
    file_put_contents($logFile, $logData, FILE_APPEND);
    
    // Also log to PHP error log
    error_log("$message: " . json_encode($data));
}

// Allow both POST and PUT requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Get booking ID from URL or request body
$bookingId = null;
if (isset($_GET['id'])) {
    $bookingId = $_GET['id'];
} else {
    // Get data from request body
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['id'])) {
        $bookingId = $data['id'];
    } else if (isset($data['bookingId'])) {
        $bookingId = $data['bookingId'];
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
        exit;
    }
}

// Get data from request body
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid request data'], 400);
    exit;
}

// Debug log the incoming data
logError("Update booking request data", $data);

// Connect to database
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
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
    exit;
}

try {
    // Check if the bookings table exists
    $checkTableStmt = $conn->query("SHOW TABLES LIKE 'bookings'");
    if ($checkTableStmt->num_rows === 0) {
        // Table doesn't exist, create it
        $createTableSql = "
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                booking_number VARCHAR(20) NOT NULL,
                pickup_location TEXT NOT NULL,
                drop_location TEXT,
                pickup_date DATETIME NOT NULL,
                return_date DATETIME,
                cab_type VARCHAR(50) NOT NULL,
                distance DECIMAL(10,2),
                trip_type VARCHAR(20) NOT NULL,
                trip_mode VARCHAR(20) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                passenger_name VARCHAR(100),
                passenger_phone VARCHAR(20),
                passenger_email VARCHAR(100),
                driver_name VARCHAR(100),
                driver_phone VARCHAR(20),
                vehicle_number VARCHAR(20),
                admin_notes TEXT,
                extra_charges TEXT,
                gst_enabled TINYINT(1) DEFAULT 0,
                gst_details TEXT,
                billing_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY (booking_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $conn->query($createTableSql);
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found, created bookings table'], 404);
        exit;
    }

    // First check if the booking exists
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Check if required columns exist in the table
    $requiredColumns = [
        'extra_charges' => 'TEXT',
        'gst_enabled' => 'TINYINT(1) DEFAULT 0',
        'gst_details' => 'TEXT',
        'billing_address' => 'TEXT'
    ];
    
    foreach ($requiredColumns as $column => $type) {
        $checkColumnStmt = $conn->query("SHOW COLUMNS FROM bookings LIKE '$column'");
        if ($checkColumnStmt->num_rows === 0) {
            // Add column if it doesn't exist
            $alterTableSql = "ALTER TABLE bookings ADD COLUMN $column $type";
            $conn->query($alterTableSql);
            logError("Added $column column to bookings table");
        }
    }
    
    // Build the update query based on provided fields
    $updateFields = [];
    $updateValues = [];
    $updateTypes = "";
    
    // All the fields that can be updated
    $allowedFields = [
        'pickup_location' => 'pickupLocation',
        'drop_location' => 'dropLocation',
        'pickup_date' => 'pickupDate',
        'return_date' => 'returnDate',
        'passenger_name' => 'passengerName',
        'passenger_phone' => 'passengerPhone',
        'passenger_email' => 'passengerEmail',
        'status' => 'status',
        'driver_name' => 'driverName',
        'driver_phone' => 'driverPhone',
        'vehicle_number' => 'vehicleNumber',
        'admin_notes' => 'adminNotes',
        'total_amount' => 'totalAmount',
        'billing_address' => 'billingAddress',
        'cab_type' => 'cabType'
    ];
    
    // Handle extra charges separately to ensure proper JSON encoding and standardized field naming
    $extraCharges = null;
    if (isset($data['extraCharges'])) {
        // Standardize field names to use 'description' and 'amount' consistently
        $standardizedCharges = [];
        foreach ($data['extraCharges'] as $charge) {
            $standardizedCharge = [
                'amount' => isset($charge['amount']) ? (float)$charge['amount'] : 0,
                'description' => isset($charge['description']) ? $charge['description'] : 
                                (isset($charge['label']) ? $charge['label'] : '')
            ];
            $standardizedCharges[] = $standardizedCharge;
        }
        
        $extraCharges = json_encode($standardizedCharges);
        $updateFields[] = "extra_charges = ?";
        $updateValues[] = $extraCharges;
        $updateTypes .= "s"; // JSON string
        
        // Log the extra charges that are being saved
        logError("Saving standardized extra charges", [
            'original' => $data['extraCharges'],
            'standardized' => $standardizedCharges, 
            'json' => $extraCharges
        ]);
    }
    
    // Handle GST information
    if (isset($data['gstEnabled'])) {
        $gstEnabled = $data['gstEnabled'] ? 1 : 0;
        $updateFields[] = "gst_enabled = ?";
        $updateValues[] = $gstEnabled;
        $updateTypes .= "i"; // Integer for boolean
    }
    
    // Handle GST details as JSON
    if (isset($data['gstDetails'])) {
        $gstDetails = json_encode($data['gstDetails']);
        $updateFields[] = "gst_details = ?";
        $updateValues[] = $gstDetails;
        $updateTypes .= "s"; // JSON string
    }
    
    // Track if status is being updated
    $oldStatus = $booking['status'];
    $newStatus = isset($data['status']) ? $data['status'] : $oldStatus;
    $statusUpdated = ($oldStatus != $newStatus);
    
    // Map API field names to database field names
    foreach ($allowedFields as $dbField => $apiField) {
        if (isset($data[$apiField]) && $data[$apiField] !== null) {
            $updateFields[] = "$dbField = ?";
            $updateValues[] = $data[$apiField];
            $updateTypes .= "s"; // Assume all fields are strings for simplicity
        }
    }
    
    // Add the booking ID at the end of values
    $updateValues[] = $bookingId;
    $updateTypes .= "i";
    
    // If no fields to update, return success (no changes)
    if (count($updateFields) === 0) {
        sendJsonResponse(['status' => 'success', 'message' => 'No changes to apply']);
        exit;
    }
    
    logError("Update query fields", [
        'fields' => $updateFields,
        'values' => $updateValues,
        'types' => $updateTypes,
        'bookingId' => $bookingId
    ]);
    
    // Update the booking
    $updateQuery = "UPDATE bookings SET " . implode(", ", $updateFields) . ", updated_at = NOW() WHERE id = ?";
    $updateStmt = $conn->prepare($updateQuery);
    
    if (!$updateStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
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
    $bindParams = array($updateTypes);
    foreach ($updateValues as $key => $value) {
        $bindParams[] = $updateValues[$key];
    }
    
    call_user_func_array(array($updateStmt, 'bind_param'), refValues($bindParams));
    
    $success = $updateStmt->execute();
    
    if (!$success) {
        throw new Exception('Database error: ' . $updateStmt->error);
    }
    
    // Get the updated booking
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    $updatedBooking = $result->fetch_assoc();
    
    // Parse and format extra charges
    $formattedExtraCharges = [];
    if (!empty($updatedBooking['extra_charges'])) {
        $parsedCharges = json_decode($updatedBooking['extra_charges'], true);
        if (is_array($parsedCharges)) {
            $formattedExtraCharges = $parsedCharges;
        }
    }
    
    // Parse and format GST details
    $formattedGstDetails = null;
    if (!empty($updatedBooking['gst_details'])) {
        $parsedGstDetails = json_decode($updatedBooking['gst_details'], true);
        if (is_array($parsedGstDetails)) {
            $formattedGstDetails = $parsedGstDetails;
        }
    }
    
    // Format the response
    $booking = [
        'id' => (int)$updatedBooking['id'],
        'userId' => $updatedBooking['user_id'] ? (int)$updatedBooking['user_id'] : null,
        'bookingNumber' => $updatedBooking['booking_number'],
        'pickupLocation' => $updatedBooking['pickup_location'],
        'dropLocation' => $updatedBooking['drop_location'],
        'pickupDate' => $updatedBooking['pickup_date'],
        'returnDate' => $updatedBooking['return_date'],
        'cabType' => $updatedBooking['cab_type'],
        'distance' => (float)$updatedBooking['distance'],
        'tripType' => $updatedBooking['trip_type'],
        'tripMode' => $updatedBooking['trip_mode'],
        'totalAmount' => (float)$updatedBooking['total_amount'],
        'status' => $updatedBooking['status'],
        'passengerName' => $updatedBooking['passenger_name'],
        'passengerPhone' => $updatedBooking['passenger_phone'],
        'passengerEmail' => $updatedBooking['passenger_email'],
        'driverName' => $updatedBooking['driver_name'],
        'driverPhone' => $updatedBooking['driver_phone'],
        'vehicleNumber' => $updatedBooking['vehicle_number'],
        'adminNotes' => $updatedBooking['admin_notes'],
        'extraCharges' => $formattedExtraCharges,
        'gstEnabled' => !empty($updatedBooking['gst_enabled']),
        'gstDetails' => $formattedGstDetails,
        'billingAddress' => $updatedBooking['billing_address'] ?? null,
        'createdAt' => $updatedBooking['created_at'],
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    // Send success response
    sendJsonResponse(['status' => 'success', 'message' => 'Booking updated successfully', 'data' => $booking]);
    
} catch (Exception $e) {
    logError("Update booking error", [
        'message' => $e->getMessage(), 
        'trace' => $e->getTraceAsString()
    ]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to update booking: ' . $e->getMessage()], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
