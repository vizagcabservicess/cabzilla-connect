
<?php
// Include configuration file
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

// Get request data
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($data['bookingId']) || !isset($data['driverName']) || !isset($data['driverPhone'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
    http_response_code(400);
    exit;
}

// Extract data
$bookingId = intval($data['bookingId']);
$driverName = $data['driverName'];
$driverPhone = $data['driverPhone'];
$vehicleNumber = isset($data['vehicleNumber']) ? $data['vehicleNumber'] : '';

// Log request
error_log("Assigning driver to booking #$bookingId: $driverName, $driverPhone, $vehicleNumber");

try {
    // Connect to the database
    $conn = getDbConnectionWithRetry();
    
    // Start transaction
    $conn->begin_transaction();
    
    // First check if booking exists
    $bookingStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $bookingStmt->bind_param("i", $bookingId);
    $bookingStmt->execute();
    $bookingResult = $bookingStmt->get_result();
    
    if ($bookingResult->num_rows === 0) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => 'Booking not found']);
        http_response_code(404);
        exit;
    }
    
    $booking = $bookingResult->fetch_assoc();
    
    // Update the booking with driver details
    $updateStmt = $conn->prepare("
        UPDATE bookings 
        SET 
            driver_name = ?, 
            driver_phone = ?, 
            vehicle_number = ?, 
            status = 'assigned',
            updated_at = NOW()
        WHERE id = ?
    ");
    
    $updateStmt->bind_param("sssi", $driverName, $driverPhone, $vehicleNumber, $bookingId);
    $updateSuccess = $updateStmt->execute();
    
    if (!$updateSuccess) {
        $conn->rollback();
        throw new Exception("Failed to update booking: " . $updateStmt->error);
    }
    
    // Check if this driver already exists in the drivers table
    $driverExistsStmt = $conn->prepare("SELECT id FROM drivers WHERE phone = ?");
    $driverExistsStmt->bind_param("s", $driverPhone);
    $driverExistsStmt->execute();
    $driverResult = $driverExistsStmt->get_result();
    
    if ($driverResult->num_rows === 0) {
        // Driver doesn't exist, add to drivers table
        // First check if drivers table exists
        $tableCheck = $conn->query("SHOW TABLES LIKE 'drivers'");
        if ($tableCheck->num_rows === 0) {
            // Create drivers table if it doesn't exist
            $createTableSql = "
                CREATE TABLE IF NOT EXISTS drivers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    email VARCHAR(100),
                    license_no VARCHAR(50),
                    status ENUM('available', 'busy', 'offline') DEFAULT 'available',
                    total_rides INT DEFAULT 0,
                    earnings DECIMAL(10,2) DEFAULT 0.00,
                    rating DECIMAL(3,2) DEFAULT 0.00,
                    location VARCHAR(255),
                    vehicle VARCHAR(100),
                    vehicle_id VARCHAR(20) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (phone)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            $conn->query($createTableSql);
        }
        
        $addDriverStmt = $conn->prepare("
            INSERT INTO drivers (name, phone, vehicle_id, status, location)
            VALUES (?, ?, ?, 'busy', ?)
        ");
        
        $location = $booking['pickup_location'];
        $addDriverStmt->bind_param("sss", $driverName, $driverPhone, $vehicleNumber, $location);
        $addSuccess = $addDriverStmt->execute();
        
        if (!$addSuccess && $conn->errno != 1062) { // 1062 is duplicate key error, which we can ignore
            $conn->rollback();
            throw new Exception("Failed to add driver to database: " . $addDriverStmt->error);
        }
    } else {
        // Update existing driver to busy status
        $driverId = $driverResult->fetch_assoc()['id'];
        $updateDriverStmt = $conn->prepare("
            UPDATE drivers
            SET status = 'busy', 
                vehicle_id = COALESCE(?, vehicle_id),
                total_rides = total_rides + 1,
                updated_at = NOW()
            WHERE id = ?
        ");
        $updateDriverStmt->bind_param("si", $vehicleNumber, $driverId);
        $updateDriverStmt->execute();
    }
    
    // Commit transaction
    $conn->commit();
    
    // Format response
    $response = [
        'status' => 'success',
        'message' => 'Driver assigned successfully',
        'data' => [
            'bookingId' => $bookingId,
            'driverName' => $driverName,
            'driverPhone' => $driverPhone,
            'vehicleNumber' => $vehicleNumber,
            'status' => 'assigned'
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    error_log("Error assigning driver: " . $e->getMessage());
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to assign driver: ' . $e->getMessage()
    ]);
    
    http_response_code(500);
}

// Close connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
