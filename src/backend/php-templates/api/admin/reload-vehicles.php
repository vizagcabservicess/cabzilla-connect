
<?php
/**
 * reload-vehicles.php - Force reload vehicles from persistent storage
 * This script helps to ensure that cached vehicle data is refreshed from the persistent storage
 */

// Set headers for CORS and caching prevention
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Force-Refresh, Cache-Control');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Create cache directory if it doesn't exist
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Function to log messages to a file
function logMessage($message) {
    global $logDir;
    $logFile = $logDir . '/vehicle-reload-' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Log the request
logMessage("Vehicle reload request received");

try {
    // The persistent cache file path - this is our SOURCE OF TRUTH
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    
    // Check if persistent file exists
    if (!file_exists($persistentCacheFile)) {
        logMessage("ERROR: Persistent cache file not found at $persistentCacheFile");
        echo json_encode([
            'status' => 'error',
            'message' => 'Persistent cache file not found',
            'timestamp' => time(),
            'cacheDir' => $cacheDir
        ]);
        exit;
    }
    
    // Load the persistent data - using direct file path for reliability
    $persistentJson = file_get_contents($persistentCacheFile);
    if (!$persistentJson) {
        logMessage("ERROR: Failed to read persistent cache file at $persistentCacheFile");
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to read persistent cache file',
            'timestamp' => time(),
            'persistentFile' => $persistentCacheFile
        ]);
        exit;
    }
    
    // Parse the persistent data
    $persistentData = json_decode($persistentJson, true);
    if (!is_array($persistentData)) {
        logMessage("ERROR: Invalid JSON in persistent cache file: " . substr($persistentJson, 0, 100) . "...");
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid JSON in persistent cache file',
            'timestamp' => time(),
            'jsonError' => json_last_error_msg()
        ]);
        exit;
    }
    
    // Count the vehicles
    $vehicleCount = count($persistentData);
    logMessage("Loaded $vehicleCount vehicles from persistent cache");
    
    // Clear all other cache files EXCEPT the persistent one
    $cacheFiles = glob($cacheDir . '/vehicles_*.json');
    $cleared = 0;
    foreach ($cacheFiles as $file) {
        // Don't delete the persistent file itself
        if ($file !== $persistentCacheFile) {
            if (@unlink($file)) {
                logMessage("Cleared cache file: " . basename($file));
                $cleared++;
            } else {
                logMessage("Failed to clear cache file: " . basename($file));
            }
        }
    }
    
    // Create timestamp-based cache files to ensure fresh data
    $currentTime = time();
    $tempCacheFile = $cacheDir . '/vehicles_' . $currentTime . '.json';
    $jsonOptions = defined('JSON_PRETTY_PRINT') ? JSON_PRETTY_PRINT : 0;
    
    // Make a copy of the persistent data to ensure it's properly loaded
    $result = file_put_contents($tempCacheFile, json_encode($persistentData, $jsonOptions));
    
    if ($result === false) {
        logMessage("ERROR: Failed to write temp cache file to $tempCacheFile");
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to write temp cache file',
            'timestamp' => time(),
            'tempFile' => $tempCacheFile
        ]);
        exit;
    }
    
    logMessage("Successfully reloaded $vehicleCount vehicles, cleared $cleared cache files, and created new cache at " . basename($tempCacheFile));
    
    // Return success response with detailed information
    echo json_encode([
        'status' => 'success',
        'message' => "Successfully reloaded vehicles from persistent storage",
        'count' => $vehicleCount,
        'cleared' => $cleared,
        'persistentFile' => basename($persistentCacheFile),
        'newCacheFile' => basename($tempCacheFile),
        'timestamp' => $currentTime
    ]);
    
} catch (Exception $e) {
    logMessage("ERROR: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
