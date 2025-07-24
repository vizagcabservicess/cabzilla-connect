<?php
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

try {
    // Get database connection
    $conn = getDbConnectionWithRetry();
    
    // Start transaction
    $conn->begin_transaction();

    // Create backup of drivers table
    $conn->query("CREATE TABLE IF NOT EXISTS drivers_backup_" . date('Y_m_d_H_i_s') . " LIKE drivers");
    $conn->query("INSERT INTO drivers_backup_" . date('Y_m_d_H_i_s') . " SELECT * FROM drivers");

    // Drop the existing drivers table
    $conn->query("DROP TABLE IF EXISTS drivers");

    // Create new drivers table with correct schema
    $createTableSql = "CREATE TABLE drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        license_no VARCHAR(50),
        status ENUM('available', 'busy', 'offline') DEFAULT 'available',
        total_rides INT DEFAULT 0,
        earnings DECIMAL(10,2) DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 5.0,
        location VARCHAR(255) DEFAULT 'Visakhapatnam',
        vehicle VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $conn->query($createTableSql);

    // Insert sample data
    $sampleData = [
        [
            'name' => 'Rajesh Kumar',
            'phone' => '9966363662',
            'email' => 'rajesh@example.com',
            'license_no' => 'DL-1234567890',
            'status' => 'available',
            'total_rides' => 352,
            'earnings' => 120000,
            'rating' => 4.8,
            'location' => 'Hyderabad Central',
            'vehicle' => 'Sedan - AP 31 XX 1234'
        ],
        [
            'name' => 'Pavan Reddy',
            'phone' => '8765432109',
            'email' => 'pavan@example.com',
            'license_no' => 'DL-0987654321',
            'status' => 'busy',
            'total_rides' => 215,
            'earnings' => 85500,
            'rating' => 4.6,
            'location' => 'Gachibowli',
            'vehicle' => 'SUV - AP 32 XX 5678'
        ],
        [
            'name' => 'Suresh Verma',
            'phone' => '7654321098',
            'email' => 'suresh@example.com',
            'license_no' => 'DL-5678901234',
            'status' => 'offline',
            'total_rides' => 180,
            'earnings' => 72000,
            'rating' => 4.5,
            'location' => 'Offline',
            'vehicle' => 'Sedan - AP 33 XX 9012'
        ]
    ];

    $insertStmt = $conn->prepare("INSERT INTO drivers (name, phone, email, license_no, status, total_rides, earnings, rating, location, vehicle) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    foreach ($sampleData as $driver) {
        $insertStmt->bind_param(
            "sssssiidss",
            $driver['name'],
            $driver['phone'],
            $driver['email'],
            $driver['license_no'],
            $driver['status'],
            $driver['total_rides'],
            $driver['earnings'],
            $driver['rating'],
            $driver['location'],
            $driver['vehicle']
        );
        $insertStmt->execute();
    }

    // Commit transaction
    $conn->commit();

    sendResponse([
        'status' => 'success',
        'message' => 'Drivers table schema fixed successfully'
    ]);

} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($conn)) {
        $conn->rollback();
    }

    sendResponse([
        'status' => 'error',
        'message' => 'Failed to fix drivers table schema: ' . $e->getMessage()
    ], 500);
} 