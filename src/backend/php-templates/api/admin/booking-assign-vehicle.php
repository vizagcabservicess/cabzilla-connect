
<?php
/**
 * booking-assign-vehicle.php - Assign a vehicle to a booking
 */

// Set CORS headers FIRST
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

// Log the request for debugging
error_log('Booking-vehicle assignment API accessed. Method: ' . $_SERVER['REQUEST_METHOD']);
error_log('Request body: ' . file_get_contents('php://input'));

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time()
];

// Get request data
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

if (!$data) {
    // Try to parse as form data
    parse_str($rawData, $data);
}

// Also check POST data
if (empty($data) && !empty($_POST)) {
    $data = $_POST;
}

// Log received data
error_log('Parsed data: ' . json_encode($data));

// Validate required fields
if (empty($data['vehicle_id']) && empty($data['vehicleId'])) {
    $response['message'] = 'Vehicle ID is required';
    echo json_encode($response);
    exit;
}

if (empty($data['booking_id']) && empty($data['bookingId'])) {
    $response['message'] = 'Booking ID is required';
    echo json_encode($response);
    exit;
}

// Get normalized data
$vehicleId = $data['vehicle_id'] ?? $data['vehicleId'];
$bookingId = $data['booking_id'] ?? $data['bookingId'];
$driverId = $data['driver_id'] ?? $data['driverId'] ?? null;

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        error_log("Connected to database using config.php");
    } 
    // Fallback to hardcoded credentials
    else {
        error_log("Config file not found, using hardcoded credentials");
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        error_log("Connected to database using hardcoded credentials");
    }
} catch (Exception $e) {
    $response['message'] = 'Database connection failed: ' . $e->getMessage();
    echo json_encode($response);
    exit;
}

try {
    // Begin transaction
    $conn->begin_transaction();
    
    // Check if booking exists
    $checkBookingStmt = $conn->prepare("SELECT id, status FROM bookings WHERE id = ?");
    $checkBookingStmt->bind_param("i", $bookingId);
    $checkBookingStmt->execute();
    $bookingResult = $checkBookingStmt->get_result();
    
    if ($bookingResult->num_rows == 0) {
        throw new Exception("Booking not found");
    }
    
    $bookingRow = $bookingResult->fetch_assoc();
    
    // Check if vehicle exists 
    $checkVehicleStmt = $conn->prepare("SELECT id FROM fleet_vehicles WHERE id = ?");
    $checkVehicleStmt->bind_param("s", $vehicleId);
    $checkVehicleStmt->execute();
    $vehicleResult = $checkVehicleStmt->get_result();
    
    if ($vehicleResult->num_rows == 0) {
        // Try checking in the regular vehicles table
        $checkRegularVehicleStmt = $conn->prepare("SELECT id FROM vehicles WHERE id = ?");
        $checkRegularVehicleStmt->bind_param("s", $vehicleId);
        $checkRegularVehicleStmt->execute();
        $regularVehicleResult = $checkRegularVehicleStmt->get_result();
        
        if ($regularVehicleResult->num_rows == 0) {
            throw new Exception("Vehicle not found");
        }
    }
    
    // Check if assignment already exists
    $checkAssignmentStmt = $conn->prepare("SELECT id FROM vehicle_assignments WHERE booking_id = ?");
    $checkAssignmentStmt->bind_param("i", $bookingId);
    $checkAssignmentStmt->execute();
    $assignmentResult = $checkAssignmentStmt->get_result();
    
    if ($assignmentResult->num_rows > 0) {
        // Update existing assignment
        $assignmentRow = $assignmentResult->fetch_assoc();
        $assignmentId = $assignmentRow['id'];
        
        $updateStmt = $conn->prepare("
            UPDATE vehicle_assignments 
            SET vehicle_id = ?, driver_id = ?, updated_at = NOW() 
            WHERE id = ?
        ");
        
        $updateStmt->bind_param("sii", $vehicleId, $driverId, $assignmentId);
        $updateStmt->execute();
        
        error_log("Updated vehicle assignment: " . $assignmentId);
    } else {
        // Create new assignment
        $insertStmt = $conn->prepare("
            INSERT INTO vehicle_assignments (
                vehicle_id, booking_id, driver_id, start_date, status, created_at, updated_at
            ) VALUES (?, ?, ?, NOW(), 'scheduled', NOW(), NOW())
        ");
        
        $insertStmt->bind_param("sis", $vehicleId, $bookingId, $driverId);
        $insertStmt->execute();
        
        $assignmentId = $conn->insert_id;
        error_log("Created new vehicle assignment: " . $assignmentId);
    }
    
    // Update booking status if needed
    if ($bookingRow['status'] === 'pending') {
        $updateBookingStmt = $conn->prepare("
            UPDATE bookings 
            SET status = 'assigned', fleet_vehicle_id = ?, updated_at = NOW() 
            WHERE id = ?
        ");
        $updateBookingStmt->bind_param("si", $vehicleId, $bookingId);
        $updateBookingStmt->execute();
        
        error_log("Updated booking status to assigned: " . $bookingId);
    } else {
        // Just update the fleet_vehicle_id
        $updateBookingStmt = $conn->prepare("
            UPDATE bookings 
            SET fleet_vehicle_id = ?, updated_at = NOW() 
            WHERE id = ?
        ");
        $updateBookingStmt->bind_param("si", $vehicleId, $bookingId);
        $updateBookingStmt->execute();
        
        error_log("Updated booking fleet_vehicle_id: " . $bookingId);
    }
    
    // Commit transaction
    $conn->commit();
    
    // Return success
    $response['status'] = 'success';
    $response['message'] = 'Vehicle assigned to booking successfully';
    $response['assignmentId'] = $assignmentId;
    $response['bookingId'] = $bookingId;
    $response['vehicleId'] = $vehicleId;
    $response['driverId'] = $driverId;
    
    echo json_encode($response);
    
} catch (Exception $e) {
    // Rollback transaction
    $conn->rollback();
    
    error_log("Error assigning vehicle to booking: " . $e->getMessage());
    
    $response['message'] = $e->getMessage();
    echo json_encode($response);
}
