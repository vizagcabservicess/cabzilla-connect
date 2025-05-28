
<?php
require_once '../common/db_helper.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

$required = ['name', 'email', 'password', 'phone'];
foreach ($required as $field) {
    if (!isset($input[$field]) || empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['error' => ucfirst($field) . ' is required']);
        exit();
    }
}

try {
    $conn = getDbConnectionWithRetry();
    
    // Check if user already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? OR phone = ?");
    $stmt->bind_param("ss", $input['email'], $input['phone']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'User already exists with this email or phone']);
        exit();
    }
    
    // Hash password
    $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
    
    // Insert user
    $stmt = $conn->prepare("
        INSERT INTO users (name, email, password, phone, role, is_active) 
        VALUES (?, ?, ?, ?, 'customer', 1)
    ");
    $stmt->bind_param("ssss", $input['name'], $input['email'], $hashedPassword, $input['phone']);
    $stmt->execute();
    
    $userId = $conn->insert_id;
    
    // Create wallet for user
    $stmt = $conn->prepare("INSERT INTO pooling_wallets (user_id, balance) VALUES (?, 0.00)");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'user_id' => $userId
    ]);
    
} catch (Exception $e) {
    error_log('Registration error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed']);
}
?>
