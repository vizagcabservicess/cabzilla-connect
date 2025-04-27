
<?php
// Fix bookings API endpoint
require_once __DIR__ . '/../../config.php';

// Set headers to ensure proper JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Connect to database
    $conn = getDbConnection();
    
    // First check if bookings table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'bookings'");
    if ($tableCheck->num_rows === 0) {
        // Create bookings table if it doesn't exist
        $createTableSql = "
            CREATE TABLE bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                booking_number VARCHAR(50) NOT NULL UNIQUE,
                pickup_location TEXT NOT NULL,
                drop_location TEXT,
                pickup_date DATETIME NOT NULL,
                return_date DATETIME,
                cab_type VARCHAR(50) NOT NULL,
                distance DECIMAL(10,2),
                trip_type VARCHAR(20) NOT NULL,
                trip_mode VARCHAR(20) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                passenger_name VARCHAR(100) NOT NULL,
                passenger_phone VARCHAR(20) NOT NULL,
                passenger_email VARCHAR(100) NOT NULL,
                driver_id INT,
                driver_name VARCHAR(100),
                driver_phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $conn->query($createTableSql);
        
        // Add sample bookings
        $sampleBookings = [
            [
                'user_id' => 1,
                'booking_number' => 'BK'.rand(10000, 99999),
                'pickup_location' => 'Visakhapatnam Airport',
                'drop_location' => 'Beach Road, Visakhapatnam',
                'pickup_date' => date('Y-m-d H:i:s', strtotime('+1 day')),
                'cab_type' => 'Sedan',
                'distance' => 12.5,
                'trip_type' => 'airport',
                'trip_mode' => 'one-way',
                'total_amount' => 1450.00,
                'status' => 'confirmed',
                'passenger_name' => 'Anil Kumar',
                'passenger_phone' => '9876543210',
                'passenger_email' => 'anil@example.com'
            ],
            [
                'user_id' => 1,
                'booking_number' => 'BK'.rand(10000, 99999),
                'pickup_location' => 'RK Beach, Visakhapatnam',
                'drop_location' => 'Araku Valley',
                'pickup_date' => date('Y-m-d H:i:s', strtotime('+2 days')),
                'return_date' => date('Y-m-d H:i:s', strtotime('+3 days')),
                'cab_type' => 'SUV',
                'distance' => 116.00,
                'trip_type' => 'outstation',
                'trip_mode' => 'round-trip',
                'total_amount' => 4850.00,
                'status' => 'pending',
                'passenger_name' => 'Priya Sharma',
                'passenger_phone' => '8765432109',
                'passenger_email' => 'priya@example.com'
            ]
        ];
        
        $insertStmt = $conn->prepare("
            INSERT INTO bookings 
            (user_id, booking_number, pickup_location, drop_location, pickup_date, return_date, 
            cab_type, distance, trip_type, trip_mode, total_amount, status, 
            passenger_name, passenger_phone, passenger_email) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($sampleBookings as $booking) {
            $insertStmt->bind_param(
                "isssssdsssdssss",
                $booking['user_id'],
                $booking['booking_number'],
                $booking['pickup_location'],
                $booking['drop_location'],
                $booking['pickup_date'],
                $booking['return_date'] ?? null,
                $booking['cab_type'],
                $booking['distance'],
                $booking['trip_type'],
                $booking['trip_mode'],
                $booking['total_amount'],
                $booking['status'],
                $booking['passenger_name'],
                $booking['passenger_phone'],
                $booking['passenger_email']
            );
            $insertStmt->execute();
        }
    }
    
    // Get all bookings for admin
    $sql = "SELECT * FROM bookings ORDER BY created_at DESC";
    $result = $conn->query($sql);
    
    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        $bookings[] = [
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
            'driverName' => $row['driver_name'] ?? null,
            'driverPhone' => $row['driver_phone'] ?? null,
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? $row['created_at']
        ];
    }
    
    // Return success response with bookings data
    echo json_encode([
        'status' => 'success',
        'bookings' => $bookings
    ]);

} catch (Exception $e) {
    // Log error
    error_log("Fix Bookings API Error: " . $e->getMessage());
    
    // Return error response
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to get bookings: ' . $e->getMessage()
    ]);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
