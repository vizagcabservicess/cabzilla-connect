<?php
require_once '../common/db_helper.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// Get user from token
function authenticateUser() {
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit();
    }
    
    $conn = getDbConnectionWithRetry();
    $stmt = $conn->prepare("
        SELECT u.id, u.role 
        FROM users u 
        JOIN user_sessions s ON u.id = s.user_id 
        WHERE s.token = ? AND s.expires_at > NOW()
    ");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or expired token']);
        exit();
    }
    
    return $user;
}

switch ($method) {
    case 'GET':
        $user = authenticateUser();
        getUserWallet($user['id']);
        break;
    case 'POST':
        $user = authenticateUser();
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'deposit':
                depositToWallet($user['id']);
                break;
            case 'withdraw':
                withdrawFromWallet($user['id']);
                break;
            case 'check-balance':
                checkMinimumBalance($user['id']);
                break;
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getUserWallet($userId) {
    try {
        $conn = getDbConnectionWithRetry();
        
        // Get wallet details
        $stmt = $conn->prepare("SELECT * FROM pooling_wallets WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $wallet = $result->fetch_assoc();
        
        if (!$wallet) {
            // Create wallet if doesn't exist
            $stmt = $conn->prepare("INSERT INTO pooling_wallets (user_id, balance) VALUES (?, 0.00)");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            
            $wallet = [
                'id' => $conn->insert_id,
                'user_id' => $userId,
                'balance' => 0.00,
                'locked_amount' => 0.00,
                'total_earnings' => 0.00,
                'total_spent' => 0.00
            ];
        }
        
        // Get recent transactions
        $stmt = $conn->prepare("
            SELECT * FROM wallet_transactions 
            WHERE wallet_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        ");
        $stmt->bind_param("i", $wallet['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $transactions = $result->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode([
            'success' => true,
            'wallet' => $wallet,
            'transactions' => $transactions,
            'can_offer_rides' => $wallet['balance'] >= 500
        ]);
        
    } catch (Exception $e) {
        error_log('Get wallet error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to get wallet']);
    }
}

function checkMinimumBalance($userId) {
    try {
        $conn = getDbConnectionWithRetry();
        
        $stmt = $conn->prepare("SELECT balance FROM pooling_wallets WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $wallet = $result->fetch_assoc();
        
        if (!$wallet) {
            echo json_encode(['success' => false, 'can_offer_rides' => false, 'balance' => 0]);
            return;
        }
        
        $canOfferRides = $wallet['balance'] >= 500;
        
        echo json_encode([
            'success' => true,
            'can_offer_rides' => $canOfferRides,
            'balance' => $wallet['balance'],
            'minimum_required' => 500,
            'shortfall' => $canOfferRides ? 0 : (500 - $wallet['balance'])
        ]);
        
    } catch (Exception $e) {
        error_log('Check balance error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to check balance']);
    }
}

function depositToWallet($userId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['amount']) || $input['amount'] <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Valid amount is required']);
        return;
    }
    
    try {
        $conn = getDbConnectionWithRetry();
        $conn->begin_transaction();
        
        // Get wallet
        $stmt = $conn->prepare("SELECT id, balance FROM pooling_wallets WHERE user_id = ? FOR UPDATE");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $wallet = $result->fetch_assoc();
        
        if (!$wallet) {
            throw new Exception('Wallet not found');
        }
        
        $newBalance = $wallet['balance'] + $input['amount'];
        
        // Update wallet
        $stmt = $conn->prepare("UPDATE pooling_wallets SET balance = ? WHERE id = ?");
        $stmt->bind_param("di", $newBalance, $wallet['id']);
        $stmt->execute();
        
        // Record transaction
        $stmt = $conn->prepare("
            INSERT INTO wallet_transactions 
            (wallet_id, type, amount, purpose, description, balance_after) 
            VALUES (?, 'credit', ?, 'deposit', ?, ?)
        ");
        $description = 'Wallet deposit of ₹' . $input['amount'];
        $stmt->bind_param("idsd", $wallet['id'], $input['amount'], $description, $newBalance);
        $stmt->execute();
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Deposit successful',
            'new_balance' => $newBalance
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        error_log('Deposit error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Deposit failed']);
    }
}

function withdrawFromWallet($userId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['amount']) || $input['amount'] <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Valid amount is required']);
        return;
    }
    
    try {
        $conn = getDbConnectionWithRetry();
        $conn->begin_transaction();
        
        // Get wallet
        $stmt = $conn->prepare("SELECT id, balance FROM pooling_wallets WHERE user_id = ? FOR UPDATE");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $wallet = $result->fetch_assoc();
        
        if (!$wallet) {
            throw new Exception('Wallet not found');
        }
        
        // Check if withdrawal amount exceeds available balance (keeping ₹500 minimum)
        $availableForWithdrawal = max(0, $wallet['balance'] - 500);
        
        if ($input['amount'] > $availableForWithdrawal) {
            throw new Exception('Insufficient balance. Minimum ₹500 must be maintained.');
        }
        
        $newBalance = $wallet['balance'] - $input['amount'];
        
        // Update wallet
        $stmt = $conn->prepare("UPDATE pooling_wallets SET balance = ? WHERE id = ?");
        $stmt->bind_param("di", $newBalance, $wallet['id']);
        $stmt->execute();
        
        // Record transaction
        $stmt = $conn->prepare("
            INSERT INTO wallet_transactions 
            (wallet_id, type, amount, purpose, description, balance_after) 
            VALUES (?, 'debit', ?, 'withdrawal', ?, ?)
        ");
        $description = 'Wallet withdrawal of ₹' . $input['amount'];
        $stmt->bind_param("idsd", $wallet['id'], $input['amount'], $description, $newBalance);
        $stmt->execute();
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Withdrawal successful',
            'new_balance' => $newBalance
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        error_log('Withdrawal error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
