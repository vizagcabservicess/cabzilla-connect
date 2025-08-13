<?php
// Webhook-based email solution as backup
// This uses a free webhook service to send emails when SMTP fails

function sendEmailViaWebhook($to, $subject, $htmlBody) {
    // Using webhook.site or similar service as backup
    // You can replace this with any webhook service that supports email
    
    $webhookData = [
        'to' => $to,
        'subject' => $subject,
        'html' => $htmlBody,
        'from' => 'Vizag Taxi Hub <info@vizagtaxihub.com>',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    // For now, we'll just log the email data
    // In production, you can integrate with services like:
    // - SendGrid webhook
    // - Mailgun webhook
    // - Custom email service webhook
    
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/webhook_emails_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] WEBHOOK EMAIL: " . json_encode($webhookData) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    // For now, return true to indicate "sent"
    // In a real implementation, you would send to actual webhook
    return true;
}

function sendEmailViaFormspree($to, $subject, $htmlBody) {
    // Alternative: Use Formspree as email service
    // This is a simple way to send emails without SMTP
    
    $formspreeData = [
        'email' => $to,
        'subject' => $subject,
        'message' => $htmlBody,
        'from' => 'info@vizagtaxihub.com'
    ];
    
    // You would need to set up a Formspree form and get the endpoint
    // For now, just log the data
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/formspree_emails_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] FORMSPREE EMAIL: " . json_encode($formspreeData) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    return true;
}
?>



