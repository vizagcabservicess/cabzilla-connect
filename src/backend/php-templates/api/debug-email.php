<?php
// Debug email functionality for production
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/utils/mailer.php';
require_once __DIR__ . '/utils/email-templates.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Log function for debugging
function debugLog($message, $data = []) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/debug_email_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
}

// Test data
$testRequest = [
    'id' => 999,
    'name' => 'Debug Test User',
    'phone' => '9876543210',
    'email' => 'debug@example.com',
    'service_type' => 'Local',
    'duration' => '1 Day',
    'requirements' => 'Debug test requirements',
    'status' => 'pending',
    'created_at' => date('Y-m-d H:i:s')
];

debugLog("=== EMAIL DEBUG SESSION STARTED ===");

try {
    // Step 1: Test email template generation
    debugLog("Step 1: Testing email template generation");
    $adminEmailHtml = generateDriverHireAdminEmail($testRequest);
    $customerEmailHtml = generateDriverHireCustomerEmail($testRequest);
    debugLog("Email templates generated successfully", [
        'admin_template_length' => strlen($adminEmailHtml),
        'customer_template_length' => strlen($customerEmailHtml)
    ]);
    
    // Step 2: Test basic mail() function
    debugLog("Step 2: Testing basic mail() function");
    $basicHeaders = "From: Vizag Taxi Hub <info@vizagtaxihub.com>\r\n";
    $basicHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    $basicMailResult = @mail(
        'info@vizagtaxihub.com', 
        'Debug Test - Basic Mail', 
        '<h1>Test Email</h1><p>This is a basic mail() test.</p>', 
        $basicHeaders
    );
    
    debugLog("Basic mail() result", ['success' => $basicMailResult]);
    
    // Step 3: Test sendEmailAllMethods function
    debugLog("Step 3: Testing sendEmailAllMethods function");
    $emailSent = sendEmailAllMethods(
        'info@vizagtaxihub.com', 
        'Debug Test - Driver Hire Request', 
        $adminEmailHtml
    );
    
    debugLog("sendEmailAllMethods result", ['success' => $emailSent]);
    
    // Step 4: Check PHP configuration
    debugLog("Step 4: Checking PHP configuration");
    $phpConfig = [
        'php_version' => phpversion(),
        'mail_function_exists' => function_exists('mail'),
        'fsockopen_exists' => function_exists('fsockopen'),
        'stream_socket_client_exists' => function_exists('stream_socket_client'),
        'sendmail_path' => ini_get('sendmail_path'),
        'smtp_host' => ini_get('SMTP'),
        'smtp_port' => ini_get('smtp_port'),
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time')
    ];
    
    debugLog("PHP configuration", $phpConfig);
    
    // Step 5: Check if logs directory is writable
    debugLog("Step 5: Checking file permissions");
    $logDir = __DIR__ . '/../logs';
    $permissions = [
        'logs_dir_exists' => file_exists($logDir),
        'logs_dir_writable' => is_writable($logDir),
        'current_dir_writable' => is_writable(__DIR__)
    ];
    
    debugLog("File permissions", $permissions);
    
    // Return results
    $results = [
        'status' => 'success',
        'message' => 'Debug completed successfully',
        'results' => [
            'templates_generated' => true,
            'basic_mail_result' => $basicMailResult,
            'sendEmailAllMethods_result' => $emailSent,
            'php_config' => $phpConfig,
            'permissions' => $permissions
        ]
    ];
    
    debugLog("Debug session completed", $results);
    sendJsonResponse($results);
    
} catch (Exception $e) {
    debugLog("ERROR in debug session", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
}
?>



