<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Set response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Get request body
$requestData = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$requiredFields = ['pickupLocation', 'cabType', 'pickupDate', 'passengerName', 'passengerPhone', 'passengerEmail', 'tripType', 'tripMode', 'totalAmount'];
foreach ($requiredFields as $field) {
    if (!isset($requestData[$field]) || empty($requestData[$field])) {
        sendJsonResponse(['status' => 'error', 'message' => "Missing required field: $field"], 400);
        exit;
    }
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Generate unique booking number
    $bookingNumber = 'VTH' . date('ymd') . strtoupper(substr(uniqid(), -6));
    
    // Prepare SQL query
    $sql = "INSERT INTO bookings (
                booking_number, 
                pickup_location, 
                drop_location, 
                pickup_date, 
                return_date, 
                cab_type, 
                distance, 
                trip_type, 
                trip_mode, 
                total_amount, 
                status, 
                passenger_name, 
                passenger_phone, 
                passenger_email, 
                hourly_package,
                admin_notes,
                discount_amount,
                discount_type,
                discount_value,
                is_paid,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    // Set default values
    $status = 'pending';
    $dropLocation = isset($requestData['dropLocation']) ? $requestData['dropLocation'] : '';
    $returnDate = isset($requestData['returnDate']) && !empty($requestData['returnDate']) ? $requestData['returnDate'] : null;
    $distance = isset($requestData['distance']) ? $requestData['distance'] : 0;
    $hourlyPackage = isset($requestData['hourlyPackage']) ? $requestData['hourlyPackage'] : null;
    $adminNotes = isset($requestData['adminNotes']) ? $requestData['adminNotes'] : '';
    $discountAmount = isset($requestData['discountAmount']) ? $requestData['discountAmount'] : 0;
    $discountType = isset($requestData['discountType']) ? $requestData['discountType'] : null;
    $discountValue = isset($requestData['discountValue']) ? $requestData['discountValue'] : 0;
    $isPaid = isset($requestData['isPaid']) && $requestData['isPaid'] ? 1 : 0;
    $createdBy = isset($requestData['createdBy']) ? $requestData['createdBy'] : 'admin';
    
    // Prepare statement
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    // Bind parameters
    $stmt->bind_param(
        "ssssssdssdsssssdidsis",
        $bookingNumber,
        $requestData['pickupLocation'],
        $dropLocation,
        $requestData['pickupDate'],
        $returnDate,
        $requestData['cabType'],
        $distance,
        $requestData['tripType'],
        $requestData['tripMode'],
        $requestData['totalAmount'],
        $status,
        $requestData['passengerName'],
        $requestData['passengerPhone'],
        $requestData['passengerEmail'],
        $hourlyPackage,
        $adminNotes,
        $discountAmount,
        $discountType,
        $discountValue,
        $isPaid,
        $createdBy
    );
    
    // Execute query
    $success = $stmt->execute();
    if (!$success) {
        throw new Exception("Failed to create booking: " . $stmt->error);
    }
    
    // Get inserted booking ID
    $bookingId = $conn->insert_id;
    
    // Fetch the created booking
    $selectStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $selectStmt->bind_param("i", $bookingId);
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    $booking = $result->fetch_assoc();
    
    // Format response
    $response = [
        'status' => 'success',
        'message' => 'Booking created successfully',
        'id' => $bookingId,
        'booking_number' => $bookingNumber,
        'data' => $booking
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    logError("Error creating booking", ['error' => $e->getMessage(), 'request' => $requestData]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to create booking: ' . $e->getMessage()], 500);
}

// Close connection
$conn->close();
