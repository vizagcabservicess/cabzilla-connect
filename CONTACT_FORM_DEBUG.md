# Contact Form Debugging Guide

## Issue: Page becomes empty after form submission

This guide will help you troubleshoot and fix the contact form empty page issue.

## Quick Fixes Applied

### 1. Enhanced Error Handling in PHP
- Added proper error reporting and debugging
- Improved file inclusion with error checking
- Better database connection handling
- Enhanced JSON response formatting

### 2. Improved Frontend Error Handling
- Added comprehensive error catching
- Better network error handling
- Form submission prevention during loading
- Enhanced user feedback

### 3. Error Boundary Protection
- Added React Error Boundary to catch JavaScript errors
- Prevents page from going blank due to React errors

## Testing Steps

### Step 1: Test the Contact Form API
Visit this URL in your browser to test the contact form backend:
```
https://yourdomain.com/api/test-contact-form.php
```

This will show you:
- ✅ File existence and permissions
- ✅ Database connection status
- ✅ Table existence
- ✅ Email function availability
- ✅ Form submission simulation

### Step 2: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Submit the contact form
4. Look for any error messages

### Step 3: Check Network Tab
1. In Developer Tools, go to the Network tab
2. Submit the contact form
3. Look for the request to `contact-form.php`
4. Check the response status and content

## Common Issues and Solutions

### Issue 1: Database Connection Failed
**Symptoms:** Error message about database connection
**Solution:** Check database credentials in `config.php`

### Issue 2: Missing Required Files
**Symptoms:** Error about missing files
**Solution:** Ensure all required files exist in the correct locations

### Issue 3: PHP Errors
**Symptoms:** White page or PHP error messages
**Solution:** Check PHP error logs and ensure proper file permissions

### Issue 4: CORS Issues
**Symptoms:** Network errors in browser console
**Solution:** Verify CORS headers are properly set

### Issue 5: JavaScript Errors
**Symptoms:** Page goes blank after form submission
**Solution:** Check browser console for JavaScript errors

## Debugging Commands

### Check PHP Error Logs
```bash
# Check PHP error log
tail -f /var/log/php_errors.log

# Or check Apache error log
tail -f /var/log/apache2/error.log
```

### Test Database Connection
```bash
# Test MySQL connection
mysql -u username -p database_name -e "SELECT 1;"
```

### Check File Permissions
```bash
# Ensure PHP files are readable
chmod 644 src/backend/php-templates/api/contact-form.php
chmod 644 src/backend/php-templates/api/utils/*.php
```

## Expected Behavior

After the fixes, the contact form should:

1. ✅ Show loading state during submission
2. ✅ Display success message on successful submission
3. ✅ Show error message if something goes wrong
4. ✅ Reset form after successful submission
5. ✅ Prevent multiple submissions
6. ✅ Handle network errors gracefully

## Contact Form Flow

1. User fills out form
2. Frontend validates input
3. Form data sent to `contact-form.php`
4. PHP validates data and connects to database
5. Message saved to `contact_messages` table
6. Email notifications sent (if configured)
7. Success response sent back to frontend
8. User sees success message and form resets

## Files Modified

- `src/backend/php-templates/api/contact-form.php` - Enhanced error handling
- `src/pages/ContactUsPage.tsx` - Improved frontend error handling
- `src/services/api/contactAPI.ts` - Better error handling
- `src/components/ErrorBoundary.tsx` - New error boundary component
- `src/backend/php-templates/api/test-contact-form.php` - New test script

## Support

If you're still experiencing issues:

1. Run the test script and share the results
2. Check browser console for errors
3. Check PHP error logs
4. Verify database connection
5. Test with a simple form submission

The contact form should now be much more robust and provide better error feedback instead of showing a blank page.
