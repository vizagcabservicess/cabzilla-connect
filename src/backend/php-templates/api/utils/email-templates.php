<?php
// Email templates for Vizag Taxi Hub

/**
 * Generate HTML email template for driver hire request notification to admin
 */
function generateDriverHireAdminEmail($requestData) {
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Driver Hire Request</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #1f2937; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .cta { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚗 New Driver Hire Request</h1>
                <p>Request ID: #' . $requestData['id'] . '</p>
            </div>
            <div class="content">
                <h2>Customer Details</h2>
                <div class="field">
                    <span class="label">Name:</span>
                    <span class="value">' . htmlspecialchars($requestData['name']) . '</span>
                </div>
                <div class="field">
                    <span class="label">Phone:</span>
                    <span class="value">' . htmlspecialchars($requestData['phone']) . '</span>
                </div>
                <div class="field">
                    <span class="label">Email:</span>
                    <span class="value">' . htmlspecialchars($requestData['email'] ?: 'Not provided') . '</span>
                </div>
                
                <h2>Service Details</h2>
                <div class="field">
                    <span class="label">Service Type:</span>
                    <span class="value">' . htmlspecialchars($requestData['service_type']) . '</span>
                </div>
                <div class="field">
                    <span class="label">Duration:</span>
                    <span class="value">' . htmlspecialchars($requestData['duration']) . '</span>
                </div>
                <div class="field">
                    <span class="label">Special Requirements:</span>
                    <span class="value">' . htmlspecialchars($requestData['requirements'] ?: 'None') . '</span>
                </div>
                
                <h2>Request Information</h2>
                <div class="field">
                    <span class="label">Submitted:</span>
                    <span class="value">' . date('F j, Y \a\t g:i A', strtotime($requestData['created_at'])) . '</span>
                </div>
                <div class="field">
                    <span class="label">Status:</span>
                    <span class="value">' . ucfirst($requestData['status']) . '</span>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="tel:+91-9966363662" class="cta">📞 Call Customer Now</a>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated notification from Vizag Taxi Hub</p>
                <p>Please respond to this request within 30 minutes as promised to the customer.</p>
            </div>
        </div>
    </body>
    </html>';
    
    return $html;
}

/**
 * Generate HTML email template for driver hire request acknowledgment to customer
 */
function generateDriverHireCustomerEmail($requestData) {
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Driver Hire Request Received</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .highlight { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .contact-info { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚗 Driver Hire Request Received</h1>
                <p>Request ID: #' . $requestData['id'] . '</p>
            </div>
            <div class="content">
                <p>Dear <strong>' . htmlspecialchars($requestData['name']) . '</strong>,</p>
                
                <p>Thank you for submitting your driver hire request with Vizag Taxi Hub. We have received your request and our team will contact you within <strong>30 minutes</strong>.</p>
                
                <div class="highlight">
                    <h3>📋 Your Request Summary</h3>
                    <p><strong>Service Type:</strong> ' . htmlspecialchars($requestData['service_type']) . '</p>
                    <p><strong>Duration:</strong> ' . htmlspecialchars($requestData['duration']) . '</p>
                    <p><strong>Special Requirements:</strong> ' . htmlspecialchars($requestData['requirements'] ?: 'None') . '</p>
                </div>
                
                <h3>⏰ What Happens Next?</h3>
                <ul>
                    <li>Our team will review your requirements</li>
                    <li>We will assign the best available driver for your needs</li>
                    <li>You will receive a call within 30 minutes with driver details</li>
                    <li>We will confirm all arrangements and pricing</li>
                </ul>
                
                <div class="contact-info">
                    <h3>📞 Need Immediate Assistance?</h3>
                    <p><strong>Phone:</strong> +91-9966363662</p>
                    <p><strong>Email:</strong> info@vizagtaxihub.com</p>
                    <p><strong>Available:</strong> 24/7</p>
                </div>
                
                <p>Thank you for choosing Vizag Taxi Hub for your driver hire needs!</p>
                
                <p>Best regards,<br>
                <strong>Vizag Taxi Hub Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated acknowledgment. Please do not reply to this email.</p>
                <p>For any queries, call us at +91-9966363662</p>
            </div>
        </div>
    </body>
    </html>';
    
    return $html;
}

/**
 * Generate HTML email template for contact form notification to admin
 */
function generateContactAdminEmail($messageData) {
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Message</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #1f2937; }
            .message-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .cta { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📧 New Contact Form Message</h1>
                <p>Message ID: #' . $messageData['id'] . '</p>
            </div>
            <div class="content">
                <h2>Customer Details</h2>
                <div class="field">
                    <span class="label">Name:</span>
                    <span class="value">' . htmlspecialchars($messageData['name']) . '</span>
                </div>
                <div class="field">
                    <span class="label">Email:</span>
                    <span class="value">' . htmlspecialchars($messageData['email']) . '</span>
                </div>
                <div class="field">
                    <span class="label">Phone:</span>
                    <span class="value">' . htmlspecialchars($messageData['phone']) . '</span>
                </div>
                <div class="field">
                    <span class="label">Subject:</span>
                    <span class="value">' . htmlspecialchars($messageData['subject']) . '</span>
                </div>
                
                <h2>Message</h2>
                <div class="message-box">
                    ' . nl2br(htmlspecialchars($messageData['message'])) . '
                </div>
                
                <h2>Message Information</h2>
                <div class="field">
                    <span class="label">Received:</span>
                    <span class="value">' . date('F j, Y \a\t g:i A', strtotime($messageData['created_at'])) . '</span>
                </div>
                <div class="field">
                    <span class="label">Status:</span>
                    <span class="value">' . ucfirst($messageData['status']) . '</span>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="mailto:' . htmlspecialchars($messageData['email']) . '" class="cta">📧 Reply to Customer</a>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated notification from Vizag Taxi Hub</p>
                <p>Please respond to this message within 2 hours as promised to the customer.</p>
            </div>
        </div>
    </body>
    </html>';
    
    return $html;
}

/**
 * Generate HTML email template for contact form acknowledgment to customer
 */
function generateContactCustomerEmail($messageData) {
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Message Received - Vizag Taxi Hub</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .highlight { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .contact-info { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📧 Message Received</h1>
                <p>Thank you for contacting us!</p>
            </div>
            <div class="content">
                <p>Dear <strong>' . htmlspecialchars($messageData['name']) . '</strong>,</p>
                
                <p>Thank you for reaching out to Vizag Taxi Hub. We have received your message and our team will get back to you within <strong>2 hours</strong>.</p>
                
                <div class="highlight">
                    <h3>📋 Your Message Summary</h3>
                    <p><strong>Subject:</strong> ' . htmlspecialchars($messageData['subject']) . '</p>
                    <p><strong>Message:</strong></p>
                    <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; margin: 10px 0;">' . nl2br(htmlspecialchars($messageData['message'])) . '</p>
                </div>
                
                <h3>⏰ What Happens Next?</h3>
                <ul>
                    <li>Our team will review your message</li>
                    <li>We will provide a detailed response to your inquiry</li>
                    <li>You will receive a reply within 2 hours</li>
                    <li>If urgent, we may call you directly</li>
                </ul>
                
                <div class="contact-info">
                    <h3>📞 Need Immediate Assistance?</h3>
                    <p><strong>Phone:</strong> +91-9966363662</p>
                    <p><strong>Email:</strong> info@vizagtaxihub.com</p>
                    <p><strong>Available:</strong> 24/7</p>
                </div>
                
                <p>Thank you for choosing Vizag Taxi Hub!</p>
                
                <p>Best regards,<br>
                <strong>Vizag Taxi Hub Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated acknowledgment. Please do not reply to this email.</p>
                <p>For any queries, call us at +91-9966363662</p>
            </div>
        </div>
    </body>
    </html>';
    
    return $html;
}
?>



