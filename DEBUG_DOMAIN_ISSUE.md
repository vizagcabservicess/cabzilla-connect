# 🔍 **Domain Issue Debugging Guide**

## 🚨 **Current Problem:**
Even after clearing cache, the frontend is still calling `vizagup.com` instead of `vizagtaxihub.com`.

## 🔧 **Step-by-Step Debugging:**

### **Step 1: Check Browser Console**
1. **Open browser developer tools** (F12)
2. **Go to Console tab**
3. **Click on a booking in admin panel**
4. **Go to Invoice tab**
5. **Look for the debug logs** I added:
   ```
   🔍 DEBUG - API URL being called: [URL]
   🔍 DEBUG - Selected booking ID: [ID]
   ```

### **Step 2: Check Network Tab**
1. **Go to Network tab** in developer tools
2. **Click on a booking and go to Invoice tab**
3. **Look for the API call** to `debug-invoice.php`
4. **Check the actual URL** being called

### **Step 3: Check Environment Variables**
The issue might be an environment variable overriding the domain. Check if you have:

1. **`.env` file** in your project root
2. **`.env.local` file**
3. **`.env.production` file**
4. **VITE_API_BASE_URL** environment variable set

### **Step 4: Check Build Configuration**
The `vite.config.ts` has a proxy configuration that might be affecting this:

```typescript
proxy: {
  '/api': {
    target: 'https://vizagtaxihub.com',  // This is correct
    changeOrigin: true,
    secure: false,
  },
},
```

### **Step 5: Force Rebuild and Deploy**
1. **Delete the `dist` folder**
2. **Run `npm run build`**
3. **Upload the new `dist` folder** to your server
4. **Clear all browser cache** (Ctrl+Shift+Delete)
5. **Test in incognito mode**

### **Step 6: Check Server Configuration**
The error might be coming from the server itself. Check:

1. **Server error logs** - The error shows server file paths
2. **Server configuration** - Check if the server is redirecting requests
3. **DNS settings** - Check if there are any DNS redirects

## 🎯 **Quick Tests:**

### **Test 1: Direct API Call**
```bash
# Test the correct domain
curl "https://vizagtaxihub.com/api/debug-invoice.php?booking_id=298"

# Test the old domain (should fail or redirect)
curl "https://vizagup.com/api/debug-invoice.php?booking_id=298"
```

### **Test 2: Check Frontend Configuration**
Add this temporary code to any component to test:

```typescript
import { getApiUrl } from '@/config/api';

// Test what URL is being generated
const testUrl = getApiUrl('/api/test');
console.log('Test URL:', testUrl);
```

### **Test 3: Check Environment**
Add this to see what environment variables are set:

```typescript
console.log('Environment:', import.meta.env);
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
```

## 🚨 **Possible Causes:**

### **Cause 1: Environment Variable**
- **Check:** `VITE_API_BASE_URL` environment variable
- **Fix:** Remove or update the environment variable

### **Cause 2: Cached Build**
- **Check:** Old `dist` folder being served
- **Fix:** Rebuild and upload new `dist` folder

### **Cause 3: Server Configuration**
- **Check:** Server redirecting requests to old domain
- **Fix:** Check server configuration and DNS settings

### **Cause 4: Browser Cache**
- **Check:** Browser caching old JavaScript files
- **Fix:** Hard refresh (Ctrl+F5) or clear all cache

## 📊 **Expected Results:**

### **If Fixed:**
- ✅ Console shows: `🔍 DEBUG - API URL being called: https://vizagtaxihub.com/api/debug-invoice.php?...`
- ✅ Network tab shows calls to `vizagtaxihub.com`
- ✅ No more "Booking not found" errors

### **If Still Broken:**
- ❌ Console shows calls to `vizagup.com`
- ❌ Network tab shows wrong domain
- ❌ Still getting domain-related errors

## 🔧 **Immediate Actions:**

1. **Check browser console** for the debug logs
2. **Check network tab** for actual API calls
3. **Rebuild the application** with `npm run build`
4. **Upload new dist folder** to server
5. **Clear all browser cache**
6. **Test in incognito mode**

**Report back with what you see in the browser console and network tab!**
