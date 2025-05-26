
<?php
require_once '../common/db_helper.php';

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
    $conn = getDbConnectionWithRetry();
    
    // Get user from session
    $stmt = $conn->prepare("
        SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active 
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
    
    echo json_encode(['success' => true, 'user' => $user]);
    
} catch (Exception $e) {
    error_log('Get user error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to get user']);
}
?>
