
<?php
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['bookingId']) || !isset($data['driverName']) || !isset($data['driverPhone'])) {
        throw new Exception('Missing required fields');
    }
    
    $conn = getDbConnectionWithRetry();
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Update booking with driver details
        $stmt = $conn->prepare("
            UPDATE bookings 
            SET driver_name = ?, 
                driver_phone = ?, 
                vehicle_number = ?,
                status = 'assigned',
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->bind_param(
            "sssi", 
            $data['driverName'],
            $data['driverPhone'],
            $data['vehicleNumber'],
            $data['bookingId']
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to update booking: " . $conn->error);
        }
        
        // Update driver status if exists in drivers table
        $driverStmt = $conn->prepare("
            UPDATE drivers 
            SET status = 'busy',
                total_rides = total_rides + 1
            WHERE phone = ?
        ");
        
        $driverStmt->bind_param("s", $data['driverPhone']);
        $driverStmt->execute();
        
        $conn->commit();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Driver assigned successfully',
            'data' => [
                'bookingId' => $data['bookingId'],
                'driverName' => $data['driverName'],
                'driverPhone' => $data['driverPhone'],
                'vehicleNumber' => $data['vehicleNumber']
            ]
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
