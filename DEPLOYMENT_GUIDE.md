# 🚀 Production Deployment Guide - Email & Invoice Fix

## 📋 **What You Need to Do**

### **Step 1: Upload Files to Production Server**

Upload these files to your production server at `vizagtaxihub.com`:

1. **`install-composer.php`** - Main installation script
2. **`src/backend/php-templates/api/email-test.php`** - Email testing
3. **`src/backend/php-templates/api/fix-email-invoice.php`** - Diagnostic script
4. **`src/backend/php-templates/api/trigger-email.php`** - Manual email trigger

### **Step 2: Run Installation Script**

SSH into your Hostinger server and run:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Run the installation script
php install-composer.php
```

### **Step 3: Alternative - Manual Installation**

If you can't SSH, use Hostinger's File Manager:

1. **Upload `install-composer.php`** to your project root
2. **Access via browser:** `https://vizagtaxihub.com/install-composer.php`
3. **Follow the output** to complete installation

## 🔧 **Quick Fix Commands**

### **For Email Issues:**

```bash
# Test email functionality
curl https://vizagtaxihub.com/api/email-test.php

# Trigger email for specific booking
curl -X POST https://vizagtaxihub.com/api/trigger-email.php \
  -H "Content-Type: application/json" \
  -d '{"booking_id": "123"}'
```

### **For Invoice Issues:**

```bash
# Test PDF generation
curl https://vizagtaxihub.com/api/test-pdf.php

# Test invoice download
curl https://vizagtaxihub.com/api/download-invoice.php?id=123
```

## 📁 **File Structure After Deployment**

```
your-project/
├── install-composer.php          # Installation script
├── composer.json                 # Created by installer
├── vendor/                       # Created by Composer
│   ├── autoload.php             # Autoloader
│   └── dompdf/                  # DomPDF library
├── src/
│   └── backend/
│       └── php-templates/
│           ├── api/
│           │   ├── email-test.php
│           │   ├── fix-email-invoice.php
│           │   └── trigger-email.php
│           └── logs/            # Email and error logs
└── test-installation.php        # Created by installer
```

## 🎯 **Testing Checklist**

### **After Installation:**

- [ ] Run `php test-installation.php`
- [ ] Check `https://vizagtaxihub.com/api/email-test.php`
- [ ] Check `https://vizagtaxihub.com/api/test-pdf.php`
- [ ] Verify logs directory exists
- [ ] Test manual email trigger

### **For Email:**

- [ ] Basic mail() function works
- [ ] SMTP authentication successful
- [ ] Email templates generate
- [ ] Customer emails sent
- [ ] Admin notifications sent

### **For Invoice:**

- [ ] DomPDF installed correctly
- [ ] Autoloader found and working
- [ ] PDF generation successful
- [ ] Invoice download works
- [ ] HTML fallback works

## 🚨 **Troubleshooting**

### **If Composer Installation Fails:**

1. **Manual Installation:**
   ```bash
   curl -sS https://getcomposer.org/installer | php
   mv composer.phar /usr/local/bin/composer
   chmod +x /usr/local/bin/composer
   ```

2. **Alternative - Download DomPDF Manually:**
   - Download from: https://github.com/dompdf/dompdf/releases
   - Extract to `vendor/dompdf/dompdf/`
   - Create `vendor/autoload.php` manually

### **If Email Still Not Working:**

1. **Check SMTP Settings:**
   - Verify `info@vizagtaxihub.com` exists in Hostinger
   - Reset email password
   - Update password in `src/backend/php-templates/api/utils/mailer.php`

2. **Check Server Configuration:**
   - Ensure PHP mail() function is enabled
   - Check sendmail configuration
   - Verify DNS settings

### **If PDF Still Not Working:**

1. **Check File Permissions:**
   ```bash
   chmod 755 vendor/
   chmod 644 vendor/autoload.php
   chmod 755 src/backend/php-templates/logs/
   ```

2. **Check PHP Extensions:**
   - Ensure `mbstring` extension is enabled
   - Ensure `gd` extension is enabled
   - Ensure `curl` extension is enabled

## 📞 **Support Steps**

### **If Issues Persist:**

1. **Check Hostinger Support:**
   - Email configuration issues
   - SMTP settings
   - Server configuration

2. **Check Logs:**
   ```bash
   tail -f src/backend/php-templates/logs/*.log
   ```

3. **Contact Support with:**
   - Error messages from logs
   - Steps you've tried
   - Server environment details

## 🎉 **Success Indicators**

### **Email Working:**
- ✅ Test email received at `info@vizagtaxihub.com`
- ✅ Booking confirmation emails sent
- ✅ Admin notification emails sent
- ✅ Email logs created

### **Invoice Working:**
- ✅ PDF downloads successfully
- ✅ Invoice content is correct
- ✅ No errors in browser console
- ✅ PDF opens in all browsers

## 📝 **Quick Reference**

### **Important URLs:**
- Installation: `https://vizagtaxihub.com/install-composer.php`
- Email Test: `https://vizagtaxihub.com/api/email-test.php`
- PDF Test: `https://vizagtaxihub.com/api/test-pdf.php`
- Diagnostic: `https://vizagtaxihub.com/api/fix-email-invoice.php`

### **Important Files:**
- `install-composer.php` - Main installer
- `composer.json` - Dependencies
- `vendor/autoload.php` - Autoloader
- `src/backend/php-templates/logs/` - Logs directory

---

**Status:** Ready for Production Deployment  
**Last Updated:** January 2025  
**Version:** 1.0
