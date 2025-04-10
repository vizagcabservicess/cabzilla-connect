
<?php
// Critical debugging for test endpoint
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// CORS headers first to ensure proper handling of preflight requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Disable output buffering completely - critical to prevent HTML contamination
while (ob_get_level()) ob_end_clean();

// Include utilities - adapt paths as needed for your server
if (file_exists(__DIR__ . '/utils/mailer.php')) {
    require_once __DIR__ . '/utils/mailer.php';
} else {
    error_log("ERROR: mailer.php not found at: " . __DIR__ . '/utils/mailer.php');
}

if (file_exists(__DIR__ . '/utils/email.php')) {
    require_once __DIR__ . '/utils/email.php';
} else {
    error_log("ERROR: email.php not found at: " . __DIR__ . '/utils/email.php');
}

// Function to log test email events
function logTestEmail($message, $data = []) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/test_email_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry); // Also log to PHP error log
}

// Function to send JSON response with proper headers - SIMPLIFIED FOR RELIABILITY
function sendTestEmailResponse($data, $statusCode = 200) {
    // Clean any previous output
    while (ob_get_level()) ob_end_clean();
    
    // Set status code
    http_response_code($statusCode);
    
    // Set content type again to ensure it's not overwritten
    header('Content-Type: application/json');
    
    // Output JSON response - direct approach
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit; // Exit immediately
}

// Log the start of the test
logTestEmail("Email test started", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'query' => $_SERVER['QUERY_STRING'] ?? '',
    'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
]);

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Preflight OK']);
    exit;
}

// Get the test email address
$testEmail = $_GET['email'] ?? '';
if (empty($testEmail)) {
    logTestEmail("No test email provided");
    sendTestEmailResponse([
        'status' => 'error',
        'message' => 'Missing email parameter. Use ?email=your@email.com'
    ], 400);
}

// Log the test parameters
logTestEmail("Testing email delivery", [
    'to' => $testEmail,
    'php_version' => phpversion(),
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
]);

// Prepare test email content
$subject = "Email Test from Vizag Taxi Hub";
$timestamp = date('Y-m-d H:i:s');
$serverSoftware = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown';
$phpVersion = phpversion();

$htmlBody = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Test</title>
</head>
<body>
    <h1>Email Delivery Test</h1>
    <p>This is a test email to verify that your server can successfully send emails.</p>
    <p>Timestamp: {$timestamp}</p>
    <p>Server: {$serverSoftware}</p>
    <p>PHP Version: {$phpVersion}</p>
    <hr>
    <p>If you received this email, it means your email configuration is working!</p>
</body>
</html>
HTML;

// Track results for each method
$results = [
    'methods_tried' => [],
    'successful_methods' => [],
    'failed_methods' => []
];

// 1. Try PHPMailer if available
if (function_exists('sendEmailWithPHPMailer')) {
    logTestEmail("Trying PHPMailer", ['to' => $testEmail]);
    $start = microtime(true);
    try {
        $success = sendEmailWithPHPMailer($testEmail, $subject, $htmlBody);
        $duration = round((microtime(true) - $start) * 1000); // in ms
        
        $results['methods_tried'][] = 'PHPMailer';
        if ($success) {
            $results['successful_methods'][] = [
                'method' => 'PHPMailer',
                'duration_ms' => $duration
            ];
        } else {
            $results['failed_methods'][] = [
                'method' => 'PHPMailer',
                'duration_ms' => $duration
            ];
        }
        
        logTestEmail("PHPMailer result", [
            'success' => $success ? 'yes' : 'no',
            'duration_ms' => $duration
        ]);
    } catch (Exception $e) {
        $results['failed_methods'][] = [
            'method' => 'PHPMailer',
            'error' => $e->getMessage()
        ];
        logTestEmail("PHPMailer exception", ['error' => $e->getMessage()]);
    }
}

// 2. Try sendEmailAllMethods if available
if (function_exists('sendEmailAllMethods')) {
    logTestEmail("Trying sendEmailAllMethods", ['to' => $testEmail]);
    $start = microtime(true);
    try {
        $success = sendEmailAllMethods($testEmail, $subject, $htmlBody);
        $duration = round((microtime(true) - $start) * 1000); // in ms
        
        $results['methods_tried'][] = 'sendEmailAllMethods';
        if ($success) {
            $results['successful_methods'][] = [
                'method' => 'sendEmailAllMethods',
                'duration_ms' => $duration
            ];
        } else {
            $results['failed_methods'][] = [
                'method' => 'sendEmailAllMethods',
                'duration_ms' => $duration
            ];
        }
        
        logTestEmail("sendEmailAllMethods result", [
            'success' => $success ? 'yes' : 'no',
            'duration_ms' => $duration
        ]);
    } catch (Exception $e) {
        $results['failed_methods'][] = [
            'method' => 'sendEmailAllMethods',
            'error' => $e->getMessage()
        ];
        logTestEmail("sendEmailAllMethods exception", ['error' => $e->getMessage()]);
    }
}

// 3. Try native PHP mail() function
logTestEmail("Trying native PHP mail()", ['to' => $testEmail]);
$start = microtime(true);

// Basic email headers
$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
$headers .= 'From: info@vizagtaxihub.com' . "\r\n";
$headers .= 'Reply-To: info@vizagtaxihub.com' . "\r\n";

// Get initial error state
$lastError = error_get_last();

// Try native mail function
$mailResult = @mail($testEmail, $subject, $htmlBody, $headers);
$duration = round((microtime(true) - $start) * 1000); // in ms

// Check for new errors
$newError = error_get_last();
$errorMessage = ($newError !== $lastError) ? $newError['message'] : null;

$results['methods_tried'][] = 'PHP mail()';
if ($mailResult) {
    $results['successful_methods'][] = [
        'method' => 'PHP mail()',
        'duration_ms' => $duration
    ];
} else {
    $results['failed_methods'][] = [
        'method' => 'PHP mail()',
        'duration_ms' => $duration,
        'error' => $errorMessage
    ];
}

logTestEmail("PHP mail() result", [
    'success' => $mailResult ? 'yes' : 'no',
    'duration_ms' => $duration,
    'error' => $errorMessage
]);

// 4. Try mail() with different options as a last resort
if (!$mailResult) {
    logTestEmail("Trying mail() with -f parameter", ['to' => $testEmail]);
    $start = microtime(true);
    
    // Get initial error state
    $lastError = error_get_last();
    
    // Try with fifth parameter
    $mailResult2 = @mail($testEmail, $subject . " (Method 2)", $htmlBody, $headers, "-finfo@vizagtaxihub.com");
    $duration = round((microtime(true) - $start) * 1000); // in ms
    
    // Check for new errors
    $newError = error_get_last();
    $errorMessage = ($newError !== $lastError) ? $newError['message'] : null;
    
    $results['methods_tried'][] = 'PHP mail() with -f';
    if ($mailResult2) {
        $results['successful_methods'][] = [
            'method' => 'PHP mail() with -f',
            'duration_ms' => $duration
        ];
    } else {
        $results['failed_methods'][] = [
            'method' => 'PHP mail() with -f',
            'duration_ms' => $duration,
            'error' => $errorMessage
        ];
    }
    
    logTestEmail("PHP mail() with -f result", [
        'success' => $mailResult2 ? 'yes' : 'no', 
        'duration_ms' => $duration,
        'error' => $errorMessage
    ]);
}

// Gather system information for debugging
$systemInfo = [
    'php_version' => phpversion(),
    'mail_function_exists' => function_exists('mail'),
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'server_os' => PHP_OS,
    'mail_configuration' => [
        'sendmail_path' => ini_get('sendmail_path'),
        'smtp' => ini_get('SMTP'),
        'smtp_port' => ini_get('smtp_port')
    ]
];

// Determine overall success
$anySuccess = !empty($results['successful_methods']);

// Send the response
logTestEmail("Email test completed", [
    'overall_success' => $anySuccess ? 'yes' : 'no',
    'methods_succeeded' => count($results['successful_methods']),
    'methods_failed' => count($results['failed_methods'])
]);

// CRITICAL FIX - Force simple clean JSON response
header('Content-Type: application/json');
echo json_encode([
    'status' => $anySuccess ? 'success' : 'error',
    'message' => $anySuccess ? 
                'Email sent successfully using at least one method' : 
                'All email sending methods failed',
    'results' => $results,
    'system_info' => $systemInfo,
    'timestamp' => date('Y-m-d H:i:s')
]);
exit;
