<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        $action = $_GET['action'] ?? '';
        switch ($action) {
            case 'login':
                handleLogin();
                break;
            case 'register':
                handleRegister();
                break;
            case 'logout':
                handleLogout();
                break;
            default:
                sendError('Invalid action');
        }
        break;
    case 'GET':
        handleGetProfile();
        break;
    case 'PUT':
        handleUpdateProfile();
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleLogin() {
    global $pdo;
    
    // Debug: log what PHP receives
    file_put_contents(__DIR__ . '/debug_login.log', "POST: " . print_r($_POST, true) . "\n", FILE_APPEND);
    file_put_contents(__DIR__ . '/debug_login.log', "RAW: " . file_get_contents('php://input') . "\n", FILE_APPEND);
    file_put_contents(__DIR__ . '/debug_login.log', "HEADERS: " . print_r(getallheaders(), true) . "\n", FILE_APPEND);

    // Accept both form data and JSON, and parse raw input as fallback
    $input = $_POST;
    if (empty($input)) {
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true);
        if (is_array($json)) {
            $input = $json;
        } else {
            parse_str($raw, $input);
        }
    }
    $input = sanitizeInput($input);
    
    // Debug: log input before validation
    file_put_contents(__DIR__ . '/debug_login.log', "INPUT BEFORE VALIDATION: " . print_r($input, true) . "\n", FILE_APPEND);
    if (isset($input['email']) && isset($input['password'])) {
        file_put_contents(__DIR__ . '/debug_login.log', "EMAIL AND PASSWORD ARE SET\n", FILE_APPEND);
    }

    $required_fields = ['email', 'password'];
    $errors = validateInput($input, $required_fields);
    // Debug: log validation errors
    file_put_contents(__DIR__ . '/debug_login.log', "VALIDATION ERRORS: " . print_r($errors, true) . "\n", FILE_APPEND);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    try {
        // Check if user exists in pooling_users
        $stmt = $pdo->prepare("SELECT * FROM pooling_users WHERE email = ? AND is_active = 1");
        $stmt->execute([$input['email']]);
        $user = $stmt->fetch();
        file_put_contents(__DIR__ . '/debug_login.log', "USER LOOKUP RESULT: " . print_r($user, true) . "\n", FILE_APPEND);
        if (!$user) {
            file_put_contents(__DIR__ . '/debug_login.log', "USER NOT FOUND\n", FILE_APPEND);
        }
        if ($user && !verifyHash($input['password'], $user['password_hash'])) {
            file_put_contents(__DIR__ . '/debug_login.log', "PASSWORD MISMATCH\n", FILE_APPEND);
        }
        if (!$user || !verifyHash($input['password'], $user['password_hash'])) {
            sendError('Invalid credentials', 401);
        }
        file_put_contents(__DIR__ . '/debug_login.log', "PASSWORD VERIFIED\n", FILE_APPEND);
        
        // Generate API token
        $token = generateToken();
        file_put_contents(__DIR__ . '/debug_login.log', "TOKEN GENERATED: $token\n", FILE_APPEND);

        $stmt = $pdo->prepare("UPDATE pooling_users SET api_token = ? WHERE id = ?");
        $result = $stmt->execute([$token, $user['id']]);
        file_put_contents(__DIR__ . '/debug_login.log', "TOKEN UPDATED IN DB: " . print_r($result, true) . "\n", FILE_APPEND);
        
        // Get wallet balance
        $stmt = $pdo->prepare("SELECT balance FROM pooling_wallets WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $wallet = $stmt->fetch();
        file_put_contents(__DIR__ . '/debug_login.log', "WALLET LOOKUP: " . print_r($wallet, true) . "\n", FILE_APPEND);
        
        // Get provider ID if user is a provider
        $providerId = null;
        $provider = null;
        if ($user['role'] === 'provider') {
            $stmt = $pdo->prepare("SELECT id FROM pooling_providers WHERE user_id = ?");
            $stmt->execute([$user['id']]);
            $provider = $stmt->fetch();
            $providerId = $provider ? $provider['id'] : null;
            file_put_contents(__DIR__ . '/debug_login.log', "PROVIDER LOOKUP: " . print_r($provider, true) . "\n", FILE_APPEND);
        }
        
        unset($user['password_hash'], $user['api_token']);
        $user['walletBalance'] = $wallet ? (float)$wallet['balance'] : 0.00;
        if ($user['role'] === 'provider') {
            $user['providerId'] = $providerId;
        }
        
        file_put_contents(__DIR__ . '/debug_login.log', "READY TO SEND RESPONSE\n", FILE_APPEND);

        sendResponse([
            'user' => $user,
            'token' => $token
        ]);
        file_put_contents(__DIR__ . '/debug_login.log', "RESPONSE SENT\n", FILE_APPEND);
        
    } catch (PDOException $e) {
        error_log('Login error: ' . $e->getMessage());
        file_put_contents(__DIR__ . '/debug_login.log', "PDOException: " . $e->getMessage() . "\n", FILE_APPEND);
        sendError('Login failed', 500);
    }
}

function handleRegister() {
    global $pdo;
    
    // Accept both form data and JSON, and parse raw input as fallback
    $input = $_POST;
    if (empty($input)) {
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true);
        if (is_array($json)) {
            $input = $json;
        } else {
            parse_str($raw, $input);
        }
    }
    $input = sanitizeInput($input);
    
    $required_fields = ['name', 'email', 'phone', 'password', 'role'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    if (!in_array($input['role'], ['guest', 'provider', 'admin'])) {
        sendError('Invalid role');
    }
    
    try {
        $pdo->beginTransaction();
        
        // Check if user already exists
        $stmt = $pdo->prepare("SELECT id FROM pooling_users WHERE email = ? OR phone = ?");
        $stmt->execute([$input['email'], $input['phone']]);
        if ($stmt->fetch()) {
            sendError('User already exists with this email or phone', 409);
        }
        
        // Create user
        $passwordHash = generateHash($input['password']);
        $token = generateToken();
        
        $stmt = $pdo->prepare("
            INSERT INTO pooling_users (name, email, phone, password_hash, role, api_token, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ");
        $stmt->execute([
            $input['name'],
            $input['email'],
            $input['phone'],
            $passwordHash,
            $input['role'],
            $token
        ]);
        
        $userId = $pdo->lastInsertId();
        
        // Create wallet
        $initialBalance = $input['role'] === 'provider' ? 1000.00 : 0.00;
        $stmt = $pdo->prepare("INSERT IGNORE INTO pooling_wallets (user_id, balance) VALUES (?, ?)");
        $stmt->execute([$userId, $initialBalance]);
        
        // If provider, create provider profile and get providerId
        $providerId = null;
        if ($input['role'] === 'provider') {
            $stmt = $pdo->prepare("
                INSERT INTO pooling_providers (user_id, name, phone, email, is_active)
                VALUES (?, ?, ?, ?, 1)
            ");
            $stmt->execute([$userId, $input['name'], $input['phone'], $input['email']]);
            $providerId = $pdo->lastInsertId();
        }
        
        $pdo->commit();
        
        // Return user data
        $stmt = $pdo->prepare("SELECT * FROM pooling_users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        unset($user['password_hash'], $user['api_token']);
        $user['walletBalance'] = $initialBalance;
        if ($input['role'] === 'provider') {
            $user['providerId'] = $providerId;
        }
        
        sendResponse([
            'user' => $user,
            'token' => $token
        ], 201);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Registration error: ' . $e->getMessage());
        file_put_contents(__DIR__ . '/debug_register.log', "PDOException: " . $e->getMessage() . "\n", FILE_APPEND);
        sendError('Registration failed', 500);
    }
}

function handleGetProfile() {
    $user = requireAuth();
    
    global $pdo;
    
    try {
        // Get wallet balance
        $stmt = $pdo->prepare("SELECT balance FROM pooling_wallets WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $wallet = $stmt->fetch();
        
        // Get provider ID if user is a provider
        $providerId = null;
        if ($user['role'] === 'provider') {
            $stmt = $pdo->prepare("SELECT id FROM pooling_providers WHERE user_id = ?");
            $stmt->execute([$user['id']]);
            $provider = $stmt->fetch();
            $providerId = $provider ? $provider['id'] : null;
        }
        
        unset($user['password_hash'], $user['api_token']);
        $user['walletBalance'] = $wallet ? (float)$wallet['balance'] : 0.00;
        $user['providerId'] = $providerId;
        
        sendResponse($user);
        
    } catch (PDOException $e) {
        error_log('Get profile error: ' . $e->getMessage());
        sendError('Failed to get profile', 500);
    }
}

function handleUpdateProfile() {
    $user = requireAuth();
    
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $input = sanitizeInput($input);
    
    try {
        $updates = [];
        $params = [];
        
        if (isset($input['name'])) {
            $updates[] = "name = ?";
            $params[] = $input['name'];
        }
        
        if (isset($input['phone'])) {
            $updates[] = "phone = ?";
            $params[] = $input['phone'];
        }
        
        if (empty($updates)) {
            sendError('No fields to update');
        }
        
        $params[] = $user['id'];
        $sql = "UPDATE pooling_users SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        sendResponse(['message' => 'Profile updated successfully']);
        
    } catch (PDOException $e) {
        error_log('Update profile error: ' . $e->getMessage());
        sendError('Failed to update profile', 500);
    }
}

function handleLogout() {
    $user = requireAuth();
    
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("UPDATE pooling_users SET api_token = NULL WHERE id = ?");
        $stmt->execute([$user['id']]);
        
        sendResponse(['message' => 'Logged out successfully']);
        
    } catch (PDOException $e) {
        error_log('Logout error: ' . $e->getMessage());
        sendError('Logout failed', 500);
    }
}
?>
