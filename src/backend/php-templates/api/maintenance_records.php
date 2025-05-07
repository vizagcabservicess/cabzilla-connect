<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Use DOCUMENT_ROOT to find config.php in public_html
$configPath = $_SERVER['DOCUMENT_ROOT'] . '/config.php';
if (file_exists($configPath)) {
    require_once $configPath;
} else {
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'config.php not found at expected location.',
        'expected_path' => $configPath,
        'current_dir' => __DIR__
    ]);
    exit;
}

header('Content-Type: application/json');
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'DB connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $query = "SELECT m.*, v.vehicle_number, v.make, v.model 
              FROM maintenance_records m 
              LEFT JOIN fleet_vehicles v ON m.vehicle_id = v.id 
              ORDER BY m.service_date DESC";
    $result = $conn->query($query);
    $records = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $records[] = $row;
        }
        echo json_encode(['status' => 'success', 'records' => $records]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Database query failed: ' . $conn->error]);
    }
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $notes = isset($data['notes']) ? $data['notes'] : '';
    $stmt = $conn->prepare("INSERT INTO maintenance_records 
        (vehicle_id, service_date, service_type, description, cost, vendor, next_service_date, odometer, next_service_odometer, notes, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
    $stmt->bind_param(
        "isssdssddss",
        $data['vehicle_id'],
        $data['service_date'],
        $data['service_type'],
        $data['description'],
        $data['cost'],
        $data['vendor'],
        $data['next_service_date'],
        $data['odometer'],
        $data['next_service_odometer'],
        $notes
    );
    if (!$stmt->execute()) {
        echo json_encode(['status' => 'error', 'message' => $stmt->error]);
        exit;
    }
    echo json_encode(['status' => 'success', 'id' => $conn->insert_id]);
    exit;
}

if ($method === 'PUT') {
    parse_str($_SERVER['QUERY_STRING'], $params);
    $id = $params['id'] ?? null;
    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'Record ID is required']);
        exit;
    }
    $data = json_decode(file_get_contents('php://input'), true);
    $notes = isset($data['notes']) ? $data['notes'] : '';
    $stmt = $conn->prepare("UPDATE maintenance_records SET 
        vehicle_id = ?, service_date = ?, service_type = ?, description = ?, 
        cost = ?, vendor = ?, next_service_date = ?, odometer = ?, next_service_odometer = ?, notes = ?, updated_at = NOW() 
        WHERE id = ?");
    $stmt->bind_param(
        "isssdssddsi",
        $data['vehicle_id'],
        $data['service_date'],
        $data['service_type'],
        $data['description'],
        $data['cost'],
        $data['vendor'],
        $data['next_service_date'],
        $data['odometer'],
        $data['next_service_odometer'],
        $notes,
        $id
    );
    if (!$stmt->execute()) {
        echo json_encode(['status' => 'error', 'message' => $stmt->error]);
        exit;
    }
    echo json_encode(['status' => 'success', 'id' => $id]);
    exit;
}

if ($method === 'DELETE') {
    parse_str($_SERVER['QUERY_STRING'], $params);
    $id = $params['id'] ?? null;
    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'Record ID is required']);
        exit;
    }
    $stmt = $conn->prepare("DELETE FROM maintenance_records WHERE id = ?");
    $stmt->bind_param("i", $id);
    if (!$stmt->execute()) {
        echo json_encode(['status' => 'error', 'message' => $stmt->error]);
        exit;
    }
    echo json_encode(['status' => 'success', 'id' => $id]);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
