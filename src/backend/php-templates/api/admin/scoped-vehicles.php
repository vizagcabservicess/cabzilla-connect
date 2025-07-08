<?php
require_once __DIR__ . '/../../config.php';

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

// Get user from JWT token
$headers = getallheaders();
$userId = null;
$userRole = null;

try {
    if (isset($headers['Authorization']) || isset($headers['authorization'])) {
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
        $token = str_replace('Bearer ', '', $authHeader);
        
        $payload = verifyJwtToken($token);
        if ($payload && isset($payload['user_id'])) {
            $userId = $payload['user_id'];
            $userRole = $payload['role'] ?? 'guest';
        }
    }
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Invalid token'], 401);
    exit;
}

if (!$userId) {
    sendJsonResponse(['error' => 'Authentication required'], 401);
    exit;
}

// Check admin access
if (!in_array($userRole, ['admin', 'super_admin'])) {
    sendJsonResponse(['error' => 'Admin access required'], 403);
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
    error_log("Error in scoped-vehicles endpoint: " . $e->getMessage());
    sendJsonResponse(['error' => 'Failed to process request'], 500);
}

function handleGetRequest($conn, $userId, $userRole) {
    if (isset($_GET['operator_id'])) {
        // Get vehicles for specific operator (super admin only or self)
        $operatorId = intval($_GET['operator_id']);
        
        if ($userRole !== 'super_admin' && $userId !== $operatorId) {
            sendJsonResponse(['error' => 'Access denied'], 403);
            return;
        }
        
        $stmt = $conn->prepare("
            SELECT v.*, 
                   u.name as owner_name,
                   COUNT(DISTINCT b.id) as booking_count,
                   AVG(CASE WHEN b.status = 'completed' THEN b.total_amount END) as avg_fare
            FROM vehicles v
            LEFT JOIN users u ON v.owner_admin_id = u.id
            LEFT JOIN bookings b ON b.vehicle_id = v.id
            WHERE v.owner_admin_id = ?
            GROUP BY v.id
            ORDER BY v.created_at DESC
        ");
        $stmt->bind_param("i", $operatorId);
    } else {
        // Get vehicles based on user role
        if ($userRole === 'super_admin') {
            // Super admin sees all vehicles
            $query = "
                SELECT v.*, 
                       u.name as owner_name,
                       ap.business_name as operator_name,
                       COUNT(DISTINCT b.id) as booking_count,
                       AVG(CASE WHEN b.status = 'completed' THEN b.total_amount END) as avg_fare
                FROM vehicles v
                LEFT JOIN users u ON v.owner_admin_id = u.id
                LEFT JOIN admin_profiles ap ON ap.admin_user_id = v.owner_admin_id
                LEFT JOIN bookings b ON b.vehicle_id = v.id
                GROUP BY v.id
                ORDER BY v.created_at DESC
            ";
            $stmt = $conn->prepare($query);
        } else {
            // Regular admin sees only their vehicles
            $stmt = $conn->prepare("
                SELECT v.*, 
                       u.name as owner_name,
                       COUNT(DISTINCT b.id) as booking_count,
                       AVG(CASE WHEN b.status = 'completed' THEN b.total_amount END) as avg_fare
                FROM vehicles v
                LEFT JOIN users u ON v.owner_admin_id = u.id
                LEFT JOIN bookings b ON b.vehicle_id = v.id
                WHERE v.owner_admin_id = ?
                GROUP BY v.id
                ORDER BY v.created_at DESC
            ");
            $stmt->bind_param("i", $userId);
        }
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $vehicles = [];
    while ($row = $result->fetch_assoc()) {
        $vehicles[] = [
            'id' => intval($row['id']),
            'vehicleNumber' => $row['vehicle_number'],
            'vehicleType' => $row['vehicle_type'],
            'model' => $row['model'],
            'make' => $row['make'],
            'year' => intval($row['year']),
            'seatingCapacity' => intval($row['seating_capacity']),
            'fuelType' => $row['fuel_type'],
            'acType' => $row['ac_type'],
            'status' => $row['status'],
            'ownerAdminId' => intval($row['owner_admin_id']),
            'ownerName' => $row['owner_name'],
            'operatorName' => $row['operator_name'] ?? $row['owner_name'],
            'bookingCount' => intval($row['booking_count'] ?: 0),
            'avgFare' => floatval($row['avg_fare'] ?: 0),
            'imageUrl' => $row['image_url'],
            'features' => json_decode($row['features'] ?: '[]'),
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at']
        ];
    }
    
    sendJsonResponse(['success' => true, 'data' => $vehicles]);
}

function handlePostRequest($conn, $userId, $userRole) {
    $requestBody = file_get_contents('php://input');
    $data = json_decode($requestBody, true);
    
    if (!$data) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
        return;
    }
    
    // Set owner to current user unless super admin specifies otherwise
    $ownerAdminId = $userId;
    if ($userRole === 'super_admin' && isset($data['ownerAdminId'])) {
        $ownerAdminId = intval($data['ownerAdminId']);
    }
    
    $stmt = $conn->prepare("
        INSERT INTO vehicles (
            vehicle_number, vehicle_type, model, make, year, seating_capacity,
            fuel_type, ac_type, status, owner_admin_id, image_url, features
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $features = json_encode($data['features'] ?? []);
    $status = $data['status'] ?? 'active';
    
    $stmt->bind_param(
        "ssssiiisssis",
        $data['vehicleNumber'],
        $data['vehicleType'],
        $data['model'],
        $data['make'],
        $data['year'],
        $data['seatingCapacity'],
        $data['fuelType'],
        $data['acType'],
        $status,
        $ownerAdminId,
        $data['imageUrl'],
        $features
    );
    
    if ($stmt->execute()) {
        $vehicleId = $conn->insert_id;
        sendJsonResponse(['success' => true, 'data' => ['id' => $vehicleId]]);
    } else {
        throw new Exception("Failed to create vehicle: " . $conn->error);
    }
}

function handlePutRequest($conn, $userId, $userRole) {
    $requestBody = file_get_contents('php://input');
    $data = json_decode($requestBody, true);
    
    if (!$data || !isset($data['id'])) {
        sendJsonResponse(['error' => 'Vehicle ID required'], 400);
        return;
    }
    
    $vehicleId = intval($data['id']);
    
    // Check ownership permissions
    $stmt = $conn->prepare("SELECT owner_admin_id FROM vehicles WHERE id = ?");
    $stmt->bind_param("i", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vehicle = $result->fetch_assoc();
    
    if (!$vehicle) {
        sendJsonResponse(['error' => 'Vehicle not found'], 404);
        return;
    }
    
    // Check access permissions
    if ($userRole !== 'super_admin' && $userId !== intval($vehicle['owner_admin_id'])) {
        sendJsonResponse(['error' => 'Access denied'], 403);
        return;
    }
    
    $stmt = $conn->prepare("
        UPDATE vehicles SET
            vehicle_number = ?, vehicle_type = ?, model = ?, make = ?, year = ?,
            seating_capacity = ?, fuel_type = ?, ac_type = ?, status = ?,
            image_url = ?, features = ?, updated_at = NOW()
        WHERE id = ?
    ");
    
    $features = json_encode($data['features'] ?? []);
    
    $stmt->bind_param(
        "ssssiiisssi",
        $data['vehicleNumber'],
        $data['vehicleType'],
        $data['model'],
        $data['make'],
        $data['year'],
        $data['seatingCapacity'],
        $data['fuelType'],
        $data['acType'],
        $data['status'],
        $data['imageUrl'],
        $features,
        $vehicleId
    );
    
    if ($stmt->execute()) {
        sendJsonResponse(['success' => true, 'message' => 'Vehicle updated successfully']);
    } else {
        throw new Exception("Failed to update vehicle: " . $conn->error);
    }
}

function handleDeleteRequest($conn, $userId, $userRole) {
    if (!isset($_GET['id'])) {
        sendJsonResponse(['error' => 'Vehicle ID required'], 400);
        return;
    }
    
    $vehicleId = intval($_GET['id']);
    
    // Check ownership permissions
    $stmt = $conn->prepare("SELECT owner_admin_id FROM vehicles WHERE id = ?");
    $stmt->bind_param("i", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $vehicle = $result->fetch_assoc();
    
    if (!$vehicle) {
        sendJsonResponse(['error' => 'Vehicle not found'], 404);
        return;
    }
    
    // Check access permissions
    if ($userRole !== 'super_admin' && $userId !== intval($vehicle['owner_admin_id'])) {
        sendJsonResponse(['error' => 'Access denied'], 403);
        return;
    }
    
    $stmt = $conn->prepare("DELETE FROM vehicles WHERE id = ?");
    $stmt->bind_param("i", $vehicleId);
    
    if ($stmt->execute()) {
        sendJsonResponse(['success' => true, 'message' => 'Vehicle deleted successfully']);
    } else {
        throw new Exception("Failed to delete vehicle: " . $conn->error);
    }
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
?>