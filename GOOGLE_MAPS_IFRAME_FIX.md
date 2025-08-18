# 🔧 **Google Maps Iframe Sandbox Fix**

## 🚨 **Problem:**
```
Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
```

## 🔍 **Root Cause:**
This error occurs when Google Maps tries to load in an iframe that has sandbox restrictions without the `allow-scripts` permission. This commonly happens when:

1. **The application is embedded in an iframe** (like in a development environment or certain hosting platforms)
2. **Content Security Policy (CSP)** is blocking Google Maps scripts
3. **Iframe sandbox attributes** are missing required permissions

## ✅ **Fixes Applied:**

### **1. Updated GoogleMapsProvider (`src/providers/GoogleMapsProvider.tsx`)**
- Added iframe detection and warning
- Enhanced error handling for sandbox errors
- Added specific error messages for iframe issues

### **2. Enhanced LocationInput Component (`src/components/LocationInput.tsx`)**
- Added error display for Google Maps loading failures
- Shows user-friendly message when Maps fails to load
- Allows manual location input as fallback

### **3. Added Content Security Policy (`index.html`)**
- Added CSP meta tag to allow Google Maps scripts
- Permits scripts from `maps.googleapis.com` and `maps.gstatic.com`
- Allows iframe content from Google Maps domains

## 🚀 **Deployment Steps:**

### **Step 1: Rebuild the Application**
```bash
npm run build
```

### **Step 2: Upload Updated Files**
Upload these files to your server:
- `dist/` folder (complete rebuild)
- `src/providers/GoogleMapsProvider.tsx`
- `src/components/LocationInput.tsx`
- `index.html`

### **Step 3: Clear Browser Cache**
- Clear all browser cache (Ctrl+Shift+Delete)
- Test in incognito mode

## 🔧 **Additional Server-Side Fixes (if needed):**

### **If using Apache (.htaccess):**
```apache
# Allow Google Maps in iframes
Header set X-Frame-Options "ALLOWALL"
Header set Content-Security-Policy "frame-ancestors 'self' *; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com;"
```

### **If using Nginx:**
```nginx
# Add to server block
add_header X-Frame-Options "ALLOWALL";
add_header Content-Security-Policy "frame-ancestors 'self' *; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com;";
```

### **If using PHP (add to index.php or main entry point):**
```php
// Allow iframe embedding and Google Maps
header("X-Frame-Options: ALLOWALL");
header("Content-Security-Policy: frame-ancestors 'self' *; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com;");
```

## 🎯 **Testing:**

### **Test 1: Direct Access**
1. Open the application directly in browser (not in iframe)
2. Check if Google Maps loads without errors
3. Test location input functionality

### **Test 2: Iframe Test**
1. If testing in iframe, ensure it has proper permissions:
```html
<iframe src="your-app-url" 
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        allow="geolocation">
</iframe>
```

### **Test 3: Console Check**
1. Open browser developer tools (F12)
2. Check Console tab for any remaining errors
3. Look for "Google Maps loaded successfully" message

## 🚨 **If Still Not Working:**

### **Check 1: API Key**
- Verify `VITE_GOOGLE_MAPS_API_KEY` is set correctly in `.env.local`
- Ensure the API key has Maps JavaScript API enabled
- Check if the API key has proper domain restrictions

### **Check 2: Network**
- Check if `maps.googleapis.com` is accessible
- Verify no firewall/proxy blocking Google Maps
- Test with different network (mobile hotspot)

### **Check 3: Browser**
- Try different browser (Chrome, Firefox, Safari)
- Disable browser extensions temporarily
- Check if browser has location permissions enabled

## 📊 **Expected Results:**

### **✅ Success:**
- No console errors about sandboxed frames
- Google Maps autocomplete works in location inputs
- Location suggestions appear when typing
- "Google Maps loaded successfully" in console

### **⚠️ Partial Success:**
- Console shows iframe warning but Maps still works
- Manual location input works even if autocomplete fails
- Error message displayed but functionality continues

### **❌ Still Broken:**
- Console still shows sandbox errors
- Location inputs don't work at all
- No Google Maps functionality

## 🔧 **Fallback Solution:**

If Google Maps still doesn't work, the application will:
1. **Show a warning message** about limited functionality
2. **Allow manual text input** for locations
3. **Continue to work** with basic location functionality
4. **Display suggestions** from the local location database

**The application will remain functional even without Google Maps!**
