<?php
// Simple email test endpoint
require_once __DIR__ . '/../config.php';

// Override with correct credentials
define('SMTP_USERNAME', 'info@vizagtaxihub.com');
define('SMTP_PASSWORD', 'James!5549');
define('SMTP_HOST', 'smtp.hostinger.com');
define('SMTP_PORT', 465);
define('SMTP_SECURE', 'ssl');

require_once __DIR__ . '/utils/mailer.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Simple test email
$to = 'info@vizagtaxihub.com';
$subject = 'Test Email from Vizag Taxi Hub';
$message = '<h1>Test Email</h1><p>This is a test email to verify email functionality is working.</p><p>Time: ' . date('Y-m-d H:i:s') . '</p>';

// Try to send email
$result = sendEmailAllMethods($to, $subject, $message);

if ($result) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Test email sent successfully!',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to send test email',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
