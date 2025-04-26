
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    http_response_code(405);
    exit;
}

try {
    // Connect to the database
    $conn = getDbConnectionWithRetry();
    
    // Check if drivers table exists, create it if it doesn't
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
        
        // Add some sample drivers if the table was just created
        $sampleDrivers = [
            ['Rajesh Kumar', '9876543210', 'rajesh@example.com', 'DL123456', 'available', 'Visakhapatnam', 'Sedan', 'AP31AB1234'],
            ['Suresh Singh', '9876543211', 'suresh@example.com', 'DL234567', 'available', 'Visakhapatnam', 'SUV', 'AP31CD5678'],
            ['Mahesh Reddy', '9876543212', 'mahesh@example.com', 'DL345678', 'available', 'Visakhapatnam', 'Hatchback', 'AP31EF9012']
        ];
        
        $insertStmt = $conn->prepare("
            INSERT INTO drivers (name, phone, email, license_no, status, location, vehicle, vehicle_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($sampleDrivers as $driver) {
            $insertStmt->bind_param("ssssssss", $driver[0], $driver[1], $driver[2], $driver[3], $driver[4], $driver[5], $driver[6], $driver[7]);
            $insertStmt->execute();
        }
    }
    
    // Get filter parameters
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $search = isset($_GET['search']) ? $_GET['search'] : null;
    
    // Build query
    $query = "SELECT * FROM drivers";
    $whereConditions = [];
    $params = [];
    $types = "";
    
    if ($status) {
        $whereConditions[] = "status = ?";
        $params[] = $status;
        $types .= "s";
    }
    
    if ($search) {
        $searchTerm = "%$search%";
        $whereConditions[] = "(name LIKE ? OR phone LIKE ? OR vehicle_id LIKE ?)";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= "sss";
    }
    
    if (count($whereConditions) > 0) {
        $query .= " WHERE " . implode(" AND ", $whereConditions);
    }
    
    $query .= " ORDER BY status = 'available' DESC, name ASC";
    
    // Prepare and execute the query
    $stmt = $conn->prepare($query);
    
    if (count($params) > 0) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $drivers = [];
    while ($row = $result->fetch_assoc()) {
        $drivers[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'phone' => $row['phone'],
            'email' => $row['email'],
            'license_no' => $row['license_no'],
            'status' => $row['status'],
            'total_rides' => (int)$row['total_rides'],
            'earnings' => (float)$row['earnings'],
            'rating' => (float)$row['rating'],
            'location' => $row['location'],
            'vehicle' => $row['vehicle'],
            'vehicle_id' => $row['vehicle_id'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Drivers retrieved successfully',
        'data' => $drivers
    ]);
    
} catch (Exception $e) {
    error_log("Error fetching drivers: " . $e->getMessage());
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to retrieve drivers: ' . $e->getMessage()
    ]);
    
    http_response_code(500);
}

// Close connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
