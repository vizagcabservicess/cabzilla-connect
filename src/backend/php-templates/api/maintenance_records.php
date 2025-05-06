
<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/utils/response.php';
header('Content-Type: application/json');
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    sendErrorResponse('DB connection failed: ' . $conn->connect_error);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $query = "SELECT m.*, v.vehicleNumber, v.make, v.model 
              FROM maintenance_records m 
              LEFT JOIN fleet_vehicles v ON m.vehicleId = v.id 
              ORDER BY m.date DESC";
    $result = $conn->query($query);
    
    if (!$result) {
        sendErrorResponse('Database query failed: ' . $conn->error);
        exit;
    }
    
    $records = [];
    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }
    
    sendSuccessResponse(['records' => $records]);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $requiredFields = ['vehicleId', 'date', 'serviceType', 'description', 'cost', 'vendor'];
    $validation = validateRequiredFields($data, $requiredFields);
    if (!$validation['valid']) {
        sendErrorResponse('Missing required fields: ' . implode(', ', $validation['missing']));
        exit;
    }
    
    $stmt = $conn->prepare("INSERT INTO maintenance_records 
        (vehicleId, date, serviceType, description, cost, vendor, nextServiceDate, notes, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
    
    $stmt->bind_param(
        "ssssdss",
        $data['vehicleId'],
        $data['date'],
        $data['serviceType'],
        $data['description'],
        $data['cost'],
        $data['vendor'],
        $data['nextServiceDate'],
        $data['notes'] ?? ''
    );
    
    if (!$stmt->execute()) {
        sendErrorResponse('Failed to add maintenance record: ' . $stmt->error);
        exit;
    }
    
    sendSuccessResponse(['id' => $conn->insert_id]);
    exit;
}

if ($method === 'PUT') {
    parse_str($_SERVER['QUERY_STRING'], $params);
    $id = $params['id'] ?? null;
    
    if (!$id) {
        sendErrorResponse('Record ID is required');
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $requiredFields = ['vehicleId', 'date', 'serviceType', 'description', 'cost', 'vendor'];
    $validation = validateRequiredFields($data, $requiredFields);
    if (!$validation['valid']) {
        sendErrorResponse('Missing required fields: ' . implode(', ', $validation['missing']));
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE maintenance_records SET 
        vehicleId = ?, date = ?, serviceType = ?, description = ?, 
        cost = ?, vendor = ?, nextServiceDate = ?, notes = ?, updated_at = NOW() 
        WHERE id = ?");
    
    $stmt->bind_param(
        "ssssdsssi",
        $data['vehicleId'],
        $data['date'],
        $data['serviceType'],
        $data['description'],
        $data['cost'],
        $data['vendor'],
        $data['nextServiceDate'],
        $data['notes'] ?? '',
        $id
    );
    
    if (!$stmt->execute()) {
        sendErrorResponse('Failed to update maintenance record: ' . $stmt->error);
        exit;
    }
    
    sendSuccessResponse(['id' => $id]);
    exit;
}

if ($method === 'DELETE') {
    parse_str($_SERVER['QUERY_STRING'], $params);
    $id = $params['id'] ?? null;
    
    if (!$id) {
        sendErrorResponse('Record ID is required');
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM maintenance_records WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if (!$stmt->execute()) {
        sendErrorResponse('Failed to delete maintenance record: ' . $stmt->error);
        exit;
    }
    
    sendSuccessResponse(['id' => $id]);
    exit;
}

sendErrorResponse('Invalid request method');
