
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database configuration
$host = getenv('DB_HOST') ?: 'localhost';
$dbname = getenv('DB_NAME') ?: 'u544905165_db_be';
$username = getenv('DB_USER') ?: 'u544905165_root_be';
$password = getenv('DB_PASSWORD') ?: 'Root@2024';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// Create table if it doesn't exist
$createTableSQL = "
CREATE TABLE IF NOT EXISTS vehicle_gallery (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vehicle_id (vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
";

try {
    $pdo->exec($createTableSQL);
} catch (PDOException $e) {
    error_log("Error creating vehicle_gallery table: " . $e->getMessage());
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'get' && isset($_GET['vehicle_id'])) {
            $vehicleId = $_GET['vehicle_id'];
            
            try {
                $stmt = $pdo->prepare("SELECT * FROM vehicle_gallery WHERE vehicle_id = ? ORDER BY created_at ASC");
                $stmt->execute([$vehicleId]);
                $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'status' => 'success',
                    'data' => $images
                ]);
            } catch (PDOException $e) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Error fetching gallery images: ' . $e->getMessage()
                ]);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
        }
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        
        if ($input['action'] === 'add') {
            $vehicleId = $input['vehicle_id'] ?? '';
            $url = $input['url'] ?? '';
            $altText = $input['alt_text'] ?? '';
            $caption = $input['caption'] ?? '';
            
            if (empty($vehicleId) || empty($url)) {
                echo json_encode(['status' => 'error', 'message' => 'Vehicle ID and URL are required']);
                break;
            }
            
            try {
                $stmt = $pdo->prepare("INSERT INTO vehicle_gallery (vehicle_id, url, alt_text, caption) VALUES (?, ?, ?, ?)");
                $stmt->execute([$vehicleId, $url, $altText, $caption]);
                
                $imageId = $pdo->lastInsertId();
                
                // Fetch the inserted record
                $stmt = $pdo->prepare("SELECT * FROM vehicle_gallery WHERE id = ?");
                $stmt->execute([$imageId]);
                $image = $stmt->fetch(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'status' => 'success',
                    'data' => $image
                ]);
            } catch (PDOException $e) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Error adding image: ' . $e->getMessage()
                ]);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        }
        break;
        
    case 'DELETE':
        if ($action === 'delete' && isset($_GET['id'])) {
            $imageId = $_GET['id'];
            
            try {
                $stmt = $pdo->prepare("DELETE FROM vehicle_gallery WHERE id = ?");
                $stmt->execute([$imageId]);
                
                if ($stmt->rowCount() > 0) {
                    echo json_encode(['status' => 'success', 'message' => 'Image deleted successfully']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Image not found']);
                }
            } catch (PDOException $e) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Error deleting image: ' . $e->getMessage()
                ]);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
        }
        break;
        
    default:
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
        break;
}
?>
