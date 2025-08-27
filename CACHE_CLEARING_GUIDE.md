# Browser Cache Clearing Guide

If you're experiencing issues with the application not loading properly or showing outdated content, you may need to clear your browser cache.

## Quick Cache Clear Methods

### Method 1: Hard Refresh (Recommended)
- **Windows/Linux**: Press `Ctrl + F5` or `Ctrl + Shift + R`
- **Mac**: Press `Cmd + Shift + R`
- **Mobile**: Pull down to refresh and hold

### Method 2: Incognito/Private Mode
Open the application in an incognito or private browser window to bypass cache completely.

## Manual Cache Clearing by Browser

### Google Chrome
1. Press `Ctrl + Shift + Delete` (Windows/Linux) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Click "Clear data"

### Mozilla Firefox
1. Press `Ctrl + Shift + Delete` (Windows/Linux) or `Cmd + Shift + Delete` (Mac)
2. Select "Cache"
3. Click "Clear"

### Safari
1. Press `Cmd + Option + E` to clear cache
2. Or go to Safari → Preferences → Advanced → Show Develop menu → Develop → Empty Caches

### Microsoft Edge
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Click "Clear"

### Mobile Browsers
- **Chrome Mobile**: Settings → Privacy and security → Clear browsing data
- **Safari Mobile**: Settings → Safari → Clear History and Website Data
- **Firefox Mobile**: Menu → Settings → Privacy → Clear private data

## Developer Tools Method

1. Open Developer Tools (`F12` or `Ctrl + Shift + I`)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## When to Clear Cache

Clear your browser cache when:
- The application shows an error message
- You see outdated content
- New features aren't appearing
- The page doesn't load properly
- You get "Failed to fetch" errors

## Automatic Cache Management

The application now includes automatic cache management that will:
- Clear cache on app startup
- Force reload when new versions are detected
- Clear cache when returning to the app after 1 hour

## Still Having Issues?

If clearing cache doesn't resolve the issue:
1. Try a different browser
2. Check your internet connection
3. Contact support if the problem persists

## Technical Details

The application uses several cache-busting techniques:
- Timestamp-based file naming
- Server-side cache control headers
- Client-side cache clearing
- Version checking and automatic reloads
