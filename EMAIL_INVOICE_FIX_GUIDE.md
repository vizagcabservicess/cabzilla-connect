# 🔧 Email and Invoice Generation Fix Guide

## 🚨 **Issues Identified**

### **Email Issues:**
1. **SMTP Configuration**: Email system not properly configured for Hostinger
2. **Email Credentials**: SMTP password may be incorrect or expired
3. **Email Trigger Points**: Emails not being sent during payment verification
4. **Logging**: Email logs not being created, indicating functions not executing

### **Invoice Issues:**
1. **PDF Library**: DomPDF not installed or configured properly
2. **Autoloader**: Composer autoloader not found
3. **File Permissions**: Logs directory not writable

## 🛠️ **Step-by-Step Fix**

### **Step 1: Test Current Setup**

Run the diagnostic script to identify issues:

```bash
# Access the fix script in your browser
https://vizagtaxihub.com/api/fix-email-invoice.php
```

This will:
- Test email configuration
- Check PDF library availability
- Create necessary directories
- Generate a detailed report

### **Step 2: Fix Email Issues**

#### **A. Update SMTP Credentials**

1. **Check Hostinger Email Settings:**
   - Log into Hostinger control panel
   - Go to Email → Email Accounts
   - Verify `info@vizagtaxihub.com` exists
   - Reset password if needed

2. **Update Mailer Configuration:**
   ```php
   // In src/backend/php-templates/api/utils/mailer.php
   define('SMTP_USERNAME', 'info@vizagtaxihub.com');
   define('SMTP_PASSWORD', 'YOUR_NEW_PASSWORD'); // Update this
   define('SMTP_HOST', 'smtp.hostinger.com');
   define('SMTP_PORT', 465);
   define('SMTP_SECURE', 'ssl');
   ```

#### **B. Test Email Sending**

1. **Run Email Test:**
   ```bash
   # Access the email test script
   https://vizagtaxihub.com/api/email-test.php
   ```

2. **Check Email Logs:**
   ```bash
   # Check the logs directory
   src/backend/php-templates/logs/email_test.log
   ```

#### **C. Manual Email Trigger**

If emails aren't being sent automatically, use the manual trigger:

```bash
# Send a test email for a specific booking
curl -X POST https://vizagtaxihub.com/api/trigger-email.php \
  -H "Content-Type: application/json" \
  -d '{"booking_id": "YOUR_BOOKING_ID"}'
```

### **Step 3: Fix Invoice Generation**

#### **A. Install DomPDF**

1. **Install Composer (if not installed):**
   ```bash
   # Download Composer
   curl -sS https://getcomposer.org/installer | php
   mv composer.phar /usr/local/bin/composer
   ```

2. **Install DomPDF:**
   ```bash
   # Navigate to your project root
   cd /path/to/your/project
   
   # Install DomPDF
   composer require dompdf/dompdf:^2.0
   
   # Install dependencies
   composer install
   ```

3. **Verify Installation:**
   ```bash
   # Check if vendor directory exists
   ls -la vendor/
   
   # Check if DomPDF is installed
   ls -la vendor/dompdf/
   ```

#### **B. Test PDF Generation**

1. **Run PDF Test:**
   ```bash
   # Access the PDF test script
   https://vizagtaxihub.com/api/test-pdf.php
   ```

2. **Test Invoice Download:**
   ```bash
   # Test invoice generation for a booking
   https://vizagtaxihub.com/api/download-invoice.php?id=YOUR_BOOKING_ID
   ```

### **Step 4: Fix File Permissions**

```bash
# Set proper permissions for logs directory
chmod 755 src/backend/php-templates/logs/
chmod 644 src/backend/php-templates/logs/*.log

# Set permissions for vendor directory
chmod 755 vendor/
chmod 644 vendor/autoload.php
```

### **Step 5: Update Email Trigger Points**

#### **A. Fix Payment Verification**

The email should be triggered in `verify-razorpay-payment.php`. Ensure this code is present:

```php
// After successful payment verification
if ($booking_data && $payAmount > 0) {
    $formattedBooking = [
        'id' => $booking_data['id'],
        'bookingNumber' => $booking_data['booking_number'],
        // ... other booking data
    ];
    
    // Send payment confirmation email
    $paymentEmailSuccess = sendPaymentConfirmationEmail($formattedBooking);
}
```

#### **B. Fix Booking Creation**

Add email trigger to booking creation:

```php
// After successful booking creation
$emailResult = sendBookingConfirmationEmail($formattedBooking);
```

## 🔍 **Troubleshooting**

### **Email Not Sending:**

1. **Check SMTP Settings:**
   - Verify SMTP credentials in Hostinger
   - Test with a simple mail() function
   - Check email logs for errors

2. **Check Server Configuration:**
   - Ensure PHP mail() function is enabled
   - Check sendmail configuration
   - Verify DNS settings

3. **Check Email Logs:**
   ```bash
   # Check email logs
   tail -f src/backend/php-templates/logs/email_*.log
   ```

### **PDF Not Generating:**

1. **Check Composer Installation:**
   ```bash
   composer --version
   composer show dompdf/dompdf
   ```

2. **Check Autoloader:**
   ```bash
   # Verify autoloader exists
   ls -la vendor/autoload.php
   
   # Test autoloader
   php -r "require 'vendor/autoload.php'; echo 'Autoloader working';"
   ```

3. **Check File Permissions:**
   ```bash
   # Ensure vendor directory is readable
   ls -la vendor/
   chmod 755 vendor/
   ```

## 📋 **Testing Checklist**

### **Email Testing:**
- [ ] Basic mail() function works
- [ ] SMTP authentication successful
- [ ] Email templates generate correctly
- [ ] Emails sent to customer
- [ ] Admin notification emails sent
- [ ] Email logs created

### **Invoice Testing:**
- [ ] DomPDF installed correctly
- [ ] Autoloader found and working
- [ ] PDF generation successful
- [ ] Invoice download works
- [ ] HTML fallback works if PDF fails

## 🚀 **Production Deployment**

### **Before Going Live:**

1. **Test Email Flow:**
   - Create a test booking
   - Complete payment
   - Verify email received
   - Check admin notification

2. **Test Invoice Flow:**
   - Generate invoice for test booking
   - Download PDF
   - Verify invoice content

3. **Monitor Logs:**
   - Set up log monitoring
   - Check for errors regularly
   - Monitor email delivery rates

### **Post-Deployment:**

1. **Monitor Email Delivery:**
   - Check spam folders
   - Monitor bounce rates
   - Verify email templates

2. **Monitor Invoice Generation:**
   - Test invoice downloads
   - Verify PDF quality
   - Check invoice accuracy

## 📞 **Support**

If issues persist:

1. **Check Hostinger Support:**
   - Email configuration issues
   - SMTP settings
   - Server configuration

2. **Check Composer Documentation:**
   - Installation issues
   - Dependency problems
   - Autoloader configuration

3. **Check DomPDF Documentation:**
   - PDF generation issues
   - Configuration problems
   - Font and styling issues

## 📝 **Quick Commands**

```bash
# Test email sending
curl https://vizagtaxihub.com/api/email-test.php

# Test PDF generation
curl https://vizagtaxihub.com/api/test-pdf.php

# Trigger email for booking
curl -X POST https://vizagtaxihub.com/api/trigger-email.php \
  -H "Content-Type: application/json" \
  -d '{"booking_id": "123"}'

# Install DomPDF
composer require dompdf/dompdf:^2.0

# Check logs
tail -f src/backend/php-templates/logs/*.log
```

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** Ready for Production
