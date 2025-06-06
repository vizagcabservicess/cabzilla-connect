<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$data = json_decode(file_get_contents('php://input'), true);

$userId = $data['user_id'] ?? null;
$amount = $data['amount'] ?? null;

if (!$userId || !$amount || !is_numeric($amount)) {
    echo json_encode(['error' => 'Invalid input']);
    http_response_code(400);
    exit;
}

require_once __DIR__ . '/../../../utils/database.php';
$conn = getDbConnection();

$stmt = $conn->prepare("UPDATE pooling_wallets SET balance = balance + ? WHERE user_id = ?");
$stmt->bind_param("di", $amount, $userId);
$stmt->execute();

if ($stmt->error) {
    echo json_encode(['error' => $stmt->error]);
    http_response_code(500);
} else {
    echo json_encode(['success' => true]);
}

$stmt->close();
$conn->close(); 