
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database connection
$servername = "localhost";
$username = "u644605165_admin";
$password = "Vizag@123";
$dbname = "u644605165_db_be";

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Get gallery images for a vehicle
    $vehicle_id = $_GET['vehicle_id'] ?? '';
    
    if (empty($vehicle_id)) {
        echo json_encode(['success' => false, 'message' => 'Vehicle ID is required']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id, vehicle_id, url, alt, caption, created_at FROM vehicle_gallery WHERE vehicle_id = ? ORDER BY created_at ASC");
        $stmt->execute([$vehicle_id]);
        $gallery = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'gallery' => $gallery]);
    } catch(PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error fetching gallery: ' . $e->getMessage()]);
    }
    
} elseif ($method === 'POST') {
    // Handle different actions
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'add':
            $vehicle_id = $input['vehicle_id'] ?? '';
            $url = $input['url'] ?? '';
            $alt = $input['alt'] ?? '';
            $caption = $input['caption'] ?? '';
            
            if (empty($vehicle_id) || empty($url)) {
                echo json_encode(['success' => false, 'message' => 'Vehicle ID and URL are required']);
                exit;
            }
            
            try {
                $stmt = $pdo->prepare("INSERT INTO vehicle_gallery (vehicle_id, url, alt, caption, created_at) VALUES (?, ?, ?, ?, NOW())");
                $result = $stmt->execute([$vehicle_id, $url, $alt, $caption]);
                
                if ($result) {
                    echo json_encode(['success' => true, 'message' => 'Image added successfully', 'id' => $pdo->lastInsertId()]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to add image']);
                }
            } catch(PDOException $e) {
                echo json_encode(['success' => false, 'message' => 'Error adding image: ' . $e->getMessage()]);
            }
            break;
            
        case 'update':
            $id = $input['id'] ?? '';
            $alt = $input['alt'] ?? '';
            $caption = $input['caption'] ?? '';
            
            if (empty($id)) {
                echo json_encode(['success' => false, 'message' => 'Image ID is required']);
                exit;
            }
            
            try {
                $stmt = $pdo->prepare("UPDATE vehicle_gallery SET alt = ?, caption = ? WHERE id = ?");
                $result = $stmt->execute([$alt, $caption, $id]);
                
                if ($result) {
                    echo json_encode(['success' => true, 'message' => 'Image updated successfully']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to update image']);
                }
            } catch(PDOException $e) {
                echo json_encode(['success' => false, 'message' => 'Error updating image: ' . $e->getMessage()]);
            }
            break;
            
        case 'delete':
            $id = $input['id'] ?? '';
            
            if (empty($id)) {
                echo json_encode(['success' => false, 'message' => 'Image ID is required']);
                exit;
            }
            
            try {
                $stmt = $pdo->prepare("DELETE FROM vehicle_gallery WHERE id = ?");
                $result = $stmt->execute([$id]);
                
                if ($result) {
                    echo json_encode(['success' => true, 'message' => 'Image deleted successfully']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to delete image']);
                }
            } catch(PDOException $e) {
                echo json_encode(['success' => false, 'message' => 'Error deleting image: ' . $e->getMessage()]);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
