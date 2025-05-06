<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once __DIR__ . '/../../config.php';
header('Content-Type: application/json');
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'DB connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $result = $conn->query("SELECT * FROM fuel_records ORDER BY fill_date DESC");
    $records = [];
    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }
    echo json_encode(['status' => 'success', 'records' => $records]);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $conn->prepare("INSERT INTO fuel_records (vehicle_id, fill_date, quantity_liters, price_per_liter, total_cost, odometer_reading, station, payment_method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
    $stmt->bind_param(
        "ssiddiss",
        $data['vehicle_id'],
        $data['fill_date'],
        $data['quantity_liters'],
        $data['price_per_liter'],
        $data['total_cost'],
        $data['odometer_reading'],
        $data['station'],
        $data['payment_method']
    );
    if (!$stmt->execute()) {
        echo json_encode(['status' => 'error', 'message' => $stmt->error]);
        exit;
    }
    echo json_encode(['status' => 'success']);
    exit;
}

if ($method === 'PUT') {
    parse_str($_SERVER['QUERY_STRING'], $params);
    $id = $params['id'];
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $conn->prepare("UPDATE fuel_records SET vehicle_id=?, fill_date=?, quantity_liters=?, price_per_liter=?, total_cost=?, odometer_reading=?, station=?, payment_method=?, updated_at=NOW() WHERE id=?");
    $stmt->bind_param(
        "ssiddissi",
        $data['vehicle_id'],
        $data['fill_date'],
        $data['quantity_liters'],
        $data['price_per_liter'],
        $data['total_cost'],
        $data['odometer_reading'],
        $data['station'],
        $data['payment_method'],
        $id
    );
    if (!$stmt->execute()) {
        echo json_encode(['status' => 'error', 'message' => $stmt->error]);
        exit;
    }
    echo json_encode(['status' => 'success']);
    exit;
}

if ($method === 'DELETE') {
    parse_str($_SERVER['QUERY_STRING'], $params);
    $id = $params['id'];
    $stmt = $conn->prepare("DELETE FROM fuel_records WHERE id=?");
    $stmt->bind_param("i", $id);
    if (!$stmt->execute()) {
        echo json_encode(['status' => 'error', 'message' => $stmt->error]);
        exit;
    }
    echo json_encode(['status' => 'success']);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid request']); 