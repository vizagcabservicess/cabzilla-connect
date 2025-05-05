
<?php
/**
 * vehicle-create.php - Create a new vehicle proxy script
 * 
 * This file acts as a proxy to direct-vehicle-create.php
 */

// Set CORS headers FIRST
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}
$logFile = $logDir . '/vehicle_create_proxy_' . date('Y-m-d') . '.log';

// Clear any previous output
if (ob_get_level()) {
    ob_end_clean();
}

// Log the request for debugging
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Vehicle create proxy accessed. Method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

// If it's a POST request, get and log the raw input
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    file_put_contents($logFile, "[$timestamp] Request body: " . $rawInput . "\n", FILE_APPEND);
}

try {
    // Include the direct-vehicle-create.php file which has the full implementation
    $directFilePath = __DIR__ . '/direct-vehicle-create.php';
    if (!file_exists($directFilePath)) {
        throw new Exception("Implementation file not found: direct-vehicle-create.php");
    }
    
    file_put_contents($logFile, "[$timestamp] Including direct implementation from: $directFilePath\n", FILE_APPEND);
    
    // Instead of include/require, let's manually process the request to avoid output issues
    // This gives us more control over the response
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Forward the POST request to direct-vehicle-create.php
        $ch = curl_init('http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/direct-vehicle-create.php');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $rawInput);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-Admin-Mode: true',
            'X-Force-Refresh: true'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            file_put_contents($logFile, "[$timestamp] cURL error: $error\n", FILE_APPEND);
            // Try direct include as fallback
            require_once($directFilePath);
        } else {
            file_put_contents($logFile, "[$timestamp] Response code: $httpCode\n", FILE_APPEND);
            file_put_contents($logFile, "[$timestamp] Response: $response\n", FILE_APPEND);
            echo $response;
        }
    } else {
        // For non-POST requests, include the file directly
        require_once($directFilePath);
    }
} catch (Exception $e) {
    // If there's an error including the file, return a JSON error response
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    $response = [
        'status' => 'error',
        'message' => 'Failed to process request: ' . $e->getMessage(),
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    exit;
}
