
<?php
// PHPMailer integration for reliable email sending
require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

/**
 * Helper function to log errors during email sending
 */
function logError($message, $data = []) {
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/email_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($data)) {
        $logEntry .= ": " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
    file_put_contents($logFile, $logEntry . "\n", FILE_APPEND);
    error_log($logEntry); // Also log to PHP error log
}

/**
 * Send an email using PHPMailer with Hostinger SMTP settings
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $htmlBody HTML content of the email
 * @param array $attachments Optional array of attachments
 * @return bool True if the email was sent successfully, false otherwise
 */
function sendEmailWithPHPMailer($to, $subject, $htmlBody, $attachments = []) {
    logError("Sending email with PHPMailer", [
        'to' => $to,
        'subject' => $subject
    ]);
    
    // Create a new PHPMailer instance
    $mail = new PHPMailer(true);
    
    try {
        // Server settings
        $mail->SMTPDebug = 0;                      // Disable debug output
        $mail->isSMTP();                           // Send using SMTP
        $mail->Host       = 'smtp.hostinger.com';  // SMTP server
        $mail->SMTPAuth   = true;                  // Enable SMTP authentication
        $mail->Username   = 'info@vizagup.com';    // SMTP username
        $mail->Password   = 'Joel@5544';           // SMTP password
        $mail->SMTPSecure = 'tls';                 // Enable TLS encryption
        $mail->Port       = 587;                   // TCP port to connect to
        
        // Recipients
        $mail->setFrom('info@vizagup.com', 'Vizag Taxi Hub');
        $mail->addAddress($to);                    // Add a recipient
        $mail->addReplyTo('info@vizagup.com', 'Vizag Taxi Hub');
        
        // Content
        $mail->isHTML(true);                       // Set email format to HTML
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = strip_tags($htmlBody);    // Plain text version
        
        // Add attachments if any
        if (!empty($attachments)) {
            foreach ($attachments as $attachment) {
                if (isset($attachment['path']) && file_exists($attachment['path'])) {
                    $mail->addAttachment(
                        $attachment['path'], 
                        isset($attachment['name']) ? $attachment['name'] : ''
                    );
                }
            }
        }
        
        // Send the email
        $success = $mail->send();
        logError("PHPMailer send result", ['success' => $success ? 'true' : 'false']);
        return $success;
        
    } catch (Exception $e) {
        logError("PHPMailer Exception", [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

/**
 * Send an email using multiple methods, trying each in order until one succeeds
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $htmlBody HTML content of the email
 * @return bool True if any method succeeded, false if all failed
 */
function sendEmailAllMethods($to, $subject, $htmlBody) {
    // First try PHPMailer
    $phpMailerResult = sendEmailWithPHPMailer($to, $subject, $htmlBody);
    
    if ($phpMailerResult) {
        logError("Successfully sent email via PHPMailer", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // If PHPMailer fails, try legacy method through existing sendEmail function
    // The sendEmail function is defined in email.php which includes this file
    if (function_exists('sendEmail')) {
        $legacyResult = sendEmail($to, $subject, $htmlBody);
        
        if ($legacyResult) {
            logError("Successfully sent email via legacy method", [
                'to' => $to,
                'subject' => $subject
            ]);
            return true;
        }
    }
    
    logError("All email sending methods failed", [
        'to' => $to,
        'subject' => $subject
    ]);
    
    return false;
}
