<?php
// Test SMTP connection and authentication
require_once __DIR__ . '/../config.php';

// Override with correct credentials
define('SMTP_USERNAME', 'info@vizagtaxihub.com');
define('SMTP_PASSWORD', 'James!5549');
define('SMTP_HOST', 'smtp.hostinger.com');
define('SMTP_PORT', 465);
define('SMTP_SECURE', 'ssl');

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Test SMTP connection
function testSMTPConnection() {
    $results = [];
    
    // Test 1: Basic connection test
    $results['connection_test'] = [];
    
    if (function_exists('stream_socket_client')) {
        try {
            $context = stream_context_create([
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ]
            ]);
            
            $socket = @stream_socket_client(
                "ssl://" . SMTP_HOST . ":" . SMTP_PORT,
                $errno,
                $errstr,
                10,
                STREAM_CLIENT_CONNECT,
                $context
            );
            
            if ($socket) {
                $results['connection_test']['status'] = 'SUCCESS';
                $results['connection_test']['message'] = 'Connected to SMTP server';
                
                // Read greeting
                $response = fgets($socket, 515);
                $results['connection_test']['greeting'] = trim($response);
                
                // Test EHLO
                fputs($socket, "EHLO vizagtaxihub.com\r\n");
                $response = fgets($socket, 515);
                $results['connection_test']['ehlo_response'] = trim($response);
                
                // Test AUTH LOGIN
                fputs($socket, "AUTH LOGIN\r\n");
                $response = fgets($socket, 515);
                $results['connection_test']['auth_response'] = trim($response);
                
                // Test username
                fputs($socket, base64_encode(SMTP_USERNAME) . "\r\n");
                $response = fgets($socket, 515);
                $results['connection_test']['username_response'] = trim($response);
                
                // Test password (don't log the actual response for security)
                fputs($socket, base64_encode(SMTP_PASSWORD) . "\r\n");
                $response = fgets($socket, 515);
                $results['connection_test']['password_response_code'] = substr($response, 0, 3);
                $results['connection_test']['password_response'] = trim($response);
                
                fputs($socket, "QUIT\r\n");
                fclose($socket);
                
            } else {
                $results['connection_test']['status'] = 'FAILED';
                $results['connection_test']['error'] = "Connection failed: $errstr ($errno)";
            }
        } catch (Exception $e) {
            $results['connection_test']['status'] = 'ERROR';
            $results['connection_test']['error'] = $e->getMessage();
        }
    } else {
        $results['connection_test']['status'] = 'SKIPPED';
        $results['connection_test']['message'] = 'stream_socket_client not available';
    }
    
    // Test 2: Basic mail() function test
    $results['mail_function_test'] = [];
    
    if (function_exists('mail')) {
        try {
            ini_set('sendmail_from', SMTP_USERNAME);
            
            $headers = "From: Vizag Taxi Hub <" . SMTP_USERNAME . ">\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            
            $success = @mail(
                'info@vizagtaxihub.com',
                'SMTP Test - ' . date('Y-m-d H:i:s'),
                '<h1>SMTP Test</h1><p>This is a test email.</p>',
                $headers
            );
            
            $results['mail_function_test']['status'] = $success ? 'SUCCESS' : 'FAILED';
            $results['mail_function_test']['message'] = $success ? 'mail() function returned true' : 'mail() function returned false';
            
        } catch (Exception $e) {
            $results['mail_function_test']['status'] = 'ERROR';
            $results['mail_function_test']['error'] = $e->getMessage();
        }
    } else {
        $results['mail_function_test']['status'] = 'UNAVAILABLE';
        $results['mail_function_test']['message'] = 'mail() function not available';
    }
    
    // Test 3: Configuration check
    $results['configuration'] = [
        'smtp_host' => SMTP_HOST,
        'smtp_port' => SMTP_PORT,
        'smtp_username' => SMTP_USERNAME,
        'smtp_password_length' => strlen(SMTP_PASSWORD),
        'php_version' => phpversion(),
        'sendmail_path' => ini_get('sendmail_path'),
        'smtp_ini_host' => ini_get('SMTP'),
        'smtp_ini_port' => ini_get('smtp_port')
    ];
    
    return $results;
}

// Run the test
$testResults = testSMTPConnection();

echo json_encode($testResults, JSON_PRETTY_PRINT);
?>
