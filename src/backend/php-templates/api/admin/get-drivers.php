
<?php
require_once __DIR__ . '/../../config.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJsonResponse(['status' => 'success'], 200);
    exit;
}

try {
    // Only allow GET request
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
        exit;
    }

    // Connect to database with retry mechanism
    $conn = getDbConnection();
    
    // Get filter parameters
    $statusFilter = isset($_GET['status']) && $_GET['status'] !== 'all' ? $_GET['status'] : '';
    $searchQuery = isset($_GET['search']) ? $_GET['search'] : '';
    
    // Log the request parameters for debugging
    logError("Get Drivers Request", [
        'status' => $statusFilter,
        'search' => $searchQuery,
        'method' => $_SERVER['REQUEST_METHOD']
    ]);
    
    // Build query based on filters
    $sql = "SELECT * FROM drivers";
    $whereClauses = [];
    $params = [];
    $types = "";
    
    if ($statusFilter) {
        $whereClauses[] = "status = ?";
        $params[] = $statusFilter;
        $types .= "s";
    }
    
    if ($searchQuery) {
        $whereClauses[] = "(name LIKE ? OR phone LIKE ? OR vehicle_number LIKE ?)";
        $searchPattern = "%$searchQuery%";
        $params = array_merge($params, [$searchPattern, $searchPattern, $searchPattern]);
        $types .= "sss";
    }
    
    if (!empty($whereClauses)) {
        $sql .= " WHERE " . implode(" AND ", $whereClauses);
    }
    
    $sql .= " ORDER BY name ASC";
    
    // Log SQL query
    logError("Get Drivers SQL", ['sql' => $sql, 'params' => json_encode($params)]);
    
    // Check if drivers table exists
    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'drivers'");
    if ($tableCheckResult->num_rows === 0) {
        // Create sample data if table doesn't exist
        logError("Creating drivers table", ['action' => 'create_table']);
        
        $createTableSql = "CREATE TABLE drivers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(100) NOT NULL,
            license_number VARCHAR(50),
            vehicle_number VARCHAR(50),
            status ENUM('available', 'busy', 'offline') DEFAULT 'available',
            total_rides INT DEFAULT 0,
            earnings DECIMAL(10,2) DEFAULT 0,
            rating DECIMAL(3,2) DEFAULT 5.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $conn->query($createTableSql);
        
        // Add sample data
        $conn->query("INSERT INTO drivers (name, phone, email, license_number, vehicle_number, status, total_rides, earnings, rating) 
                      VALUES 
                      ('Rajesh Kumar', '9876543210', 'rajesh@example.com', 'DL-1234567890', 'AP 31 XX 1234', 'available', 352, 120000, 4.8),
                      ('Pavan Reddy', '8765432109', 'pavan@example.com', 'DL-0987654321', 'AP 32 XX 5678', 'busy', 215, 85500, 4.6),
                      ('Suresh Verma', '7654321098', 'suresh@example.com', 'DL-5678901234', 'AP 33 XX 9012', 'offline', 180, 72000, 4.5)");
        
        logError("Inserted sample driver data", ['count' => 3]);
    }
    
    // Prepare and execute query
    try {
        $stmt = $conn->prepare($sql);
        if (!empty($params)) {
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
                'email' => $row['email'] ?? '',
                'license_no' => $row['license_number'] ?? $row['license_no'] ?? '',
                'vehicle' => $row['vehicle_number'] ?? $row['vehicle'] ?? '',
                'status' => $row['status'],
                'total_rides' => isset($row['total_rides']) ? (int)$row['total_rides'] : 0,
                'earnings' => isset($row['earnings']) ? (float)$row['earnings'] : 0.00,
                'rating' => isset($row['rating']) ? (float)$row['rating'] : 5.00
            ];
        }
        
        // Return success response
        sendJsonResponse([
            'status' => 'success',
            'drivers' => $drivers
        ]);
    } catch (Exception $e) {
        throw new Exception("Query execution error: " . $e->getMessage());
    }

} catch (Exception $e) {
    logError("Driver API Error", ['error' => $e->getMessage()]);
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to retrieve drivers: ' . $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
