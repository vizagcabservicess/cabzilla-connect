
<?php
/**
 * direct-check-connection.php - Direct database connectivity check
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logs directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Function to log debug info
function logDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/db_connection_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

// Include the configuration file
try {
    require_once dirname(__FILE__) . '/../config.php';
    logDebug("Config file loaded successfully");
} catch (Exception $e) {
    logDebug("Error loading config file: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'connection' => false,
        'message' => 'Failed to load configuration: ' . $e->getMessage(),
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
    exit;
}

try {
    // Try to connect to database with the configured credentials
    logDebug("Attempting database connection");
    
    if (!function_exists('getDbConnection')) {
        logDebug("getDbConnection function not found");
        echo json_encode([
            'status' => 'error',
            'connection' => false,
            'message' => 'Database connection function not found',
            'timestamp' => time()
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    $conn = getDbConnection();

    if (!$conn) {
        logDebug("Connection failed");
        echo json_encode([
            'status' => 'error',
            'connection' => false,
            'message' => 'Failed to connect to database',
            'timestamp' => time()
        ], JSON_PRETTY_PRINT);
        exit;
    }

    // Get database version information
    logDebug("Checking database version");
    $versionResult = $conn->query("SELECT VERSION() as version");
    $version = "";
    
    if ($versionResult && $row = $versionResult->fetch_assoc()) {
        $version = $row['version'];
        logDebug("Database version: " . $version);
    } else {
        logDebug("Could not retrieve database version");
    }

    // Close the connection
    $conn->close();
    logDebug("Connection test successful");

    echo json_encode([
        'status' => 'success',
        'connection' => true,
        'message' => 'Database connection successful',
        'version' => $version,
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    logDebug("Connection error: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'connection' => false,
        'message' => $e->getMessage(),
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
}
