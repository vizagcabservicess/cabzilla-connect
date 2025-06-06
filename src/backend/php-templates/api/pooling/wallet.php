<?php
file_put_contents(__DIR__ . '/debug.log', "TOP OF wallet.php\n", FILE_APPEND);
ob_clean(); // Clear any previous output buffer
file_put_contents(__DIR__ . '/debug.log', "wallet.php after ob_clean\n", FILE_APPEND);
// require_once '../common/db_helper.php'; // Removed to avoid MySQLi/PDO conflict
file_put_contents(__DIR__ . '/debug.log', "wallet.php after db_helper require (REMOVED)\n", FILE_APPEND);
require_once __DIR__ . '/config.php';
file_put_contents(__DIR__ . '/debug.log', "wallet.php after config require\n", FILE_APPEND);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
file_put_contents(__DIR__ . '/debug.log', "wallet.php after headers\n", FILE_APPEND);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Authenticate user using pooling API token
$user = getAuthUser();
if (!$user) {
    sendError('Authentication required', 401);
    exit();
}

$userId = $user['id'];
file_put_contents(__DIR__ . '/debug.log', "wallet.php userId: $userId\n", FILE_APPEND);

try {
    $stmt = $pdo->prepare("SELECT * FROM pooling_wallets WHERE user_id = ?");
    $stmt->execute([$userId]);
    $wallet = $stmt->fetch();
    file_put_contents(__DIR__ . '/debug.log', "wallet.php wallet row: " . json_encode($wallet) . "\n", FILE_APPEND);
    if (!$wallet) {
        // Create wallet if doesn't exist
        $stmt = $pdo->prepare("INSERT INTO pooling_wallets (user_id, balance) VALUES (?, 0.00)");
        $stmt->execute([$userId]);
        $wallet = [
            'id' => $pdo->lastInsertId(),
            'user_id' => $userId,
            'balance' => 0.00
        ];
    }
    $response = ['balance' => $wallet['balance']];
    file_put_contents(__DIR__ . '/debug.log', "About to output: " . json_encode($response) . "\n", FILE_APPEND);
    echo json_encode($response);
    exit();
} catch (Exception $e) {
    sendError('Failed to get wallet: ' . $e->getMessage(), 500);
    exit();
}

// Removed unused functions: getUserWallet, checkMinimumBalance, depositToWallet, withdrawFromWallet
