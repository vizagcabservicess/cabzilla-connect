
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Create cache directory
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Function to log debug info
function logDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/vehicle_delete_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if request method is valid
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    logDebug("Invalid method: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST or DELETE'
    ]);
    exit;
}

// Load database configuration
require_once '../../config.php';

try {
    // Get vehicle ID from request
    $vehicleId = null;
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // For DELETE, check query params
        $vehicleId = $_GET['id'] ?? null;
    } else {
        // For POST, check JSON body or POST data
        $inputData = file_get_contents('php://input');
        $vehicleData = json_decode($inputData, true);
        
        if (!$vehicleData && !empty($_POST)) {
            $vehicleData = $_POST;
        }
        
        $vehicleId = $vehicleData['id'] ?? $vehicleData['vehicleId'] ?? $_GET['id'] ?? null;
    }
    
    if (!$vehicleId) {
        logDebug("Missing vehicle ID");
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Vehicle ID is required'
        ]);
        exit;
    }
    
    logDebug("Processing delete request for vehicle ID: $vehicleId");
    
    // Connect to database
    $conn = getDbConnection();
    
    // Check if vehicle exists
    $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id = ?");
    $checkStmt->bind_param("s", $vehicleId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['count'] === 0) {
        logDebug("Vehicle not found in database");
        
        // Check if it exists in persistent cache
        $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
        $persistentData = [];
        $foundInCache = false;
        
        if (file_exists($persistentCacheFile)) {
            $persistentJson = file_get_contents($persistentCacheFile);
            if ($persistentJson) {
                $persistentData = json_decode($persistentJson, true) ?: [];
                
                foreach ($persistentData as $index => $vehicle) {
                    if ((isset($vehicle['id']) && $vehicle['id'] === $vehicleId) || 
                        (isset($vehicle['vehicleId']) && $vehicle['vehicleId'] === $vehicleId)) {
                        $foundInCache = true;
                        break;
                    }
                }
            }
        }
        
        if (!$foundInCache) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => "Vehicle with ID $vehicleId not found"
            ]);
            exit;
        }
    }
    
    // Delete from database
    $deleteStmt = $conn->prepare("DELETE FROM vehicles WHERE vehicle_id = ?");
    $deleteStmt->bind_param("s", $vehicleId);
    
    if (!$deleteStmt->execute()) {
        logDebug("Failed to delete from database: " . $deleteStmt->error);
        throw new Exception("Failed to delete from database: " . $deleteStmt->error);
    }
    
    logDebug("Vehicle deleted from database");
    
    // Update persistent cache
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    $persistentData = [];
    
    // Load existing cache if it exists
    if (file_exists($persistentCacheFile)) {
        $persistentJson = file_get_contents($persistentCacheFile);
        if ($persistentJson) {
            $persistentData = json_decode($persistentJson, true) ?: [];
        }
    }
    
    // Remove vehicle from persistent data
    $updatedData = [];
    foreach ($persistentData as $vehicle) {
        if ((isset($vehicle['id']) && $vehicle['id'] !== $vehicleId) && 
            (isset($vehicle['vehicleId']) && $vehicle['vehicleId'] !== $vehicleId)) {
            $updatedData[] = $vehicle;
        }
    }
    
    // Save back to persistent cache
    if (file_put_contents($persistentCacheFile, json_encode($updatedData, JSON_PRETTY_PRINT))) {
        logDebug("Updated persistent cache file, removed vehicle from cache");
    } else {
        logDebug("Failed to update persistent cache file");
    }
    
    // Clear other cache files
    $cacheFiles = glob($cacheDir . '/vehicles_*.json');
    foreach ($cacheFiles as $file) {
        if ($file !== $persistentCacheFile && !strpos($file, 'persistent_backup')) {
            unlink($file);
            logDebug("Cleared cache file: " . basename($file));
        }
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => "Vehicle with ID $vehicleId deleted successfully",
        'vehicleId' => $vehicleId
    ]);
    
} catch (Exception $e) {
    logDebug("Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
