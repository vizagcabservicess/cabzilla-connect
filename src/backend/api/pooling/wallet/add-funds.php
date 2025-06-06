<?php
file_put_contents(__DIR__ . '/debug.log', 'SCRIPT CALLED' . PHP_EOL, FILE_APPEND);
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$logfile = __DIR__ . '/debug.log';

// Catch all errors and log them
set_exception_handler(function($e) use ($logfile) {
    file_put_contents($logfile, 'UNCAUGHT EXCEPTION: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    http_response_code(500);
    echo json_encode(['error' => 'Server error (exception)']);
    exit;
});
set_error_handler(function($errno, $errstr, $errfile, $errline) use ($logfile) {
    file_put_contents($logfile, "ERROR: $errstr in $errfile on line $errline" . PHP_EOL, FILE_APPEND);
    http_response_code(500);
    echo json_encode(['error' => 'Server error (php error)']);
    exit;
});

$data = json_decode(file_get_contents('php://input'), true);
file_put_contents($logfile, 'INPUT: ' . json_encode($data) . PHP_EOL, FILE_APPEND);

$userId = $data['user_id'] ?? null;
$amount = $data['amount'] ?? null;

if (!$userId || !$amount || !is_numeric($amount)) {
    file_put_contents($logfile, 'ERROR: Invalid input' . PHP_EOL, FILE_APPEND);
    echo json_encode(['error' => 'Invalid input']);
    http_response_code(400);
    exit;
}

// If your frontend sends paise, convert to rupees:
$amount = floatval($amount); // or floatval($amount) / 100 if paise

require_once __DIR__ . '/../config.php'; // Use PDO and config.php

global $pdo;
if (!$pdo) {
    file_put_contents($logfile, 'ERROR: DB connection failed' . PHP_EOL, FILE_APPEND);
    echo json_encode(['error' => 'DB connection failed']);
    http_response_code(500);
    exit;
}

try {
    // Ensure wallet row exists
    $stmt = $pdo->prepare("INSERT IGNORE INTO pooling_wallets (user_id, balance) VALUES (?, 0)");
    $stmt->execute([$userId]);

    // Now update the balance
    $stmt = $pdo->prepare("UPDATE pooling_wallets SET balance = balance + ? WHERE user_id = ?");
    $stmt->execute([$amount, $userId]);

    // Fetch the new balance
    $stmt = $pdo->prepare("SELECT balance FROM pooling_wallets WHERE user_id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    $newBalance = $row ? $row['balance'] : null;
    file_put_contents($logfile, 'SUCCESS: Balance updated for user_id ' . $userId . ', amount ' . $amount . ', new_balance: ' . $newBalance . PHP_EOL, FILE_APPEND);
    echo json_encode(['success' => true, 'balance' => $newBalance]);
} catch (PDOException $e) {
    file_put_contents($logfile, 'DB ERROR: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    echo json_encode(['error' => 'DB error: ' . $e->getMessage()]);
    http_response_code(500);
    exit;
} 