# 🚨 **URGENT: Production Server Fix Guide**

## 🚨 **Current Issue:**
Your production server at `vizagtaxihub.com` is throwing fatal errors because it has the old version of `response.php` without our parameter validation fixes.

## 🔧 **Files to Upload to Production Server:**

### **1. Fixed Backend Files:**
Upload these files to `/home/u644605165/domains/vizagtaxihub.com/public_html/api/`:

```
📁 api/
├── utils/
│   └── response.php (FIXED - with parameter validation)
├── download-invoice.php (FIXED - with proper error handling)
├── debug-invoice.php (ENHANCED - with detailed debugging)
├── check-database.php (NEW - database checker)
└── admin/
    ├── get-invoice.php (FIXED - with proper database connection)
    └── download-invoice.php (FIXED - with proper error handling)
```

### **2. Frontend Files:**
Upload the entire `dist` folder to your production server.

### **3. Fixed Frontend Configuration:**
Upload these frontend files:
- **`src/config/api.ts`** (FIXED - handles .php extensions correctly)
- **`src/components/admin/AdminBookingsList.tsx`** (FIXED - proper API calls)

## 🎯 **Step-by-Step Deployment:**

### **Step 1: Backup Current Files**
```bash
# SSH into your server
ssh u644605165@your-server.com

# Backup current files
cp /home/u644605165/domains/vizagtaxihub.com/public_html/api/utils/response.php /home/u644605165/domains/vizagtaxihub.com/public_html/api/utils/response.php.backup
```

### **Step 2: Upload Fixed Files**
Upload these files from your local project to the server:

1. **`src/backend/php-templates/api/utils/response.php`** → **`/home/u644605165/domains/vizagtaxihub.com/public_html/api/utils/response.php`**
2. **`src/backend/php-templates/api/download-invoice.php`** → **`/home/u644605165/domains/vizagtaxihub.com/public_html/api/download-invoice.php`**
3. **`src/backend/php-templates/api/debug-invoice.php`** → **`/home/u644605165/domains/vizagtaxihub.com/public_html/api/debug-invoice.php`**
4. **`src/backend/php-templates/api/check-database.php`** → **`/home/u644605165/domains/vizagtaxihub.com/public_html/api/check-database.php`**
5. **`src/backend/php-templates/api/admin/get-invoice.php`** → **`/home/u644605165/domains/vizagtaxihub.com/public_html/api/admin/get-invoice.php`**
6. **`src/backend/php-templates/api/admin/download-invoice.php`** → **`/home/u644605165/domains/vizagtaxihub.com/public_html/api/admin/download-invoice.php`**

**Frontend Files:**
7. **`src/config/api.ts`** → **`/home/u644605165/domains/vizagtaxihub.com/public_html/src/config/api.ts`**
8. **`src/components/admin/AdminBookingsList.tsx`** → **`/home/u644605165/domains/vizagtaxihub.com/public_html/src/components/admin/AdminBookingsList.tsx`**

### **Step 3: Upload Frontend Files**
Upload the entire `dist` folder to your production server.

### **Step 4: Set Proper Permissions**
```bash
# Set proper permissions
chmod 644 /home/u644605165/domains/vizagtaxihub.com/public_html/api/utils/response.php
chmod 644 /home/u644605165/domains/vizagtaxihub.com/public_html/api/download-invoice.php
chmod 644 /home/u644605165/domains/vizagtaxihub.com/public_html/api/debug-invoice.php
chmod 644 /home/u644605165/domains/vizagtaxihub.com/public_html/api/check-database.php
chmod 644 /home/u644605165/domains/vizagtaxihub.com/public_html/api/admin/get-invoice.php
chmod 644 /home/u644605165/domains/vizagtaxihub.com/public_html/api/admin/download-invoice.php
```

## 🧪 **Test the Fix:**

### **Test 1: Database Check**
```bash
# First, check the database and see what bookings exist
curl "https://vizagtaxihub.com/api/check-database.php"
```

### **Test 2: Backend API Tests**
```bash
# Test debug-invoice.php (enhanced with more debugging)
curl "https://vizagtaxihub.com/api/debug-invoice.php?booking_id=298"

# Test get-invoice.php
curl "https://vizagtaxihub.com/api/admin/get-invoice.php?booking_id=298"

# Test download-invoice.php
curl "https://vizagtaxihub.com/api/download-invoice.php?id=298&format=html"
```

### **Test 2: Frontend Tests**
1. **Clear browser cache completely**
2. **Open admin panel in incognito mode**
3. **Click on booking VTH2508188F2C5E**
4. **Go to Invoice tab**
5. **Should see invoice data instead of error**

## 📊 **Expected Results:**

### **Before Fix:**
```
Fatal error: Uncaught TypeError: http_response_code(): Argument #1 ($response_code) must be of type int, array given
```

### **After Fix:**
```json
{
    "status": "success",
    "message": "Invoice data retrieved successfully",
    "data": {
        "invoice": {
            "id": 298,
            "booking_number": "VTH2508188F2C5E",
            "passenger_name": "Kumar N"
        }
    }
}
```

## 🚨 **Critical Points:**

1. **The error is on your PRODUCTION server**, not local
2. **You need to upload the fixed files** to replace the old ones
3. **The frontend is calling the right endpoints**, but the backend has bugs
4. **Clear all caches** after uploading

## 🔍 **If Issues Persist:**

### **Check Server Logs:**
```bash
# Check error logs
tail -f /home/u644605165/domains/vizagtaxihub.com/public_html/api/logs/debug_invoice.log
tail -f /home/u644605165/domains/vizagtaxihub.com/public_html/api/logs/invoice_errors.log
```

### **Check File Permissions:**
```bash
# Ensure files are readable
ls -la /home/u644605165/domains/vizagtaxihub.com/public_html/api/utils/response.php
```

### **Test Database Connection:**
```bash
# Test if database connection works
curl "https://vizagtaxihub.com/api/debug-invoice.php?booking_id=298"
```

## 📞 **Next Steps:**

The continuous loop will **NOT stop** until you upload the `AdminBookingsList.tsx` file. The backend is working correctly, but the frontend is still using the old code that calls the wrong endpoint.

**The key issue is that your production server has the old `response.php` file. Once you upload the fixed version, the errors should stop.**
