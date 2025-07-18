<?php
require_once '../common/db_helper.php';
require_once '../utils/auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

if (!$token) {
    http_response_code(401);
    echo json_encode(['error' => 'Token required']);
    exit();
}

try {
    // Verify JWT token
    $payload = verifyJwtToken($token);
    
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or expired token']);
        exit();
    }
    
    $user_id = $payload['user_id'];
    
    $conn = getDbConnectionWithRetry();
    
    // Get user from database using user_id from JWT
    $stmt = $conn->prepare("
        SELECT id, name, email, phone, role, is_active 
        FROM users 
        WHERE id = ? AND is_active = 1
    ");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'User not found or inactive']);
        exit();
    }

    /*
    // If user is a provider, fetch provider_id from pooling_providers
    if ($user['role'] === 'provider') {
        $stmt2 = $conn->prepare("SELECT id FROM pooling_providers WHERE user_id = ? LIMIT 1");
        $stmt2->bind_param("i", $user['id']);
        $stmt2->execute();
        $result2 = $stmt2->get_result();
        $provider = $result2->fetch_assoc();
        $user['provider_id'] = $provider ? $provider['id'] : null;
    }
    */

    echo json_encode(['success' => true, 'user' => $user]);
    
} catch (Exception $e) {
    error_log('Get user error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to get user']);
}
?>
