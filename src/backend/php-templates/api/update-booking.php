
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Debug log the request
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
$requestUri = $_SERVER['REQUEST_URI'] ?? 'UNKNOWN';
logError("Update booking request", [
    'method' => $requestMethod,
    'uri' => $requestUri,
    'time' => date('Y-m-d H:i:s')
]);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Allow both POST and PUT requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

try {
    // Get booking ID from URL or request body
    $bookingId = null;
    if (isset($_GET['id'])) {
        $bookingId = $_GET['id'];
    } else {
        // Get data from request body
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['id'])) {
            $bookingId = $data['id'];
        } else {
            sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
            exit;
        }
    }

    // Get user ID from JWT token
    $headers = getallheaders();
    $userId = null;
    $isAdmin = false;

    if (isset($headers['Authorization']) || isset($headers['authorization'])) {
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
        $token = str_replace('Bearer ', '', $authHeader);
        
        $payload = verifyJwtToken($token);
        if ($payload && isset($payload['user_id'])) {
            $userId = $payload['user_id'];
            $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
        }
    }

    // For development, allow unauthenticated access temporarily
    if (!$userId) {
        logError("Using development access for update-booking.php");
        $userId = 1;
        $isAdmin = true;
    }

    // Get data from request body
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid request data'], 400);
        exit;
    }

    // Debug log the incoming data
    logError("Update booking request data", $data);

    // Connect to database with enhanced retry logic
    $conn = null;
    $maxRetries = 5; // Increased from 3
    $retryCount = 0;
    $lastError = null;

    while ($retryCount < $maxRetries) {
        try {
            $conn = getDbConnection();
            if ($conn) {
                logError("Database connection successful on attempt " . ($retryCount + 1));
                break;
            }
            throw new Exception("Connection failed without error");
        } catch (Exception $e) {
            $lastError = $e;
            $retryCount++;
            $delayMs = 300 * $retryCount; // Progressive backoff
            logError("Database connection attempt failed ($retryCount/$maxRetries)", [
                'error' => $e->getMessage(),
                'delay' => $delayMs . 'ms'
            ]);
            
            if ($retryCount < $maxRetries) {
                usleep($delayMs * 1000); // Convert to microseconds
            }
        }
    }

    if (!$conn) {
        logError("All database connection attempts failed. Using fallback mechanism.");
        
        // Try alternative connection method as fallback
        try {
            $conn = getFallbackDbConnection();
            if ($conn) {
                logError("Fallback database connection successful");
            } else {
                throw new Exception("Fallback connection failed without error");
            }
        } catch (Exception $e) {
            logError("Fallback connection also failed: " . $e->getMessage());
            throw new Exception("Failed to connect to database after $maxRetries attempts and fallback: " . $lastError->getMessage());
        }
    }

    // First check if the booking exists and belongs to the user or the user is an admin
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Check if the booking belongs to the user or if the user is an admin
    if ($booking['user_id'] != $userId && !$isAdmin) {
        sendJsonResponse(['status' => 'error', 'message' => 'You do not have permission to update this booking'], 403);
        exit;
    }
    
    // Build the update query based on provided fields
    $updateFields = [];
    $updateValues = [];
    $updateTypes = "";
    
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
        'admin_notes' => 'adminNotes'
    ];
    
    // Map API field names to database field names
    foreach ($allowedFields as $dbField => $apiField) {
        if (isset($data[$apiField])) {
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
        'types' => $updateTypes
    ]);
    
    // Update the booking with retry logic
    $updateRetries = 3;
    $updateRetryCount = 0;
    $updateSuccess = false;
    
    while ($updateRetryCount < $updateRetries && !$updateSuccess) {
        try {
            // Update the booking
            $updateQuery = "UPDATE bookings SET " . implode(", ", $updateFields) . ", updated_at = NOW() WHERE id = ?";
            $updateStmt = $conn->prepare($updateQuery);
            
            if (!$updateStmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            // Dynamically bind parameters
            $bindParams = array_merge([$updateTypes], $updateValues);
            $updateStmt->bind_param(...$bindParams);
            
            $updateSuccess = $updateStmt->execute();
            
            if (!$updateSuccess) {
                throw new Exception('Database error: ' . $updateStmt->error);
            }
            
            break;
        } catch (Exception $e) {
            $updateRetryCount++;
            logError("Update booking retry ($updateRetryCount/$updateRetries): " . $e->getMessage());
            
            if ($updateRetryCount < $updateRetries) {
                // Wait a bit before retrying
                usleep(200000); // 200ms delay
            } else {
                throw $e; // Re-throw the exception after all retries fail
            }
        }
    }
    
    // Get the updated booking
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    $updatedBooking = $result->fetch_assoc();
    
    // Format the response
    $booking = [
        'id' => (int)$updatedBooking['id'],
        'userId' => (int)$updatedBooking['user_id'],
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
        'createdAt' => $updatedBooking['created_at'],
        'updatedAt' => $updatedBooking['updated_at']
    ];
    
    sendJsonResponse([
        'status' => 'success', 
        'message' => 'Booking updated successfully', 
        'data' => $booking,
        'requestTime' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    logError("Update booking error", ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to update booking: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], 500);
}
