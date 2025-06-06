<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json');

if (!isset($_GET['id'])) {
    echo json_encode(['error' => 'Missing user id']);
    http_response_code(400);
    exit;
}

$userId = intval($_GET['id']);

$stmt = $pdo->prepare("SELECT id, name, email, phone, role FROM pooling_users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    echo json_encode($user);
} else {
    echo json_encode(['error' => 'User not found']);
    http_response_code(404);
} 