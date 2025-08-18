# Environment Setup Guide

## Google Maps API Key Setup

To fix Google Maps issues, create a `.env` file in the root directory with the following content:

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDqhYmgEp_DafM1jKJ8XHTgEdLXCg-fGy4
```

## Steps to Fix:

1. **Create `.env` file** in the project root
2. **Add the API key** as shown above
3. **Restart your development server** (if running)
4. **Clear browser cache** and reload the page

## Verification:

After setting up the environment file, you can verify Google Maps is working by:

1. Opening browser developer tools (F12)
2. Looking for any console errors related to Google Maps
3. Checking if the GoogleMapsTest component shows "✅ Yes" for "Loaded"

## Content Security Policy Updates:

The CSP has been updated to allow:
- Google Analytics: `https://www.googletagmanager.com`, `https://www.google-analytics.com`
- Microsoft Clarity: `https://www.clarity.ms`, `https://scripts.clarity.ms`
- Google Maps: `https://maps.googleapis.com`, `https://maps.gstatic.com`, `https://maps.google.com`, `https://www.google.com`

## Troubleshooting:

If maps still don't work:
1. Check browser console for CSP errors
2. Verify the API key is valid in Google Cloud Console
3. Ensure the domain is authorized in Google Maps API settings
4. Try loading the page in incognito mode
