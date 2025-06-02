
<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? '';
        switch ($action) {
            case 'transactions':
                handleGetTransactions();
                break;
            default:
                handleGetWallet();
        }
        break;
    case 'POST':
        $action = $_GET['action'] ?? '';
        switch ($action) {
            case 'deposit':
                handleDeposit();
                break;
            case 'withdraw':
                handleWithdraw();
                break;
            default:
                sendError('Invalid action');
        }
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleGetWallet() {
    global $pdo;
    
    $userId = $_GET['user_id'] ?? null;
    if (!$userId) {
        sendError('User ID is required');
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM pooling_wallets WHERE user_id = ?");
        $stmt->execute([$userId]);
        $wallet = $stmt->fetch();
        
        if (!$wallet) {
            sendError('Wallet not found', 404);
        }
        
        sendResponse($wallet);
        
    } catch (PDOException $e) {
        error_log('Get wallet error: ' . $e->getMessage());
        sendError('Failed to get wallet', 500);
    }
}

function handleGetTransactions() {
    global $pdo;
    
    $userId = $_GET['user_id'] ?? null;
    if (!$userId) {
        sendError('User ID is required');
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT wt.* 
            FROM wallet_transactions wt
            JOIN pooling_wallets pw ON wt.wallet_id = pw.id
            WHERE pw.user_id = ?
            ORDER BY wt.created_at DESC
            LIMIT 50
        ");
        $stmt->execute([$userId]);
        $transactions = $stmt->fetchAll();
        
        sendResponse($transactions);
        
    } catch (PDOException $e) {
        error_log('Get transactions error: ' . $e->getMessage());
        sendError('Failed to get transactions', 500);
    }
}

function handleDeposit() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $input = sanitizeInput($input);
    
    $required_fields = ['user_id', 'amount'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    $amount = (float)$input['amount'];
    if ($amount <= 0) {
        sendError('Amount must be greater than 0');
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get wallet
        $stmt = $pdo->prepare("SELECT * FROM pooling_wallets WHERE user_id = ?");
        $stmt->execute([$input['user_id']]);
        $wallet = $stmt->fetch();
        
        if (!$wallet) {
            sendError('Wallet not found', 404);
        }
        
        // Update wallet balance
        $newBalance = $wallet['balance'] + $amount;
        $stmt = $pdo->prepare("
            UPDATE pooling_wallets 
            SET balance = ?, last_transaction_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$newBalance, $wallet['id']]);
        
        // Create transaction record
        $stmt = $pdo->prepare("
            INSERT INTO wallet_transactions 
            (wallet_id, type, amount, purpose, description, balance_after, status)
            VALUES (?, 'credit', ?, 'deposit', 'Wallet deposit', ?, 'completed')
        ");
        $stmt->execute([$wallet['id'], $amount, $newBalance]);
        
        $transactionId = $pdo->lastInsertId();
        
        $pdo->commit();
        
        // Get the created transaction
        $stmt = $pdo->prepare("SELECT * FROM wallet_transactions WHERE id = ?");
        $stmt->execute([$transactionId]);
        $transaction = $stmt->fetch();
        
        sendResponse($transaction, 201);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Deposit error: ' . $e->getMessage());
        sendError('Failed to process deposit', 500);
    }
}

function handleWithdraw() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $input = sanitizeInput($input);
    
    $required_fields = ['user_id', 'amount'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    $amount = (float)$input['amount'];
    if ($amount <= 0) {
        sendError('Amount must be greater than 0');
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get wallet
        $stmt = $pdo->prepare("SELECT * FROM pooling_wallets WHERE user_id = ?");
        $stmt->execute([$input['user_id']]);
        $wallet = $stmt->fetch();
        
        if (!$wallet) {
            sendError('Wallet not found', 404);
        }
        
        // Check if sufficient balance
        if ($wallet['balance'] < $amount) {
            sendError('Insufficient balance', 400);
        }
        
        // For providers, check minimum balance requirement
        $stmt = $pdo->prepare("SELECT role FROM pooling_users WHERE id = ?");
        $stmt->execute([$input['user_id']]);
        $user = $stmt->fetch();
        
        if ($user['role'] === 'provider' && ($wallet['balance'] - $amount) < 500) {
            sendError('Providers must maintain minimum balance of ₹500', 400);
        }
        
        // Update wallet balance
        $newBalance = $wallet['balance'] - $amount;
        $stmt = $pdo->prepare("
            UPDATE pooling_wallets 
            SET balance = ?, last_transaction_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$newBalance, $wallet['id']]);
        
        // Create transaction record
        $stmt = $pdo->prepare("
            INSERT INTO wallet_transactions 
            (wallet_id, type, amount, purpose, description, balance_after, status)
            VALUES (?, 'debit', ?, 'withdrawal', 'Wallet withdrawal', ?, 'completed')
        ");
        $stmt->execute([$wallet['id'], $amount, $newBalance]);
        
        $transactionId = $pdo->lastInsertId();
        
        $pdo->commit();
        
        // Get the created transaction
        $stmt = $pdo->prepare("SELECT * FROM wallet_transactions WHERE id = ?");
        $stmt->execute([$transactionId]);
        $transaction = $stmt->fetch();
        
        sendResponse($transaction, 201);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Withdraw error: ' . $e->getMessage());
        sendError('Failed to process withdrawal', 500);
    }
}
?>
