
<?php
/**
 * booking-assign-vehicle.php - Assign a vehicle to a booking
 */

// Set CORS headers FIRST
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Clear any previous output
if (ob_get_level()) {
    ob_end_clean();
}

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}
$logFile = $logDir . '/vehicle_assignments_' . date('Y-m-d') . '.log';

// Log the request for debugging
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Booking-assign-vehicle API accessed. Method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

// Function to log debug info
function logDebug($message, $data = null) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $logMessage .= ": " . json_encode($data);
        } else {
            $logMessage .= ": " . $data;
        }
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

// Function to return a JSON response
function sendJsonResponse($status, $message, $data = null) {
    $response = [
        'status' => $status,
        'message' => $message,
        'timestamp' => time()
    ];
    
    if ($data !== null) {
        $response = array_merge($response, $data);
    }
    
    echo json_encode($response);
    exit;
}

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logDebug("Invalid method: " . $_SERVER['REQUEST_METHOD']);
    sendJsonResponse('error', 'Only POST method is allowed');
}

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        logDebug("Connected to database using config.php");
    } 
    // Fallback to hardcoded credentials
    else {
        logDebug("Config file not found, using hardcoded credentials");
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        logDebug("Connected to database using hardcoded credentials");
    }
    
    // Get raw input
    $rawInput = file_get_contents('php://input');
    logDebug("Raw input received", $rawInput);
    
    // Try to decode JSON input
    $input = json_decode($rawInput, true);
    $jsonError = json_last_error();
    
    // Fall back to POST data if JSON parsing fails
    if ($jsonError !== JSON_ERROR_NONE) {
        logDebug("JSON decode error: " . json_last_error_msg() . " (code: $jsonError)");
        if (!empty($_POST)) {
            logDebug("Using POST data instead");
            $input = $_POST;
        }
    }
    
    // Verify we have valid data
    if (empty($input)) {
        logDebug("Input data is empty after processing");
        throw new Exception("No data provided or invalid format");
    }
    
    // Extract required fields
    $bookingId = isset($input['bookingId']) ? $input['bookingId'] : null;
    $vehicleId = isset($input['vehicleId']) ? $input['vehicleId'] : null;
    $driverId = isset($input['driverId']) ? $input['driverId'] : null;
    
    if (!$bookingId || !$vehicleId) {
        throw new Exception("Missing required fields: bookingId and vehicleId are required");
    }
    
    // Check if vehicle_assignments table exists, if not, create it
    $tableExistsQuery = $conn->query("SHOW TABLES LIKE 'vehicle_assignments'");
    if ($tableExistsQuery->num_rows == 0) {
        // Create the table
        $createTableSql = "CREATE TABLE IF NOT EXISTS vehicle_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            vehicle_id VARCHAR(50) NOT NULL,
            driver_id VARCHAR(50),
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'assigned',
            notes TEXT,
            UNIQUE KEY (booking_id)
        )";
        
        if (!$conn->query($createTableSql)) {
            throw new Exception("Failed to create vehicle_assignments table: " . $conn->error);
        }
        
        logDebug("Created vehicle_assignments table");
    }
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Check if assignment already exists
        $checkSql = "SELECT id FROM vehicle_assignments WHERE booking_id = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("i", $bookingId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows > 0) {
            // Assignment exists, update it
            $row = $result->fetch_assoc();
            $assignmentId = $row['id'];
            
            $updateSql = "UPDATE vehicle_assignments 
                         SET vehicle_id = ?, driver_id = ?, updated_at = NOW() 
                         WHERE id = ?";
            $updateStmt = $conn->prepare($updateSql);
            
            if ($driverId) {
                $updateStmt->bind_param("ssi", $vehicleId, $driverId, $assignmentId);
            } else {
                $updateSql = "UPDATE vehicle_assignments 
                             SET vehicle_id = ?, updated_at = NOW() 
                             WHERE id = ?";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("si", $vehicleId, $assignmentId);
            }
            
            if (!$updateStmt->execute()) {
                throw new Exception("Failed to update assignment: " . $updateStmt->error);
            }
            
            logDebug("Updated assignment #$assignmentId for booking #$bookingId with vehicle $vehicleId" . ($driverId ? " and driver $driverId" : ""));
        } else {
            // Create new assignment
            if ($driverId) {
                $insertSql = "INSERT INTO vehicle_assignments (booking_id, vehicle_id, driver_id) VALUES (?, ?, ?)";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("iss", $bookingId, $vehicleId, $driverId);
            } else {
                $insertSql = "INSERT INTO vehicle_assignments (booking_id, vehicle_id) VALUES (?, ?)";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("is", $bookingId, $vehicleId);
            }
            
            if (!$insertStmt->execute()) {
                throw new Exception("Failed to create assignment: " . $insertStmt->error);
            }
            
            $assignmentId = $conn->insert_id;
            logDebug("Created assignment #$assignmentId for booking #$bookingId with vehicle $vehicleId" . ($driverId ? " and driver $driverId" : ""));
        }
        
        // Update the booking table with vehicle_id and update status to confirmed
        $updateBookingSql = "UPDATE bookings SET fleet_vehicle_id = ?, status = 'confirmed', updated_at = NOW() WHERE id = ?";
        $updateBookingStmt = $conn->prepare($updateBookingSql);
        $updateBookingStmt->bind_param("si", $vehicleId, $bookingId);
        
        if (!$updateBookingStmt->execute()) {
            logDebug("Warning: Could not update booking table: " . $updateBookingStmt->error);
            // Not throwing exception as assignment was successful
        } else {
            logDebug("Updated booking #$bookingId with vehicle $vehicleId");
        }
        
        // Commit transaction
        $conn->commit();
        
        // Return success
        sendJsonResponse('success', 'Vehicle assigned to booking successfully', [
            'assignmentId' => $assignmentId,
            'bookingId' => $bookingId,
            'vehicleId' => $vehicleId,
            'driverId' => $driverId
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    logDebug("Error: " . $e->getMessage());
    sendJsonResponse('error', 'Failed to assign vehicle: ' . $e->getMessage());
}
