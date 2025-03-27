
<?php
// This is a redirection script for compatibility with old URLs
// It redirects to the admin/local-fares-update.php file

// Include necessary headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log request details
$timestamp = date('Y-m-d H:i:s');
$requestData = file_get_contents('php://input');
error_log("[$timestamp] Direct local fare update request received at root endpoint: Method=" . $_SERVER['REQUEST_METHOD'], 3, $logDir . '/direct-fares.log');
error_log("[$timestamp] POST data: " . print_r($_POST, true), 3, $logDir . '/direct-fares.log');
error_log("[$timestamp] Raw input: $requestData", 3, $logDir . '/direct-fares.log');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// For direct local fare updates, we need to forward the POST data
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'GET') {
    // Log that we're about to redirect
    error_log("[$timestamp] Attempting to redirect to admin/local-fares-update.php", 3, $logDir . '/direct-fares.log');

    // Try using our simplified local-fares-update.php script (most reliable)
    $simpleScript = __DIR__ . '/admin/local-fares-update.php';
    if (file_exists($simpleScript)) {
        error_log("[$timestamp] Using simplified local-fares-update.php script", 3, $logDir . '/direct-fares.log');
        
        // Set headers for JSON response
        header('Content-Type: application/json');
        
        // Forward all POST data and execute the simple script
        $_REQUEST = array_merge($_GET, $_POST);
        
        // Try to parse JSON input if present
        if (!empty($requestData)) {
            $jsonData = json_decode($requestData, true);
            if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
                // Merge JSON data into $_REQUEST
                $_REQUEST = array_merge($_REQUEST, $jsonData);
                error_log("[$timestamp] Parsed and merged JSON data: " . print_r($jsonData, true), 3, $logDir . '/direct-fares.log');
            } else {
                // Try parsing as form data
                parse_str($requestData, $formData);
                if (!empty($formData)) {
                    $_REQUEST = array_merge($_REQUEST, $formData);
                    error_log("[$timestamp] Parsed and merged form data: " . print_r($formData, true), 3, $logDir . '/direct-fares.log');
                }
            }
        }
        
        // Include the simple script
        require_once $simpleScript;
        exit;
    }
    
    // If simple script not found, try admin/direct-local-fares.php
    $targetScript = __DIR__ . '/admin/direct-local-fares.php';
    
    // Check if the target script exists
    if (file_exists($targetScript)) {
        // Log the redirection
        error_log("[$timestamp] Redirecting to admin/direct-local-fares.php", 3, $logDir . '/direct-fares.log');
        
        // Forward all POST data and execute the target script
        $_REQUEST = array_merge($_GET, $_POST);
        
        // Try to parse JSON input if present
        if (!empty($requestData)) {
            $jsonData = json_decode($requestData, true);
            if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
                // Merge JSON data into $_REQUEST
                $_REQUEST = array_merge($_REQUEST, $jsonData);
                error_log("[$timestamp] Parsed and merged JSON data: " . print_r($jsonData, true), 3, $logDir . '/direct-fares.log');
            }
        }
        
        // Include the target script
        require_once $targetScript;
        exit;
    } else {
        // Try alternative path
        $alternativePath = dirname(__DIR__) . '/api/admin/direct-local-fares.php';
        
        if (file_exists($alternativePath)) {
            error_log("[$timestamp] Redirecting to alternative path: " . $alternativePath, 3, $logDir . '/direct-fares.log');
            
            // Forward all POST data
            $_REQUEST = array_merge($_GET, $_POST);
            
            // Try to parse JSON input if present
            if (!empty($requestData)) {
                $jsonData = json_decode($requestData, true);
                if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
                    // Merge JSON data into $_REQUEST
                    $_REQUEST = array_merge($_REQUEST, $jsonData);
                    error_log("[$timestamp] Parsed and merged JSON data: " . print_r($jsonData, true), 3, $logDir . '/direct-fares.log');
                }
            }
            
            // Include the alternative target script
            require_once $alternativePath;
            exit;
        } else {
            // Try direct fare update as a last resort
            $fareUpdateScript = __DIR__ . '/admin/direct-fare-update.php';
            if (file_exists($fareUpdateScript)) {
                error_log("[$timestamp] Redirecting to general direct-fare-update.php with tripType=local", 3, $logDir . '/local-fares.log');
                
                // Set tripType to local
                $_REQUEST = array_merge($_GET, $_POST, ['tripType' => 'local']);
                
                // Include the fare update script
                require_once $fareUpdateScript;
                exit;
            }
            
            // No target script found
            error_log("[$timestamp] ERROR: No target script found for local fare updates", 3, $logDir . '/direct-fares.log');
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Target script for local fare updates not found',
                'paths_checked' => [
                    'simple' => $simpleScript,
                    'primary' => $targetScript,
                    'alternative' => $alternativePath,
                    'fallback' => $fareUpdateScript
                ]
            ]);
        }
    }
} else {
    // Method not allowed
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST for direct local fare updates.'
    ]);
}
