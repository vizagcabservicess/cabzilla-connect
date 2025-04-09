
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../utils/database.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Debug mode - to diagnose problems
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request info
error_log("Admin booking endpoint request: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);

// Always use JSON response helper
function sendJsonResponse($data, $statusCode = 200) {
    // Ensure proper HTTP status code
    http_response_code($statusCode);
    
    // Clear any output buffering to prevent HTML contamination
    if (ob_get_level()) {
        ob_end_clean();
    }
    
    // Ensure proper JSON encoding
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Connect to database with improved error handling
try {
    // Get a database connection with retry
    $conn = getDbConnectionWithRetry(3);
    
    if (!$conn) {
        throw new Exception("Failed to establish database connection after multiple attempts");
    }
    
    // Ensure bookings table exists
    if (!ensureBookingsTableExists($conn)) {
        throw new Exception("Failed to ensure bookings table exists");
    }
    
} catch (Exception $e) {
    error_log("Database connection failed in booking.php: " . $e->getMessage());
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Database connection failed: ' . $e->getMessage(),
        'error_details' => $debugMode ? [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ] : null
    ], 500);
}

try {
    // Check if this is a request for a specific booking or all bookings
    if (isset($_GET['id'])) {
        // Get booking by ID
        $bookingId = $_GET['id'];
        
        // Handle DELETE request for specific booking
        if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->error);
            }
            
            $stmt->bind_param("i", $bookingId);
            if (!$stmt->execute()) {
                throw new Exception("Execute statement failed: " . $stmt->error);
            }
            
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
            }
            
            // Delete the booking
            $deleteStmt = $conn->prepare("DELETE FROM bookings WHERE id = ?");
            if (!$deleteStmt) {
                throw new Exception("Prepare delete statement failed: " . $conn->error);
            }
            
            $deleteStmt->bind_param("i", $bookingId);
            $success = $deleteStmt->execute();
            
            if ($success) {
                sendJsonResponse(['status' => 'success', 'message' => 'Booking deleted successfully']);
            } else {
                throw new Exception("Failed to delete booking: " . $deleteStmt->error);
            }
        } 
        // Handle POST or PUT request for updating booking status
        else if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
            // Get request body
            $requestData = json_decode(file_get_contents('php://input'), true);
            
            if (!$requestData) {
                sendJsonResponse(['status' => 'error', 'message' => 'Invalid JSON data received'], 400);
            }
            
            // First check if booking exists
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->error);
            }
            
            $stmt->bind_param("i", $bookingId);
            if (!$stmt->execute()) {
                throw new Exception("Execute statement failed: " . $stmt->error);
            }
            
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
            }
            
            // Update fields based on the request data
            $updateFields = [];
            $updateTypes = "";
            $updateValues = [];
            
            // Check which fields to update
            if (isset($requestData['status'])) {
                $updateFields[] = "status = ?";
                $updateTypes .= "s";
                $updateValues[] = $requestData['status'];
            }
            
            if (isset($requestData['driverName'])) {
                $updateFields[] = "driver_name = ?";
                $updateTypes .= "s";
                $updateValues[] = $requestData['driverName'];
            }
            
            if (isset($requestData['driverPhone'])) {
                $updateFields[] = "driver_phone = ?";
                $updateTypes .= "s";
                $updateValues[] = $requestData['driverPhone'];
            }
            
            if (isset($requestData['passengerName'])) {
                $updateFields[] = "passenger_name = ?";
                $updateTypes .= "s";
                $updateValues[] = $requestData['passengerName'];
            }
            
            if (isset($requestData['passengerPhone'])) {
                $updateFields[] = "passenger_phone = ?";
                $updateTypes .= "s";
                $updateValues[] = $requestData['passengerPhone'];
            }
            
            if (isset($requestData['passengerEmail'])) {
                $updateFields[] = "passenger_email = ?";
                $updateTypes .= "s";
                $updateValues[] = $requestData['passengerEmail'];
            }
            
            // If no fields to update, return error
            if (count($updateFields) === 0) {
                sendJsonResponse(['status' => 'error', 'message' => 'No fields to update provided'], 400);
            }
            
            // Add updated_at timestamp
            $updateFields[] = "updated_at = NOW()";
            
            // Add booking ID to values
            $updateTypes .= "i";
            $updateValues[] = $bookingId;
            
            // Build update SQL
            $updateSql = "UPDATE bookings SET " . implode(", ", $updateFields) . " WHERE id = ?";
            
            // Prepare and execute update
            $updateStmt = $conn->prepare($updateSql);
            if (!$updateStmt) {
                throw new Exception("Prepare update statement failed: " . $conn->error);
            }
            
            // Bind parameters dynamically
            $updateStmt->bind_param($updateTypes, ...$updateValues);
            $success = $updateStmt->execute();
            
            if ($success) {
                // Get updated booking details
                $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
                $stmt->bind_param("i", $bookingId);
                $stmt->execute();
                $result = $stmt->get_result();
                $booking = $result->fetch_assoc();
                
                // Format response data
                $formattedBooking = [
                    'id' => (int)$booking['id'],
                    'userId' => $booking['user_id'] ? (int)$booking['user_id'] : null,
                    'bookingNumber' => $booking['booking_number'],
                    'pickupLocation' => $booking['pickup_location'],
                    'dropLocation' => $booking['drop_location'],
                    'pickupDate' => $booking['pickup_date'],
                    'returnDate' => $booking['return_date'],
                    'cabType' => $booking['cab_type'],
                    'distance' => (float)$booking['distance'],
                    'tripType' => $booking['trip_type'],
                    'tripMode' => $booking['trip_mode'],
                    'totalAmount' => (float)$booking['total_amount'],
                    'status' => $booking['status'],
                    'passengerName' => $booking['passenger_name'],
                    'passengerPhone' => $booking['passenger_phone'],
                    'passengerEmail' => $booking['passenger_email'],
                    'driverName' => $booking['driver_name'],
                    'driverPhone' => $booking['driver_phone'],
                    'createdAt' => $booking['created_at'],
                    'updatedAt' => $booking['updated_at']
                ];
                
                sendJsonResponse(['status' => 'success', 'message' => 'Booking updated successfully', 'data' => $formattedBooking]);
            } else {
                throw new Exception("Failed to update booking: " . $updateStmt->error);
            }
        }
        // Handle GET request for specific booking
        else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $conn->error);
            }
            
            $stmt->bind_param("i", $bookingId);
            if (!$stmt->execute()) {
                throw new Exception("Execute statement failed: " . $stmt->error);
            }
            
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
            }
            
            $booking = $result->fetch_assoc();
            
            // Format response data
            $formattedBooking = [
                'id' => (int)$booking['id'],
                'userId' => $booking['user_id'] ? (int)$booking['user_id'] : null,
                'bookingNumber' => $booking['booking_number'],
                'pickupLocation' => $booking['pickup_location'],
                'dropLocation' => $booking['drop_location'],
                'pickupDate' => $booking['pickup_date'],
                'returnDate' => $booking['return_date'],
                'cabType' => $booking['cab_type'],
                'distance' => (float)$booking['distance'],
                'tripType' => $booking['trip_type'],
                'tripMode' => $booking['trip_mode'],
                'totalAmount' => (float)$booking['total_amount'],
                'status' => $booking['status'],
                'passengerName' => $booking['passenger_name'],
                'passengerPhone' => $booking['passenger_phone'],
                'passengerEmail' => $booking['passenger_email'],
                'driverName' => $booking['driver_name'],
                'driverPhone' => $booking['driver_phone'],
                'createdAt' => $booking['created_at'],
                'updatedAt' => $booking['updated_at']
            ];
            
            sendJsonResponse(['status' => 'success', 'data' => $formattedBooking]);
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
        }
    } else {
        // This is a request for all bookings
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            // First check if bookings table exists
            if (!tableExists($conn, 'bookings')) {
                // Table doesn't exist, create it
                if (!ensureBookingsTableExists($conn)) {
                    throw new Exception("Failed to create bookings table");
                }
                
                // Return empty bookings array since table was just created
                sendJsonResponse(['status' => 'success', 'bookings' => []]);
            }
            
            // Get status filter if provided
            $statusFilter = isset($_GET['status']) && $_GET['status'] !== 'all' ? $_GET['status'] : '';
            
            // Prepare SQL query with optional status filter
            $sql = "SELECT * FROM bookings";
            if (!empty($statusFilter)) {
                $sql .= " WHERE status = ?";
            }
            $sql .= " ORDER BY created_at DESC";
            
            try {
                $stmt = $conn->prepare($sql);
                
                if ($stmt === false) {
                    throw new Exception("Error preparing statement: " . $conn->error);
                }
                
                // Bind status parameter if filter is applied
                if (!empty($statusFilter)) {
                    $stmt->bind_param("s", $statusFilter);
                }
                
                $success = $stmt->execute();
                
                if (!$success) {
                    throw new Exception("Error executing query: " . $stmt->error);
                }
                
                $result = $stmt->get_result();
                
                if ($result === false) {
                    throw new Exception("Error getting result: " . $stmt->error);
                }
                
                $bookings = [];
                while ($row = $result->fetch_assoc()) {
                    $booking = [
                        'id' => (int)$row['id'],
                        'userId' => $row['user_id'] ? (int)$row['user_id'] : null,
                        'bookingNumber' => $row['booking_number'],
                        'pickupLocation' => $row['pickup_location'],
                        'dropLocation' => $row['drop_location'],
                        'pickupDate' => $row['pickup_date'],
                        'returnDate' => $row['return_date'],
                        'cabType' => $row['cab_type'],
                        'distance' => (float)$row['distance'],
                        'tripType' => $row['trip_type'],
                        'tripMode' => $row['trip_mode'],
                        'totalAmount' => (float)$row['total_amount'],
                        'status' => $row['status'],
                        'passengerName' => $row['passenger_name'],
                        'passengerPhone' => $row['passenger_phone'],
                        'passengerEmail' => $row['passenger_email'],
                        'driverName' => $row['driver_name'],
                        'driverPhone' => $row['driver_phone'],
                        'createdAt' => $row['created_at'],
                        'updatedAt' => $row['updated_at']
                    ];
                    $bookings[] = $booking;
                }
                
                // Return bookings array (even if empty)
                sendJsonResponse(['status' => 'success', 'bookings' => $bookings]);
            } catch (Exception $e) {
                error_log("Database query error: " . $e->getMessage());
                // Return empty array with error message
                sendJsonResponse([
                    'status' => 'error', 
                    'message' => 'Database query error: ' . $e->getMessage(),
                    'bookings' => [],
                    'debug' => $debugMode ? [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ] : null
                ], 500);
            }
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
        }
    }
} catch (Exception $e) {
    error_log("Error in admin booking endpoint: " . $e->getMessage());
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to process request: ' . $e->getMessage(),
        'debug' => $debugMode ? [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ] : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
