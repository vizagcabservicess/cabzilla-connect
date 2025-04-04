
<?php
/**
 * Migrate database credentials
 * This script attempts to connect to the database with multiple credential sets
 * to find which ones work, and updates the configuration files accordingly.
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Define log file
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}
$logFile = $logDir . '/credential_migration_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log start of migration
file_put_contents($logFile, "[$timestamp] Credential migration started\n", FILE_APPEND);

// Function to test database connection
function testConnection($host, $name, $user, $pass) {
    try {
        $conn = new mysqli($host, $user, $pass, $name);
        
        if ($conn->connect_error) {
            return [
                'success' => false,
                'error' => $conn->connect_error
            ];
        }
        
        // Test a simple query
        $versionResult = $conn->query("SELECT VERSION() as version");
        $version = null;
        
        if ($versionResult && $row = $versionResult->fetch_assoc()) {
            $version = $row['version'];
        }
        
        $conn->close();
        
        return [
            'success' => true,
            'version' => $version
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

// List of credential sets to try
$credentialSets = [
    [
        'host' => 'localhost',
        'name' => 'u644605165_db_be',
        'user' => 'u644605165_usr_be',
        'pass' => 'Vizag@1213'
    ],
    [
        'host' => 'localhost',
        'name' => 'u64460565_db_be',
        'user' => 'u64460565_usr_be',
        'pass' => 'Vizag@1213'
    ],
    [
        'host' => 'localhost',
        'name' => 'u644605165_db_be',
        'user' => 'u644605165_user_be',
        'pass' => 'Vizag@1213'
    ],
    [
        'host' => 'localhost',
        'name' => 'u64460565_db_be',
        'user' => 'u64460565_user_be',
        'pass' => 'Vizag@1213'
    ]
];

// List of config files to update
$configFiles = [
    dirname(__FILE__) . '/../../config.php',
    dirname(__FILE__) . '/../common/db_helper.php',
    dirname(__FILE__) . '/../admin/check-connection.php'
];

$results = [];
$workingCredentials = null;

// Test each set of credentials
foreach ($credentialSets as $index => $credentials) {
    $host = $credentials['host'];
    $name = $credentials['name'];
    $user = $credentials['user'];
    $pass = $credentials['pass'];
    
    file_put_contents($logFile, "[$timestamp] Testing credentials set $index: $user@$host/$name\n", FILE_APPEND);
    
    $testResult = testConnection($host, $name, $user, $pass);
    $results[$index] = $testResult;
    
    if ($testResult['success']) {
        file_put_contents($logFile, "[$timestamp] Connection successful with credentials set $index\n", FILE_APPEND);
        $workingCredentials = $credentials;
        break;
    } else {
        file_put_contents($logFile, "[$timestamp] Connection failed with credentials set $index: {$testResult['error']}\n", FILE_APPEND);
    }
}

// If we found working credentials, update config files
if ($workingCredentials) {
    $host = $workingCredentials['host'];
    $name = $workingCredentials['name'];
    $user = $workingCredentials['user'];
    $pass = $workingCredentials['pass'];
    
    file_put_contents($logFile, "[$timestamp] Found working credentials: $user@$host/$name\n", FILE_APPEND);
    
    // Update config files
    foreach ($configFiles as $file) {
        if (file_exists($file)) {
            $content = file_get_contents($file);
            
            // Replace credentials in content
            $content = preg_replace('/[\'"]u64460565_db_be[\'"]/', "'$name'", $content);
            $content = preg_replace('/[\'"]u64460565_usr_be[\'"]/', "'$user'", $content);
            $content = preg_replace('/[\'"]u64460565_user_be[\'"]/', "'$user'", $content);
            $content = preg_replace('/\$dbName\s*=\s*[\'"][^\'"]*[\'"]/', "\$dbName = '$name'", $content);
            $content = preg_replace('/\$dbUser\s*=\s*[\'"][^\'"]*[\'"]/', "\$dbUser = '$user'", $content);
            
            file_put_contents($file, $content);
            file_put_contents($logFile, "[$timestamp] Updated config file: $file\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, "[$timestamp] Config file not found: $file\n", FILE_APPEND);
        }
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Found working credentials and updated config files',
        'workingCredentials' => [
            'host' => $host,
            'name' => $name,
            'user' => $user
        ],
        'updatedFiles' => $configFiles,
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
} else {
    file_put_contents($logFile, "[$timestamp] No working credentials found\n", FILE_APPEND);
    
    echo json_encode([
        'status' => 'error',
        'message' => 'No working credentials found',
        'results' => $results,
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
}
