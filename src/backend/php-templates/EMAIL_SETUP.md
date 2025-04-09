
# Email System Setup for Vizag Taxi Hub

This document provides instructions for setting up the email system on the Hostinger server.

## Prerequisites

- PHP 7.4 or higher installed on the server
- Composer installed on the server
- Access to Hostinger control panel

## Installation Steps

1. **Install PHPMailer via Composer**

   Navigate to your website's root directory on the server and run:

   ```bash
   cd /path/to/website/root
   composer require phpmailer/phpmailer
   ```

   Or upload the composer.json file and run:

   ```bash
   composer install
   ```

2. **Verify SMTP Settings**

   The following SMTP credentials are configured in the mailer.php file:

   - Host: smtp.hostinger.com
   - Port: 587
   - Username: info@vizagup.com
   - Password: Joel@5544
   - Encryption: TLS

3. **Create Log Directory**

   Create a directory for email logs:

   ```bash
   mkdir -p logs
   chmod 755 logs
   ```

4. **Test the Email System**

   After uploading all files, test the email system by accessing:

   ```
   https://yourdomain.com/api/test-email.php
   ```

   or with a specific test email:

   ```
   https://yourdomain.com/api/test-email.php?email=your-email@example.com
   ```

## File Structure

The email system consists of several key files:

- `utils/mailer.php` - Core PHPMailer integration
- `utils/email.php` - Email template generation and sending
- `send-booking-confirmation.php` - Dedicated endpoint for sending booking confirmations
- `test-email.php` - Test script to verify email configuration

## Troubleshooting

If emails are not being sent:

1. Check the email logs in the `logs` directory
2. Verify SMTP credentials in the `mailer.php` file
3. Ensure the PHPMailer library is properly installed
4. Check if your Hostinger account has email sending limits

## Security Considerations

- The SMTP password is stored in the code. For production, consider using environment variables or a secure configuration file.
- Limit access to the test-email.php script or remove it once testing is complete.
