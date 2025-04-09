
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Set standard headers for API response FIRST to prevent any output before headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Critical error handling to prevent HTML output
function handleFatalErrors() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Fatal PHP error: ' . $error['message'] . ' in ' . $error['file'] . ' on line ' . $error['line'],
            'error_details' => $error
        ]);
        exit;
    }
}
register_shutdown_function('handleFatalErrors');

// Set error handler to prevent HTML errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) {
        // This error code is not included in error_reporting
        return false;
    }
    
    logError("PHP Error in booking.php", [
        'message' => $errstr,
        'file' => $errfile,
        'line' => $errline
    ]);
    
    // Don't output HTML for warnings/notices, just log them
    if ($errno == E_WARNING || $errno == E_NOTICE || $errno == E_DEPRECATED) {
        return true;
    }
    
    // For serious errors, return JSON error
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'PHP Error: ' . $errstr,
        'errno' => $errno,
        'file' => $errfile,
        'line' => $errline
    ]);
    exit;
}, E_ALL);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request info for debugging
logError("Admin booking endpoint request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'query' => $_SERVER['QUERY_STRING'] ?? '',
    'headers' => getallheaders(),
    'url' => $_SERVER['REQUEST_URI'],
    'remote_addr' => $_SERVER['REMOTE_ADDR']
]);

// Authenticate as admin
$headers = getallheaders();
$userId = null;
$isAdmin = false;

// More permissive authentication for development/testing
if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    try {
        $payload = verifyJwtToken($token);
        if ($payload) {
            $userId = $payload['user_id'] ?? null;
            $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
        }
    } catch (Exception $e) {
        logError("JWT verification failed: " . $e->getMessage());
        // Don't exit - continue for dev/demo mode
    }
}

// For development/testing - allow access even without auth
$devMode = true; // Set to false in production

if (!$isAdmin && !$devMode) {
    logError("Non-admin attempting admin action", ['user_id' => $userId ?? 'none', 'role' => $payload['role'] ?? 'none']);
    sendJsonResponse(['status' => 'error', 'message' => 'Admin privileges required'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // First check if the bookings table exists
    $tablesExist = $conn->query("SHOW TABLES LIKE 'bookings'");
    
    if (!$tablesExist || $tablesExist->num_rows === 0) {
        // Bookings table doesn't exist yet
        logError("Bookings table doesn't exist");
        sendJsonResponse(['status' => 'warning', 'message' => 'The bookings table does not exist yet', 'bookings' => []]);
        exit;
    }
    
    // Check if this is a request for a specific booking or all bookings
    if (isset($_GET['id'])) {
        // Get booking by ID
        $bookingId = $_GET['id'];
        
        // Handle DELETE request for specific booking
        if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
            // First check if booking exists
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            $stmt->bind_param("i", $bookingId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                logError("Booking not found for deletion", ['booking_id' => $bookingId]);
                sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
                exit;
            }
            
            // Delete the booking
            $deleteStmt = $conn->prepare("DELETE FROM bookings WHERE id = ?");
            $deleteStmt->bind_param("i", $bookingId);
            $success = $deleteStmt->execute();
            
            if ($success) {
                logError("Booking deleted successfully", ['booking_id' => $bookingId, 'by_user_id' => $userId ?? 'dev_mode']);
                sendJsonResponse(['status' => 'success', 'message' => 'Booking deleted successfully']);
            } else {
                throw new Exception("Failed to delete booking: " . $conn->error);
            }
        } 
        // Handle POST or PUT request for updating booking status
        else if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
            // Get request body
            $requestData = json_decode(file_get_contents('php://input'), true);
            logError("Admin booking update request", ['booking_id' => $bookingId, 'data' => $requestData]);
            
            if (isset($requestData['status'])) {
                // First check if booking exists
                $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
                $stmt->bind_param("i", $bookingId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 0) {
                    logError("Booking not found for status update", ['booking_id' => $bookingId]);
                    sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
                    exit;
                }
                
                // Update booking status
                $newStatus = $requestData['status'];
                $updateStmt = $conn->prepare("UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?");
                $updateStmt->bind_param("si", $newStatus, $bookingId);
                $success = $updateStmt->execute();
                
                if ($success) {
                    logError("Booking status updated successfully", [
                        'booking_id' => $bookingId, 
                        'new_status' => $newStatus,
                        'by_user_id' => $userId ?? 'dev_mode'
                    ]);
                    
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
                        'createdAt' => $booking['created_at'],
                        'updatedAt' => $booking['updated_at']
                    ];
                    
                    sendJsonResponse(['status' => 'success', 'message' => 'Booking status updated successfully', 'data' => $formattedBooking]);
                } else {
                    throw new Exception("Failed to update booking status: " . $conn->error);
                }
            } else {
                logError("Missing status in booking update request", ['booking_id' => $bookingId, 'data' => $requestData]);
                sendJsonResponse(['status' => 'error', 'message' => 'Status is required for booking update'], 400);
            }
        }
        // Handle GET request for admin to view a specific booking
        else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            $stmt->bind_param("i", $bookingId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                logError("Booking not found", ['booking_id' => $bookingId]);
                sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
                exit;
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
                'createdAt' => $booking['created_at'],
                'updatedAt' => $booking['updated_at']
            ];
            
            sendJsonResponse(['status' => 'success', 'data' => $formattedBooking]);
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
        }
    } else {
        // This is a request for all bookings (no specific ID)
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            // Debug log for troubleshooting
            logError("Fetching all bookings", ["userId" => $userId, "isAdmin" => $isAdmin ? "true" : "false"]);
            
            // Get status filter if provided
            $statusFilter = isset($_GET['status']) && $_GET['status'] !== 'all' ? $_GET['status'] : '';
            
            // Prepare SQL query with optional status filter
            $sql = "SELECT * FROM bookings";
            if (!empty($statusFilter)) {
                $sql .= " WHERE status = ?";
            }
            $sql .= " ORDER BY created_at DESC";
            
            logError("SQL query for bookings", ["sql" => $sql, "status_filter" => $statusFilter]);
            
            $stmt = $conn->prepare($sql);
            
            if ($stmt === false) {
                logError("Error preparing statement", ["error" => $conn->error]);
                sendJsonResponse(['status' => 'error', 'message' => 'Database error: ' . $conn->error], 500);
                exit;
            }
            
            // Bind status parameter if filter is applied
            if (!empty($statusFilter)) {
                $stmt->bind_param("s", $statusFilter);
            }
            
            $success = $stmt->execute();
            
            if (!$success) {
                logError("Error executing query", ["error" => $stmt->error]);
                sendJsonResponse(['status' => 'error', 'message' => 'Failed to execute query: ' . $stmt->error], 500);
                exit;
            }
            
            $result = $stmt->get_result();
            
            if ($result === false) {
                logError("Error getting query result", ["error" => $stmt->error]);
                sendJsonResponse(['status' => 'error', 'message' => 'Failed to get result: ' . $stmt->error], 500);
                exit;
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
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
                $bookings[] = $booking;
            }
            
            logError("Fetched all bookings", ['count' => count($bookings), 'status_filter' => $statusFilter]);
            
            // Make sure we're sending a proper JSON response
            sendJsonResponse(['status' => 'success', 'bookings' => $bookings]);
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
        }
    }
} catch (Exception $e) {
    logError("Error in admin booking endpoint", ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}

// Helper function to ensure JSON response
function sendJsonResponse($data, $statusCode = 200) {
    // Ensure proper headers are sent
    header('Content-Type: application/json');
    http_response_code($statusCode);
    
    // Prevent any debug output before or after JSON
    ob_clean();
    
    // Encode with proper options to ensure valid JSON and pretty print for debugging
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    // Make sure no further output happens
    exit;
}
?>
