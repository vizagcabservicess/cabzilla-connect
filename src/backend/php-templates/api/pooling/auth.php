
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
    
    $input = json_decode(file_get_contents('php://input'), true);
    $input = sanitizeInput($input);
    
    $required_fields = ['email', 'password'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    try {
        // Check if user exists in pooling_users
        $stmt = $pdo->prepare("SELECT * FROM pooling_users WHERE email = ? AND is_active = 1");
        $stmt->execute([$input['email']]);
        $user = $stmt->fetch();
        
        if (!$user || !verifyHash($input['password'], $user['password_hash'])) {
            sendError('Invalid credentials', 401);
        }
        
        // Generate API token
        $token = generateToken();
        $stmt = $pdo->prepare("UPDATE pooling_users SET api_token = ? WHERE id = ?");
        $stmt->execute([$token, $user['id']]);
        
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
        
        sendResponse([
            'user' => $user,
            'token' => $token
        ]);
        
    } catch (PDOException $e) {
        error_log('Login error: ' . $e->getMessage());
        sendError('Login failed', 500);
    }
}

function handleRegister() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
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
        $stmt = $pdo->prepare("INSERT INTO pooling_wallets (user_id, balance) VALUES (?, ?)");
        $stmt->execute([$userId, $initialBalance]);
        
        // If provider, create provider profile
        if ($input['role'] === 'provider') {
            $stmt = $pdo->prepare("
                INSERT INTO pooling_providers (user_id, name, phone, email, is_active)
                VALUES (?, ?, ?, ?, 1)
            ");
            $stmt->execute([$userId, $input['name'], $input['phone'], $input['email']]);
        }
        
        $pdo->commit();
        
        // Return user data
        $stmt = $pdo->prepare("SELECT * FROM pooling_users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        unset($user['password_hash'], $user['api_token']);
        $user['walletBalance'] = $initialBalance;
        
        sendResponse([
            'user' => $user,
            'token' => $token
        ], 201);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Registration error: ' . $e->getMessage());
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
