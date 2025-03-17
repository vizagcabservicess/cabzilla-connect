
<?php
// Include configuration
require_once '../config.php';

// Allow OPTIONS for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json');
    http_response_code(200);
    exit;
}

// Get booking ID from URL
$bookingId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$bookingId) {
    sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
    exit;
}

// Connect to database
$conn = getDbConnection();

// Handle GET request to fetch booking details
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get booking details
    $sql = "SELECT * FROM bookings WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }

    $booking = $result->fetch_assoc();

    // Format the booking data
    $formattedBooking = [
        'id' => $booking['id'],
        'bookingNumber' => $booking['booking_number'],
        'userId' => $booking['user_id'],
        'pickupLocation' => $booking['pickup_location'],
        'dropLocation' => $booking['drop_location'],
        'pickupDate' => $booking['pickup_date'],
        'returnDate' => $booking['return_date'],
        'cabType' => $booking['cab_type'],
        'distance' => (float)$booking['distance'],
        'tripType' => $booking['trip_type'],
        'tripMode' => $booking['trip_mode'],
        'hourlyPackage' => $booking['hourly_package'],
        'tourId' => $booking['tour_id'],
        'totalAmount' => (float)$booking['total_amount'],
        'status' => $booking['status'],
        'passengerName' => $booking['passenger_name'],
        'passengerEmail' => $booking['passenger_email'],
        'passengerPhone' => $booking['passenger_phone'],
        'createdAt' => $booking['created_at'],
        'updatedAt' => $booking['updated_at']
    ];

    // Send response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Booking details retrieved successfully',
        'data' => $formattedBooking
    ]);
    exit;
}

// Handle POST request to update booking
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get request data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Log the update request
    logError("Booking update request", ['booking_id' => $bookingId, 'data' => $data]);

    // Check if booking exists
    $checkSql = "SELECT * FROM bookings WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $bookingId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();

    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }

    // Begin transaction
    $conn->begin_transaction();

    try {
        // Prepare SQL statement for update
        $sql = "UPDATE bookings SET 
                passenger_name = ?, 
                passenger_email = ?, 
                passenger_phone = ?, 
                pickup_date = ?, 
                pickup_location = ?, 
                drop_location = ?, 
                return_date = ?, 
                cab_type = ?, 
                distance = ?, 
                trip_type = ?, 
                trip_mode = ?, 
                total_amount = ?, 
                status = ?, 
                hourly_package = ?, 
                updated_at = NOW() 
                WHERE id = ?";

        $stmt = $conn->prepare($sql);
        
        // Set default values for optional fields
        $passengerName = $data['passengerName'] ?? '';
        $passengerEmail = $data['passengerEmail'] ?? '';
        $passengerPhone = $data['passengerPhone'] ?? '';
        $pickupDate = $data['pickupDate'] ?? null;
        $pickupLocation = $data['pickupLocation'] ?? '';
        $dropLocation = $data['dropLocation'] ?? '';
        $returnDate = $data['returnDate'] ?? null;
        $cabType = $data['cabType'] ?? '';
        $distance = $data['distance'] ?? 0;
        $tripType = $data['tripType'] ?? 'outstation';
        $tripMode = $data['tripMode'] ?? 'one-way';
        $totalAmount = $data['totalAmount'] ?? 0;
        $status = $data['status'] ?? 'pending';
        $hourlyPackage = $data['hourlyPackage'] ?? null;
        
        $stmt->bind_param(
            "ssssssssdssdssi",
            $passengerName,
            $passengerEmail,
            $passengerPhone,
            $pickupDate,
            $pickupLocation,
            $dropLocation,
            $returnDate,
            $cabType,
            $distance,
            $tripType,
            $tripMode,
            $totalAmount,
            $status,
            $hourlyPackage,
            $bookingId
        );

        if (!$stmt->execute()) {
            throw new Exception("Failed to update booking: " . $stmt->error);
        }

        // Commit transaction
        $conn->commit();

        // Get updated booking
        $getSql = "SELECT * FROM bookings WHERE id = ?";
        $getStmt = $conn->prepare($getSql);
        $getStmt->bind_param("i", $bookingId);
        $getStmt->execute();
        $result = $getStmt->get_result();
        $updatedBooking = $result->fetch_assoc();

        // Format the updated booking data
        $formattedBooking = [
            'id' => $updatedBooking['id'],
            'bookingNumber' => $updatedBooking['booking_number'],
            'userId' => $updatedBooking['user_id'],
            'pickupLocation' => $updatedBooking['pickup_location'],
            'dropLocation' => $updatedBooking['drop_location'],
            'pickupDate' => $updatedBooking['pickup_date'],
            'returnDate' => $updatedBooking['return_date'],
            'cabType' => $updatedBooking['cab_type'],
            'distance' => (float)$updatedBooking['distance'],
            'tripType' => $updatedBooking['trip_type'],
            'tripMode' => $updatedBooking['trip_mode'],
            'hourlyPackage' => $updatedBooking['hourly_package'],
            'tourId' => $updatedBooking['tour_id'],
            'totalAmount' => (float)$updatedBooking['total_amount'],
            'status' => $updatedBooking['status'],
            'passengerName' => $updatedBooking['passenger_name'],
            'passengerEmail' => $updatedBooking['passenger_email'],
            'passengerPhone' => $updatedBooking['passenger_phone'],
            'createdAt' => $updatedBooking['created_at'],
            'updatedAt' => $updatedBooking['updated_at']
        ];

        // Send response
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Booking updated successfully',
            'data' => $formattedBooking
        ]);
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        
        logError("Booking update failed", [
            'booking_id' => $bookingId,
            'error' => $e->getMessage()
        ]);
        
        sendJsonResponse([
            'status' => 'error',
            'message' => $e->getMessage()
        ], 500);
    }
    exit;
}

// Handle unsupported request methods
sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
