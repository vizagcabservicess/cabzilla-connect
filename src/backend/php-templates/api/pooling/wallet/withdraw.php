<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$input = json_decode(file_get_contents('php://input'), true);
$userId = $input['user_id'] ?? null;
$amount = isset($input['amount']) ? floatval($input['amount']) : null;

if (!$userId || !$amount || $amount <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid input']);
    http_response_code(400);
    exit;
}

try {
    // Check balance
    $stmt = $pdo->prepare('SELECT balance FROM pooling_wallets WHERE user_id = ?');
    $stmt->execute([$userId]);
    $wallet = $stmt->fetch();
    if (!$wallet || $wallet['balance'] < $amount) {
        echo json_encode(['status' => 'error', 'message' => 'Insufficient balance']);
        http_response_code(400);
        exit;
    }

    // Deduct balance
    $stmt = $pdo->prepare('UPDATE pooling_wallets SET balance = balance - ? WHERE user_id = ?');
    $stmt->execute([$amount, $userId]);

    // Record transaction
    $stmt = $pdo->prepare('INSERT INTO pooling_wallet_transactions (user_id, type, amount, description, status) VALUES (?, "debit", ?, "Withdrawal", "completed")');
    $stmt->execute([$userId, $amount]);

    // Get new balance
    $stmt = $pdo->prepare('SELECT balance FROM pooling_wallets WHERE user_id = ?');
    $stmt->execute([$userId]);
    $newBalance = $stmt->fetchColumn();

    echo json_encode(['status' => 'success', 'balance' => $newBalance]);
} catch (PDOException $e) {
    error_log('Withdraw error: ' . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Withdraw failed']);
    http_response_code(500);
} 