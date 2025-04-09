
<?php
// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// If this is a preflight OPTIONS request, return early
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include mailer utility
require_once __DIR__ . '/utils/mailer.php';

// Function to log results
function logTestEmail($message, $data = []) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/email_test_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry); // Also log to PHP error log
}

try {
    $receiverEmail = isset($_GET['email']) ? $_GET['email'] : 'info@vizagup.com';
    
    logTestEmail("Testing email with PHPMailer", ['to' => $receiverEmail]);
    
    // Create a simple HTML test email
    $subject = "Vizag Taxi Hub - Test Email";
    $htmlBody = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 10px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Vizag Taxi Hub</h1>
        </div>
        <div class="content">
            <h2>Email System Test</h2>
            <p>This is a test email from Vizag Taxi Hub.</p>
            <p>If you're seeing this, the email system is working correctly!</p>
            <p>Time of test: {$timestamp = date('Y-m-d H:i:s')}</p>
            <p>Test ID: {$testId = uniqid()}</p>
        </div>
    </div>
</body>
</html>
HTML;
    
    // Send the test email using PHPMailer
    $result = sendEmailWithPHPMailer($receiverEmail, $subject, $htmlBody);
    
    logTestEmail("PHPMailer test result", ['success' => $result ? 'yes' : 'no']);
    
    if ($result) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Test email sent successfully to ' . $receiverEmail,
            'timestamp' => date('Y-m-d H:i:s'),
            'testId' => $testId
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to send test email',
            'details' => 'Check server logs for more information'
        ]);
    }
    
} catch (Exception $e) {
    logTestEmail("Test email exception", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Exception while sending test email: ' . $e->getMessage()
    ]);
}
