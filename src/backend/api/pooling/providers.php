
<?php
ob_start();
set_exception_handler(function($e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unhandled exception', 'details' => $e->getMessage()]);
    exit;
});

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetProviders();
        break;
    case 'POST':
        handleCreateProvider();
        break;
    case 'PUT':
        handleUpdateProvider();
        break;
    case 'DELETE':
        handleDeleteProvider();
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleGetProviders() {
    global $pdo;
    
    $providerId = $_GET['id'] ?? null;
    $status = $_GET['status'] ?? null;
    $search = $_GET['search'] ?? '';
    
    if ($providerId) {
        // Get specific provider
        $stmt = $pdo->prepare("
            SELECT 
                p.*,
                COUNT(r.id) as total_rides,
                AVG(CASE WHEN r.status = 'completed' THEN 5 ELSE NULL END) as rating,
                GROUP_CONCAT(
                    CONCAT(d.type, ':', d.status, ':', d.uploaded_at) 
                    SEPARATOR '|'
                ) as documents
            FROM pooling_providers p
            LEFT JOIN pooling_rides r ON p.id = r.provider_id
            LEFT JOIN pooling_documents d ON p.id = d.provider_id
            WHERE p.id = ?
            GROUP BY p.id
        ");
        $stmt->execute([$providerId]);
        $provider = $stmt->fetch();
        
        if (!$provider) {
            sendError('Provider not found', 404);
        }
        
        // Parse documents
        $documents = [];
        if ($provider['documents']) {
            $docParts = explode('|', $provider['documents']);
            foreach ($docParts as $docPart) {
                $parts = explode(':', $docPart);
                if (count($parts) >= 3) {
                    $documents[] = [
                        'type' => $parts[0],
                        'status' => $parts[1],
                        'uploadedAt' => $parts[2]
                    ];
                }
            }
        }
        
        $formatted_provider = [
            'id' => (int)$provider['id'],
            'name' => $provider['name'],
            'phone' => $provider['phone'],
            'email' => $provider['email'],
            'rating' => $provider['rating'] ? (float)$provider['rating'] : 0,
            'totalRides' => (int)$provider['total_rides'],
            'verificationStatus' => $provider['verification_status'],
            'joinedDate' => $provider['created_at'],
            'documents' => $documents,
            'createdAt' => $provider['created_at'],
            'updatedAt' => $provider['updated_at']
        ];
        
        sendResponse($formatted_provider);
    } else {
        // Get all providers with filters
        $whereConditions = ['1=1'];
        $params = [];
        
        if ($status && $status !== 'all') {
            $whereConditions[] = 'p.verification_status = ?';
            $params[] = $status;
        }
        
        if ($search) {
            $whereConditions[] = '(p.name LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)';
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        $stmt = $pdo->prepare("
            SELECT 
                p.*,
                COUNT(r.id) as total_rides,
                AVG(CASE WHEN r.status = 'completed' THEN 5 ELSE NULL END) as rating
            FROM pooling_providers p
            LEFT JOIN pooling_rides r ON p.id = r.provider_id
            WHERE $whereClause
            GROUP BY p.id
            ORDER BY p.created_at DESC
        ");
        $stmt->execute($params);
        $providers = $stmt->fetchAll();
        
        $formatted_providers = array_map(function($provider) {
            return [
                'id' => (int)$provider['id'],
                'name' => $provider['name'],
                'phone' => $provider['phone'],
                'email' => $provider['email'],
                'rating' => $provider['rating'] ? (float)$provider['rating'] : 0,
                'totalRides' => (int)$provider['total_rides'],
                'verificationStatus' => $provider['verification_status'],
                'joinedDate' => $provider['created_at'],
                'documents' => [],
                'createdAt' => $provider['created_at'],
                'updatedAt' => $provider['updated_at']
            ];
        }, $providers);
        
        sendResponse($formatted_providers);
    }
}

function handleCreateProvider() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $input = sanitizeInput($input);
    
    $required_fields = ['name', 'phone', 'email'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO pooling_providers (name, phone, email, verification_status)
            VALUES (?, ?, ?, 'pending')
        ");
        $stmt->execute([
            $input['name'],
            $input['phone'],
            $input['email']
        ]);
        
        $providerId = $pdo->lastInsertId();
        
        sendResponse([
            'id' => $providerId,
            'message' => 'Provider created successfully'
        ], 201);
        
    } catch (PDOException $e) {
        error_log('Database error in create provider: ' . $e->getMessage());
        sendError('Failed to create provider', 500);
    }
}

function handleUpdateProvider() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $providerId = $input['id'] ?? null;
    
    if (!$providerId) {
        sendError('Provider ID is required');
    }
    
    try {
        $updates = [];
        $params = [];
        
        if (isset($input['verification_status'])) {
            $updates[] = "verification_status = ?";
            $params[] = $input['verification_status'];
        }
        
        if (isset($input['name'])) {
            $updates[] = "name = ?";
            $params[] = $input['name'];
        }
        
        if (isset($input['phone'])) {
            $updates[] = "phone = ?";
            $params[] = $input['phone'];
        }
        
        if (isset($input['email'])) {
            $updates[] = "email = ?";
            $params[] = $input['email'];
        }
        
        if (empty($updates)) {
            sendError('No fields to update');
        }
        
        $params[] = $providerId;
        $sql = "UPDATE pooling_providers SET " . implode(', ', $updates) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        sendResponse(['message' => 'Provider updated successfully']);
        
    } catch (PDOException $e) {
        error_log('Database error in update provider: ' . $e->getMessage());
        sendError('Failed to update provider', 500);
    }
}

function handleDeleteProvider() {
    global $pdo;

    $input = json_decode(file_get_contents('php://input'), true);
    $providerId = $input['id'] ?? null;

    if (!$providerId) {
        sendError('Provider ID is required for deletion');
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM pooling_providers WHERE id = ?");
        $stmt->execute([$providerId]);

        if ($stmt->rowCount() === 0) {
            sendError('Provider not found or already deleted', 404);
        }

        sendResponse(['message' => 'Provider deleted successfully']);
    } catch (PDOException $e) {
        error_log('Database error in delete provider: ' . $e->getMessage());
        sendError('Failed to delete provider', 500);
    }
}
?>
