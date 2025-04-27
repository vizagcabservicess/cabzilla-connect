
<?php
require_once __DIR__ . '/../../config.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJsonResponse(['status' => 'success'], 200);
    exit;
}

try {
    // Only allow POST or PUT requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
        exit;
    }

    // Get JSON input data
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    if (!isset($data['bookingId'])) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
        exit;
    }

    // Connect to database with retry mechanism
    $conn = getDbConnection();
    $bookingId = $data['bookingId'];
    
    // Verify booking exists
    $checkStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $checkStmt->bind_param("i", $bookingId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    // Map fields from request to database columns
    $fieldMappings = [
        'passengerName' => ['field' => 'passenger_name', 'type' => 's'],
        'passengerPhone' => ['field' => 'passenger_phone', 'type' => 's'],
        'passengerEmail' => ['field' => 'passenger_email', 'type' => 's'],
        'pickupLocation' => ['field' => 'pickup_location', 'type' => 's'],
        'dropLocation' => ['field' => 'drop_location', 'type' => 's'],
        'pickupDate' => ['field' => 'pickup_date', 'type' => 's'],
        'returnDate' => ['field' => 'return_date', 'type' => 's'],
        'status' => ['field' => 'status', 'type' => 's'],
        'totalAmount' => ['field' => 'total_amount', 'type' => 'd'],
        'adminNotes' => ['field' => 'admin_notes', 'type' => 's']
    ];
    
    $updateFields = [];
    $updateValues = [];
    $types = "";
    
    foreach ($fieldMappings as $requestField => $mapping) {
        if (isset($data[$requestField])) {
            $updateFields[] = $mapping['field'] . " = ?";
            $updateValues[] = $data[$requestField];
            $types .= $mapping['type'];
        }
    }
    
    if (empty($updateFields)) {
        sendJsonResponse(['status' => 'success', 'message' => 'No changes to apply']);
        exit;
    }
    
    // Add updated_at timestamp
    $updateFields[] = "updated_at = NOW()";
    
    // Add bookingId to values and types
    $updateValues[] = $bookingId;
    $types .= "i";
    
    // Construct and execute update query
    $sql = "UPDATE bookings SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$updateValues);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update booking: " . $stmt->error);
    }
    
    // Fetch updated booking
    $getStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $getStmt->bind_param("i", $bookingId);
    $getStmt->execute();
    $result = $getStmt->get_result();
    $updatedBooking = $result->fetch_assoc();
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Booking updated successfully',
        'data' => [
            'id' => (int)$updatedBooking['id'],
            'bookingNumber' => $updatedBooking['booking_number'],
            'passengerName' => $updatedBooking['passenger_name'],
            'passengerPhone' => $updatedBooking['passenger_phone'],
            'passengerEmail' => $updatedBooking['passenger_email'],
            'pickupLocation' => $updatedBooking['pickup_location'],
            'dropLocation' => $updatedBooking['drop_location'],
            'pickupDate' => $updatedBooking['pickup_date'],
            'returnDate' => $updatedBooking['return_date'],
            'status' => $updatedBooking['status'],
            'totalAmount' => (float)$updatedBooking['total_amount'],
            'adminNotes' => $updatedBooking['admin_notes'],
            'updatedAt' => $updatedBooking['updated_at']
        ]
    ]);

} catch (Exception $e) {
    logError("Update booking error", ['error' => $e->getMessage()]);
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to update booking: ' . $e->getMessage()
    ], 500);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
