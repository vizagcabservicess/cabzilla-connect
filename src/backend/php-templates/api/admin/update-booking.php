
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    error_log("Update booking data received: " . print_r($data, true));

    if (!isset($data['bookingId'])) {
        throw new Exception('Booking ID is required');
    }

    $conn = getDbConnectionWithRetry();
    $conn->begin_transaction();

    // Build update fields
    $updateFields = [];
    $params = [];
    $types = '';

    // Map fields that can be updated
    $fieldMap = [
        'passengerName' => ['field' => 'passenger_name', 'type' => 's'],
        'passengerPhone' => ['field' => 'passenger_phone', 'type' => 's'],
        'passengerEmail' => ['field' => 'passenger_email', 'type' => 's'],
        'pickupLocation' => ['field' => 'pickup_location', 'type' => 's'],
        'dropLocation' => ['field' => 'drop_location', 'type' => 's'],
        'pickupDate' => ['field' => 'pickup_date', 'type' => 's'],
        'status' => ['field' => 'status', 'type' => 's'],
        'billingAddress' => ['field' => 'billing_address', 'type' => 's']
    ];

    foreach ($fieldMap as $apiField => $dbInfo) {
        if (isset($data[$apiField])) {
            $updateFields[] = "{$dbInfo['field']} = ?";
            $params[] = $data[$apiField];
            $types .= $dbInfo['type'];
        }
    }

    // Always add updated_at
    $updateFields[] = "updated_at = NOW()";

    // Add bookingId for WHERE clause
    $params[] = $data['bookingId'];
    $types .= 'i';

    // Update booking
    $sql = "UPDATE bookings SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param($types, ...$params);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update booking: " . $stmt->error);
    }

    // Handle extra charges if provided
    if (isset($data['extraCharges']) && is_array($data['extraCharges'])) {
        // First, delete existing extra charges
        $deleteStmt = $conn->prepare("DELETE FROM booking_extras WHERE booking_id = ?");
        $deleteStmt->bind_param("i", $data['bookingId']);
        $deleteStmt->execute();

        // Insert new extra charges
        $insertStmt = $conn->prepare("
            INSERT INTO booking_extras (booking_id, description, amount)
            VALUES (?, ?, ?)
        ");

        foreach ($data['extraCharges'] as $charge) {
            $insertStmt->bind_param("isd", 
                $data['bookingId'],
                $charge['description'],
                $charge['amount']
            );
            $insertStmt->execute();
        }
    }

    $conn->commit();

    // Fetch updated booking
    $getStmt = $conn->prepare("
        SELECT b.*, 
               COALESCE(SUM(be.amount), 0) as total_extra_charges
        FROM bookings b
        LEFT JOIN booking_extras be ON b.id = be.booking_id
        WHERE b.id = ?
        GROUP BY b.id
    ");
    
    $getStmt->bind_param("i", $data['bookingId']);
    $getStmt->execute();
    $result = $getStmt->get_result();
    $booking = $result->fetch_assoc();

    // Get extra charges details
    $extraCharges = [];
    $extraStmt = $conn->prepare("SELECT * FROM booking_extras WHERE booking_id = ?");
    $extraStmt->bind_param("i", $data['bookingId']);
    $extraStmt->execute();
    $extraResult = $extraStmt->get_result();
    
    while ($row = $extraResult->fetch_assoc()) {
        $extraCharges[] = [
            'id' => $row['id'],
            'description' => $row['description'],
            'amount' => (float)$row['amount']
        ];
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Booking updated successfully',
        'data' => [
            'id' => (int)$booking['id'],
            'bookingNumber' => $booking['booking_number'],
            'status' => $booking['status'],
            'passengerName' => $booking['passenger_name'],
            'passengerPhone' => $booking['passenger_phone'],
            'passengerEmail' => $booking['passenger_email'],
            'pickupLocation' => $booking['pickup_location'],
            'dropLocation' => $booking['drop_location'],
            'pickupDate' => $booking['pickup_date'],
            'totalAmount' => (float)$booking['total_amount'],
            'extraCharges' => $extraCharges,
            'totalExtraCharges' => (float)$booking['total_extra_charges'],
            'billingAddress' => $booking['billing_address'],
        ]
    ]);

} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    
    error_log("Update booking error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to update booking: ' . $e->getMessage()
    ]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
