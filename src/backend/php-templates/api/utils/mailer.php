
<?php
// Enable debug mode for email functions
define('EMAIL_DEBUG_MODE', true);

// PHPMailer integration for reliable email sending

// Simulate PHPMailer for development environment
class PHPMailer {
    public $SMTPDebug = 0;
    public $isSMTP = false;
    public $Host = '';
    public $SMTPAuth = false;
    public $Username = '';
    public $Password = '';
    public $SMTPSecure = '';
    public $Port = 0;
    public $Subject = '';
    public $Body = '';
    public $AltBody = '';
    
    public function setFrom($email, $name) {
        // Simulation
        $this->from = ['email' => $email, 'name' => $name];
    }
    
    public function addAddress($email) {
        // Simulation
        $this->to = $email;
    }
    
    public function addReplyTo($email, $name) {
        // Simulation
        $this->replyTo = ['email' => $email, 'name' => $name];
    }
    
    public function isHTML($isHtml) {
        // Simulation
        $this->isHtml = $isHtml;
    }
    
    public function addAttachment($path, $name = '') {
        // Simulation
        $this->attachments[] = ['path' => $path, 'name' => $name];
    }
    
    public function send() {
        // In development, always return success
        error_log("SIMULATION: Email would be sent to {$this->to} with subject: {$this->Subject}");
        return true;
    }
}

class SMTP {}
class Exception extends \Exception {}

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
    
    // If debug mode is enabled, also output to error log
    if (defined('EMAIL_DEBUG_MODE') && EMAIL_DEBUG_MODE) {
        error_log("EMAIL DEBUG: " . $logEntry);
    }
}

/**
 * Send an email using PHPMailer with enhanced error handling
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
        
        // Log attempt before sending
        logError("Attempting to send email via PHPMailer SMTP", [
            'to' => $to,
            'subject' => $subject,
            'smtp_host' => $mail->Host
        ]);
        
        // Send the email
        $success = $mail->send();
        logError("PHPMailer send result", ['success' => $success ? 'true' : 'false']);
        return $success;
        
    } catch (Exception $e) {
        logError("PHPMailer Exception", [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        // Try again with alternative method
        try {
            // Disable SMTP for direct sending
            $mail = new PHPMailer(true);
            $mail->isSMTP = false;
            
            // Set basic information
            $mail->setFrom('info@vizagup.com', 'Vizag Taxi Hub');
            $mail->addAddress($to);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->isHTML(true);
            
            logError("Attempting direct mail send without SMTP", ['to' => $to]);
            $directResult = $mail->send();
            logError("Direct send result", ['success' => $directResult ? 'true' : 'false']);
            
            return $directResult;
        } catch (Exception $e2) {
            logError("Direct mail send also failed", ['error' => $e2->getMessage()]);
            return false;
        }
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
    
    // If PHPMailer fails, try PHP's native mail() function
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: info@vizagtaxihub.com' . "\r\n";
    $headers .= 'Reply-To: info@vizagtaxihub.com' . "\r\n";
    
    logError("Attempting to send via PHP mail()", ['to' => $to]);
    $mailResult = mail($to, $subject, $htmlBody, $headers);
    
    if ($mailResult) {
        logError("Successfully sent email via mail()", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // If mail() also fails, try with additional parameters
    logError("Attempting to send via mail() with additional parameters", ['to' => $to]);
    $mailResult2 = mail($to, $subject, $htmlBody, $headers, "-finfo@vizagtaxihub.com");
    
    if ($mailResult2) {
        logError("Successfully sent email via mail() with additional parameters", [
            'to' => $to,
            'subject' => $subject
        ]);
        return true;
    }
    
    // If all methods fail, log the failure
    logError("All email sending methods failed", [
        'to' => $to,
        'subject' => $subject
    ]);
    
    return false;
}
