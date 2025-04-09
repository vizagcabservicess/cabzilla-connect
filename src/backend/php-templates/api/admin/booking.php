
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

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
    // Try multiple ways to get a database connection
    if (function_exists('getDbConnection')) {
        error_log("Using getDbConnection from config.php");
        $conn = getDbConnection();
    } else {
        // Direct connection as fallback
        error_log("Using direct database connection as fallback");
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
    }
    
    // Test the connection
    if (!$conn->ping()) {
        throw new Exception("Database connection is not active");
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
            $stmt->bind_param("i", $bookingId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
            }
            
            // Delete the booking
            $deleteStmt = $conn->prepare("DELETE FROM bookings WHERE id = ?");
            $deleteStmt->bind_param("i", $bookingId);
            $success = $deleteStmt->execute();
            
            if ($success) {
                sendJsonResponse(['status' => 'success', 'message' => 'Booking deleted successfully']);
            } else {
                throw new Exception("Failed to delete booking: " . $conn->error);
            }
        } 
        // Handle POST or PUT request for updating booking status
        else if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
            // Get request body
            $requestData = json_decode(file_get_contents('php://input'), true);
            
            if (isset($requestData['status'])) {
                // First check if booking exists
                $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
                $stmt->bind_param("i", $bookingId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 0) {
                    sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
                }
                
                // Update booking status
                $newStatus = $requestData['status'];
                $updateStmt = $conn->prepare("UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?");
                $updateStmt->bind_param("si", $newStatus, $bookingId);
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
                        'createdAt' => $booking['created_at'],
                        'updatedAt' => $booking['updated_at']
                    ];
                    
                    sendJsonResponse(['status' => 'success', 'message' => 'Booking status updated successfully', 'data' => $formattedBooking]);
                } else {
                    throw new Exception("Failed to update booking status: " . $conn->error);
                }
            } else {
                sendJsonResponse(['status' => 'error', 'message' => 'Status is required for booking update'], 400);
            }
        }
        // Handle GET request for specific booking
        else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            $stmt->bind_param("i", $bookingId);
            $stmt->execute();
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
            try {
                $tableCheck = $conn->query("SHOW TABLES LIKE 'bookings'");
                if ($tableCheck === false) {
                    throw new Exception("Error checking tables: " . $conn->error);
                }
                
                if ($tableCheck->num_rows === 0) {
                    // Table doesn't exist, return empty bookings array
                    sendJsonResponse(['status' => 'success', 'bookings' => []]);
                }
            } catch (Exception $e) {
                error_log("Error checking bookings table: " . $e->getMessage());
                // Continue and try the query anyway
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
