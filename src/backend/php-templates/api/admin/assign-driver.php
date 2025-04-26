
<?php
// Include configuration and db helper
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    http_response_code(405);
    exit;
}

try {
    // Get request data
    $data = json_decode(file_get_contents('php://input'), true);
    error_log("Received driver assignment data: " . print_r($data, true));

    // Validate required fields
    if (!isset($data['bookingId']) || !isset($data['driverName']) || !isset($data['driverPhone'])) {
        throw new Exception('Missing required fields');
    }

    // Connect to database
    $conn = getDbConnectionWithRetry();
    $conn->begin_transaction();

    // Update booking with driver details
    $updateBookingStmt = $conn->prepare("
        UPDATE bookings 
        SET driver_name = ?,
            driver_phone = ?,
            vehicle_number = ?,
            status = 'assigned',
            updated_at = NOW()
        WHERE id = ?
    ");

    if (!$updateBookingStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $vehicleNumber = isset($data['vehicleNumber']) ? $data['vehicleNumber'] : '';
    $updateBookingStmt->bind_param("sssi", 
        $data['driverName'],
        $data['driverPhone'],
        $vehicleNumber,
        $data['bookingId']
    );

    if (!$updateBookingStmt->execute()) {
        throw new Exception("Failed to update booking: " . $updateBookingStmt->error);
    }

    // Update or insert driver
    $checkDriverStmt = $conn->prepare("SELECT id FROM drivers WHERE phone = ?");
    $checkDriverStmt->bind_param("s", $data['driverPhone']);
    $checkDriverStmt->execute();
    $driverResult = $checkDriverStmt->get_result();

    if ($driverResult->num_rows > 0) {
        // Update existing driver
        $driverId = $driverResult->fetch_assoc()['id'];
        $updateDriverStmt = $conn->prepare("
            UPDATE drivers 
            SET status = 'busy',
                vehicle_id = ?,
                total_rides = total_rides + 1,
                updated_at = NOW()
            WHERE id = ?
        ");
        $updateDriverStmt->bind_param("si", $vehicleNumber, $driverId);
        $updateDriverStmt->execute();
    } else {
        // Insert new driver
        $insertDriverStmt = $conn->prepare("
            INSERT INTO drivers (name, phone, vehicle_id, status)
            VALUES (?, ?, ?, 'busy')
        ");
        $insertDriverStmt->bind_param("sss", 
            $data['driverName'],
            $data['driverPhone'],
            $vehicleNumber
        );
        $insertDriverStmt->execute();
    }

    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Driver assigned successfully',
        'data' => [
            'bookingId' => $data['bookingId'],
            'driverName' => $data['driverName'],
            'driverPhone' => $data['driverPhone'],
            'vehicleNumber' => $vehicleNumber,
            'status' => 'assigned'
        ]
    ]);

} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    
    error_log("Driver assignment error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to assign driver: ' . $e->getMessage()
    ]);
}

// Close connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
