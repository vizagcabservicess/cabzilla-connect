<?php
require_once __DIR__ . '/../../config.php';

// DEBUG: Check if auth.php exists and is included
$authPath = __DIR__ . '/../utils/auth.php';
if (!file_exists($authPath)) {
    die('FATAL: auth.php not found at: ' . $authPath);
}
require_once $authPath;

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get user from JWT token - Enhanced header handling
$userId = null;
$userRole = null;

// Try multiple ways to get the Authorization header
$authHeader = null;
if (function_exists('getallheaders')) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
} else {
    // Fallback for environments where getallheaders() doesn't exist
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
}

try {
    if ($authHeader) {
        $token = str_replace('Bearer ', '', $authHeader);
        
        if (!function_exists('verifyJwtToken')) {
            sendJsonResponse(['error' => 'JWT verification function not available'], 500);
            exit;
        }
        
        $payload = verifyJwtToken($token);
        if ($payload && (isset($payload['user_id']) || isset($payload['userId']))) {
            $userId = isset($payload['user_id']) ? $payload['user_id'] : $payload['userId'];
            $userRole = $payload['role'] ?? 'guest';
        }
    }
} catch (Exception $e) {
    error_log("JWT verification error: " . $e->getMessage());
    sendJsonResponse(['error' => 'Invalid token: ' . $e->getMessage()], 401);
    exit;
}

if (!$userId) {
    sendJsonResponse(['error' => 'Authentication required. No valid user ID found.'], 401);
    exit;
}

// Connect to database
try {
    $conn = getDbConnection();
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Database connection failed'], 500);
    exit;
}

try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            handleGetRequest($conn, $userId, $userRole);
            break;
        case 'POST':
            handlePostRequest($conn, $userId, $userRole);
            break;
        case 'PUT':
            handlePutRequest($conn, $userId, $userRole);
            break;
        case 'DELETE':
            handleDeleteRequest($conn, $userId, $userRole);
            break;
        default:
            sendJsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Error in admin-profiles endpoint: " . $e->getMessage());
    sendJsonResponse(['error' => 'Failed to process request'], 500);
}

function handleGetRequest($conn, $userId, $userRole) {
    if (isset($_GET['public'])) {
        // Public endpoint for operator selection
        $query = "
            SELECT ap.*, u.name as admin_name,
                   COUNT(DISTINCT v.id) as vehicle_count,
                   AVG(or.rating) as avg_rating,
                   COUNT(DISTINCT or.id) as review_count
            FROM admin_profiles ap
            LEFT JOIN users u ON ap.admin_user_id = u.id
            LEFT JOIN vehicles v ON v.owner_admin_id = ap.admin_user_id AND v.status = 'active'
            LEFT JOIN operator_reviews or ON or.operator_admin_id = ap.admin_user_id AND or.is_public = 1
            WHERE ap.is_active = 1 AND u.is_active = 1
            GROUP BY ap.id
            ORDER BY ap.rating DESC, ap.business_name ASC
        ";
        $result = $conn->query($query);
        
        $operators = [];
        while ($row = $result->fetch_assoc()) {
            $operators[] = [
                'id' => intval($row['id']),
                'adminUserId' => intval($row['admin_user_id']),
                'businessName' => $row['business_name'],
                'displayName' => $row['display_name'],
                'description' => $row['description'],
                'startingFare' => floatval($row['starting_fare']),
                'rating' => floatval($row['avg_rating'] ?: $row['rating']),
                'totalRatings' => intval($row['review_count'] ?: $row['total_ratings']),
                'vehicleCount' => intval($row['vehicle_count']),
                'serviceAreas' => json_decode($row['service_areas'] ?: '[]'),
                'amenities' => json_decode($row['amenities'] ?: '[]'),
                'vehicleTypes' => json_decode($row['vehicle_types'] ?: '[]'),
                'logoUrl' => $row['logo_url']
            ];
        }
        
        sendJsonResponse(['success' => true, 'data' => $operators]);
        return;
    }
    
    if (isset($_GET['admin_id'])) {
        // Get specific admin profile
        $adminId = intval($_GET['admin_id']);
        
        // Check access permissions
        if ($userRole !== 'super_admin' && $userId !== $adminId) {
            sendJsonResponse(['error' => 'Access denied'], 403);
            return;
        }
        
        $stmt = $conn->prepare("
            SELECT ap.*, u.name, u.email, u.phone
            FROM admin_profiles ap
            LEFT JOIN users u ON ap.admin_user_id = u.id
            WHERE ap.admin_user_id = ?
        ");
        $stmt->bind_param("i", $adminId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            $profile = [
                'id' => intval($row['id']),
                'adminUserId' => intval($row['admin_user_id']),
                'businessName' => $row['business_name'],
                'displayName' => $row['display_name'],
                'businessPhone' => $row['business_phone'],
                'businessEmail' => $row['business_email'],
                'businessAddress' => $row['business_address'],
                'logoUrl' => $row['logo_url'],
                'description' => $row['description'],
                'startingFare' => floatval($row['starting_fare']),
                'rating' => floatval($row['rating']),
                'totalRatings' => intval($row['total_ratings']),
                'isActive' => (bool)$row['is_active'],
                'serviceAreas' => json_decode($row['service_areas'] ?: '[]'),
                'amenities' => json_decode($row['amenities'] ?: '[]'),
                'vehicleTypes' => json_decode($row['vehicle_types'] ?: '[]'),
                'adminUser' => [
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'phone' => $row['phone']
                ]
            ];
            sendJsonResponse(['success' => true, 'data' => $profile]);
        } else {
            sendJsonResponse(['success' => true, 'data' => null]);
        }
        return;
    }
    
    // Get all admin profiles (super admin only)
    if ($userRole !== 'super_admin') {
        sendJsonResponse(['error' => 'Access denied'], 403);
        return;
    }
    
    $query = "
        SELECT ap.*, u.name, u.email, u.phone, u.role,
               COUNT(DISTINCT v.id) as vehicle_count,
               COUNT(DISTINCT b.id) as booking_count
        FROM admin_profiles ap
        LEFT JOIN users u ON ap.admin_user_id = u.id
        LEFT JOIN vehicles v ON v.owner_admin_id = ap.admin_user_id
        LEFT JOIN bookings b ON b.operator_admin_id = ap.admin_user_id
        WHERE u.role IN ('admin', 'super_admin')
        GROUP BY ap.id
        ORDER BY ap.business_name ASC
    ";
    $result = $conn->query($query);
    
    $profiles = [];
    while ($row = $result->fetch_assoc()) {
        $profiles[] = [
            'id' => intval($row['id']),
            'adminUserId' => intval($row['admin_user_id']),
            'businessName' => $row['business_name'],
            'displayName' => $row['display_name'],
            'businessPhone' => $row['business_phone'],
            'businessEmail' => $row['business_email'],
            'description' => $row['description'],
            'startingFare' => floatval($row['starting_fare']),
            'rating' => floatval($row['rating']),
            'totalRatings' => intval($row['total_ratings']),
            'isActive' => (bool)$row['is_active'],
            'vehicleCount' => intval($row['vehicle_count']),
            'bookingCount' => intval($row['booking_count']),
            'adminUser' => [
                'name' => $row['name'],
                'email' => $row['email'],
                'phone' => $row['phone'],
                'role' => $row['role']
            ]
        ];
    }
    
    sendJsonResponse(['success' => true, 'data' => $profiles]);
}

function handlePostRequest($conn, $userId, $userRole) {
    $requestBody = file_get_contents('php://input');
    $data = json_decode($requestBody, true);
    
    if (!$data) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
        return;
    }
    
    $adminUserId = $data['adminUserId'] ?? $userId;
    
    // Check permissions
    if ($userRole !== 'super_admin' && $userId !== $adminUserId) {
        sendJsonResponse(['error' => 'Access denied'], 403);
        return;
    }
    
    $stmt = $conn->prepare("
        INSERT INTO admin_profiles (
            admin_user_id, business_name, display_name, business_phone, business_email,
            business_address, logo_url, description, starting_fare, service_areas,
            amenities, vehicle_types
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $serviceAreas = json_encode($data['serviceAreas'] ?? []);
    $amenities = json_encode($data['amenities'] ?? []);
    $vehicleTypes = json_encode($data['vehicleTypes'] ?? []);
    
    $stmt->bind_param(
        "isssssssdsss",
        $adminUserId,
        $data['businessName'],
        $data['displayName'],
        $data['businessPhone'],
        $data['businessEmail'],
        $data['businessAddress'],
        $data['logoUrl'],
        $data['description'],
        $data['startingFare'],
        $serviceAreas,
        $amenities,
        $vehicleTypes
    );
    
    if ($stmt->execute()) {
        $profileId = $conn->insert_id;
        sendJsonResponse(['success' => true, 'data' => ['id' => $profileId]]);
    } else {
        throw new Exception("Failed to create admin profile: " . $conn->error);
    }
}

function handlePutRequest($conn, $userId, $userRole) {
    $requestBody = file_get_contents('php://input');
    $data = json_decode($requestBody, true);
    
    if (!$data || !isset($data['id'])) {
        sendJsonResponse(['error' => 'Profile ID required'], 400);
        return;
    }
    
    $profileId = intval($data['id']);
    
    // Get current profile to check permissions
    $stmt = $conn->prepare("SELECT admin_user_id FROM admin_profiles WHERE id = ?");
    $stmt->bind_param("i", $profileId);
    $stmt->execute();
    $result = $stmt->get_result();
    $profile = $result->fetch_assoc();
    
    if (!$profile) {
        sendJsonResponse(['error' => 'Profile not found'], 404);
        return;
    }
    
    // Check permissions
    if ($userRole !== 'super_admin' && $userId !== intval($profile['admin_user_id'])) {
        sendJsonResponse(['error' => 'Access denied'], 403);
        return;
    }
    
    $stmt = $conn->prepare("
        UPDATE admin_profiles SET
            business_name = ?, display_name = ?, business_phone = ?, business_email = ?,
            business_address = ?, logo_url = ?, description = ?, starting_fare = ?,
            service_areas = ?, amenities = ?, vehicle_types = ?, is_active = ?,
            updated_at = NOW()
        WHERE id = ?
    ");
    
    $serviceAreas = json_encode($data['serviceAreas'] ?? []);
    $amenities = json_encode($data['amenities'] ?? []);
    $vehicleTypes = json_encode($data['vehicleTypes'] ?? []);
    $isActive = $data['isActive'] ?? true;
    
    $stmt->bind_param(
        "sssssssdsssii",
        $data['businessName'],
        $data['displayName'],
        $data['businessPhone'],
        $data['businessEmail'],
        $data['businessAddress'],
        $data['logoUrl'],
        $data['description'],
        $data['startingFare'],
        $serviceAreas,
        $amenities,
        $vehicleTypes,
        $isActive,
        $profileId
    );
    
    if ($stmt->execute()) {
        sendJsonResponse(['success' => true, 'message' => 'Profile updated successfully']);
    } else {
        throw new Exception("Failed to update admin profile: " . $conn->error);
    }
}

function handleDeleteRequest($conn, $userId, $userRole) {
    if ($userRole !== 'super_admin') {
        sendJsonResponse(['error' => 'Access denied'], 403);
        return;
    }
    
    if (!isset($_GET['id'])) {
        sendJsonResponse(['error' => 'Profile ID required'], 400);
        return;
    }
    
    $profileId = intval($_GET['id']);
    
    $stmt = $conn->prepare("DELETE FROM admin_profiles WHERE id = ?");
    $stmt->bind_param("i", $profileId);
    
    if ($stmt->execute()) {
        sendJsonResponse(['success' => true, 'message' => 'Profile deleted successfully']);
    } else {
        throw new Exception("Failed to delete admin profile: " . $conn->error);
    }
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
?>