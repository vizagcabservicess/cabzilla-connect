
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
    
    // Prepare and execute query
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
            'email' => $row['email'],
            'license_no' => $row['license_number'],
            'vehicle' => $row['vehicle_number'],
            'status' => $row['status'],
            'total_rides' => (int)$row['total_rides'],
            'earnings' => (float)$row['earnings'],
            'rating' => (float)$row['rating']
        ];
    }
    
    // Return success response
    sendJsonResponse([
        'status' => 'success',
        'drivers' => $drivers
    ]);

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
