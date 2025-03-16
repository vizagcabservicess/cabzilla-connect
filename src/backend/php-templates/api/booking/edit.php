
<?php
// Include configuration
require_once __DIR__ . '/../../config.php';

// For CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Log request details
logError("Booking edit.php request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI'],
    'query_string' => $_SERVER['QUERY_STRING'],
    'get_params' => $_GET
]);

// Get booking ID from URL
$bookingId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if (!$bookingId) {
    logError("Missing booking ID in request", ['GET' => $_GET]);
    sendJsonResponse(['status' => 'error', 'message' => 'Invalid booking ID'], 400);
    exit;
}

// Check if this is a GET or POST request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // This is a GET request - return the booking details
    
    // Authenticate the user
    $userData = authenticate();
    
    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
        exit;
    }
    
    // Prepare SQL - allow admins to view any booking, but regular users only their own
    if (isset($userData['role']) && $userData['role'] === 'admin') {
        $sql = "SELECT * FROM bookings WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $bookingId);
    } else {
        $userId = $userData['user_id'];
        $sql = "SELECT * FROM bookings WHERE id = ? AND user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $bookingId, $userId);
    }
    
    // Execute query
    if (!$stmt->execute()) {
        logError("Failed to execute query", ['error' => $stmt->error]);
        sendJsonResponse(['status' => 'error', 'message' => 'Failed to retrieve booking details'], 500);
        exit;
    }
    
    $result = $stmt->get_result();
    $booking = $result->fetch_assoc();
    
    if (!$booking) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    // Format the booking data
    $formattedBooking = [
        'id' => $booking['id'],
        'userId' => $booking['user_id'],
        'bookingNumber' => $booking['booking_number'],
        'pickupLocation' => $booking['pickup_location'],
        'dropLocation' => $booking['drop_location'],
        'pickupDate' => $booking['pickup_date'],
        'returnDate' => $booking['return_date'],
        'cabType' => $booking['cab_type'],
        'distance' => floatval($booking['distance']),
        'tripType' => $booking['trip_type'],
        'tripMode' => $booking['trip_mode'],
        'totalAmount' => floatval($booking['total_amount']),
        'status' => $booking['status'],
        'passengerName' => $booking['passenger_name'],
        'passengerPhone' => $booking['passenger_phone'],
        'passengerEmail' => $booking['passenger_email'],
        'hourlyPackage' => $booking['hourly_package'],
        'tourId' => $booking['tour_id'],
        'driverName' => $booking['driver_name'],
        'driverPhone' => $booking['driver_phone'],
        'vehicleNumber' => $booking['vehicle_number'],
        'createdAt' => $booking['created_at'],
        'updatedAt' => $booking['updated_at']
    ];
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Booking details retrieved',
        'data' => $formattedBooking
    ]);
    
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // This is a POST request - update the booking
    
    // Authenticate the user
    $userData = authenticate();
    
    // Get the request body
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    
    logError("Booking update request data", [
        'raw_input' => $rawInput,
        'decoded_data' => $data
    ]);
    
    if (!$data) {
        sendJsonResponse(['status' => 'error', 'message' => 'Invalid request data'], 400);
        exit;
    }
    
    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
        exit;
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // First, verify booking exists and belongs to this user (or user is admin)
        if (isset($userData['role']) && $userData['role'] === 'admin') {
            $sql = "SELECT * FROM bookings WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $bookingId);
        } else {
            $userId = $userData['user_id'];
            $sql = "SELECT * FROM bookings WHERE id = ? AND user_id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ii", $bookingId, $userId);
        }
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to execute query: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $booking = $result->fetch_assoc();
        
        if (!$booking) {
            throw new Exception("Booking not found or access denied");
        }
        
        // Check if booking is in a status that can be modified
        $allowedStatuses = ['pending', 'confirmed'];
        if (!in_array($booking['status'], $allowedStatuses)) {
            throw new Exception("This booking cannot be modified (status: {$booking['status']})");
        }
        
        // Prepare update query based on provided fields
        $updateFields = [];
        $params = [];
        $types = "";
        
        // Fields that can be updated
        $allowedFields = [
            'pickup_location' => 's',
            'drop_location' => 's',
            'pickup_date' => 's',
            'return_date' => 's',
            'passenger_name' => 's',
            'passenger_phone' => 's',
            'passenger_email' => 's',
            'status' => 's'
        ];
        
        // Admin-only fields
        $adminOnlyFields = [
            'cab_type' => 's',
            'distance' => 'd',
            'total_amount' => 'd',
            'driver_name' => 's',
            'driver_phone' => 's',
            'vehicle_number' => 's'
        ];
        
        // Add admin-only fields if user is admin
        if (isset($userData['role']) && $userData['role'] === 'admin') {
            $allowedFields = array_merge($allowedFields, $adminOnlyFields);
        }
        
        // Map API field names to database field names
        $fieldMapping = [
            'pickupLocation' => 'pickup_location',
            'dropLocation' => 'drop_location',
            'pickupDate' => 'pickup_date',
            'returnDate' => 'return_date',
            'passengerName' => 'passenger_name',
            'passengerPhone' => 'passenger_phone',
            'passengerEmail' => 'passenger_email',
            'cabType' => 'cab_type',
            'distance' => 'distance',
            'totalAmount' => 'total_amount',
            'status' => 'status',
            'driverName' => 'driver_name',
            'driverPhone' => 'driver_phone',
            'vehicleNumber' => 'vehicle_number'
        ];
        
        // Build the update query
        foreach ($fieldMapping as $apiField => $dbField) {
            if (isset($data[$apiField]) && isset($allowedFields[$dbField])) {
                $updateFields[] = "$dbField = ?";
                $params[] = $data[$apiField];
                $types .= $allowedFields[$dbField];
            }
        }
        
        // Always update the updated_at timestamp
        $updateFields[] = "updated_at = NOW()";
        
        // If there are no fields to update, throw an error
        if (empty($updateFields)) {
            throw new Exception("No valid fields to update");
        }
        
        // Build and execute the update query
        $sql = "UPDATE bookings SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Failed to prepare update statement: " . $conn->error);
        }
        
        // Add booking ID to params and types
        $params[] = $bookingId;
        $types .= "i";
        
        // Bind parameters dynamically
        $stmt->bind_param($types, ...$params);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to execute update: " . $stmt->error);
        }
        
        // Get the updated booking
        $sql = "SELECT * FROM bookings WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $bookingId);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to retrieve updated booking: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $updatedBooking = $result->fetch_assoc();
        
        if (!$updatedBooking) {
            throw new Exception("Failed to retrieve updated booking record");
        }
        
        // Format the updated booking data
        $formattedBooking = [
            'id' => $updatedBooking['id'],
            'userId' => $updatedBooking['user_id'],
            'bookingNumber' => $updatedBooking['booking_number'],
            'pickupLocation' => $updatedBooking['pickup_location'],
            'dropLocation' => $updatedBooking['drop_location'],
            'pickupDate' => $updatedBooking['pickup_date'],
            'returnDate' => $updatedBooking['return_date'],
            'cabType' => $updatedBooking['cab_type'],
            'distance' => floatval($updatedBooking['distance']),
            'tripType' => $updatedBooking['trip_type'],
            'tripMode' => $updatedBooking['trip_mode'],
            'totalAmount' => floatval($updatedBooking['total_amount']),
            'status' => $updatedBooking['status'],
            'passengerName' => $updatedBooking['passenger_name'],
            'passengerPhone' => $updatedBooking['passenger_phone'],
            'passengerEmail' => $updatedBooking['passenger_email'],
            'hourlyPackage' => $updatedBooking['hourly_package'],
            'tourId' => $updatedBooking['tour_id'],
            'driverName' => $updatedBooking['driver_name'],
            'driverPhone' => $updatedBooking['driver_phone'],
            'vehicleNumber' => $updatedBooking['vehicle_number'],
            'createdAt' => $updatedBooking['created_at'],
            'updatedAt' => $updatedBooking['updated_at']
        ];
        
        // Commit the transaction
        $conn->commit();
        
        // Send email notifications
        sendBookingUpdateNotification($formattedBooking);
        
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Booking updated successfully',
            'data' => $formattedBooking
        ]);
        
    } catch (Exception $e) {
        // Roll back the transaction
        $conn->rollback();
        
        logError("Booking update failed", [
            'error' => $e->getMessage(),
            'booking_id' => $bookingId,
            'data' => $data
        ]);
        
        sendJsonResponse([
            'status' => 'error',
            'message' => 'Failed to update booking: ' . $e->getMessage()
        ], 500);
    }
} else {
    // Method not allowed
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Function to send email notifications for booking updates
function sendBookingUpdateNotification($booking) {
    // Admin email
    $adminEmail = 'narendrakumarupwork@gmail.com';
    
    // Log the notification attempt
    logError("Sending booking update notification", [
        'booking_id' => $booking['id'],
        'booking_number' => $booking['bookingNumber'],
        'user_email' => $booking['passengerEmail'],
        'admin_email' => $adminEmail
    ]);
    
    // Prepare the email subject and message for user
    $userSubject = "Your booking #{$booking['bookingNumber']} has been updated";
    $userMessage = "Dear {$booking['passengerName']},\n\n";
    $userMessage .= "Your booking with reference number #{$booking['bookingNumber']} has been updated.\n\n";
    $userMessage .= "Updated booking details:\n";
    $userMessage .= "Pickup: {$booking['pickupLocation']}\n";
    if (!empty($booking['dropLocation'])) {
        $userMessage .= "Drop-off: {$booking['dropLocation']}\n";
    }
    $userMessage .= "Pickup Date: {$booking['pickupDate']}\n";
    if (!empty($booking['returnDate'])) {
        $userMessage .= "Return Date: {$booking['returnDate']}\n";
    }
    $userMessage .= "Vehicle: {$booking['cabType']}\n";
    $userMessage .= "Status: {$booking['status']}\n";
    $userMessage .= "Total Amount: ₹{$booking['totalAmount']}\n\n";
    $userMessage .= "Thank you for choosing our service.\n";
    
    // Prepare the email subject and message for admin
    $adminSubject = "Booking #{$booking['bookingNumber']} has been updated";
    $adminMessage = "Booking #{$booking['bookingNumber']} has been updated.\n\n";
    $adminMessage .= "Customer: {$booking['passengerName']} ({$booking['passengerEmail']})\n";
    $adminMessage .= "Phone: {$booking['passengerPhone']}\n";
    $adminMessage .= "Pickup: {$booking['pickupLocation']}\n";
    if (!empty($booking['dropLocation'])) {
        $adminMessage .= "Drop-off: {$booking['dropLocation']}\n";
    }
    $adminMessage .= "Pickup Date: {$booking['pickupDate']}\n";
    if (!empty($booking['returnDate'])) {
        $adminMessage .= "Return Date: {$booking['returnDate']}\n";
    }
    $adminMessage .= "Vehicle: {$booking['cabType']}\n";
    $adminMessage .= "Trip Type: {$booking['tripType']} ({$booking['tripMode']})\n";
    $adminMessage .= "Status: {$booking['status']}\n";
    $adminMessage .= "Total Amount: ₹{$booking['totalAmount']}\n";
    
    // Set mail headers
    $headers = "From: noreply@yourdomain.com\r\n";
    $headers .= "Reply-To: noreply@yourdomain.com\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    
    // Send emails
    try {
        // Send email to user
        @mail($booking['passengerEmail'], $userSubject, $userMessage, $headers);
        
        // Send email to admin
        @mail($adminEmail, $adminSubject, $adminMessage, $headers);
        
        logError("Email notifications sent", [
            'user_email' => $booking['passengerEmail'],
            'admin_email' => $adminEmail
        ]);
        
        return true;
    } catch (Exception $e) {
        logError("Failed to send email notifications", [
            'error' => $e->getMessage(),
            'booking_id' => $booking['id']
        ]);
        
        return false;
    }
}
?>
