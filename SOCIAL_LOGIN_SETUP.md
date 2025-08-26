# Social Login Setup Guide

This guide will help you set up Google and Facebook social login for your Cabzilla Connect application.

## Prerequisites

1. Google Cloud Console account
2. Facebook Developer account
3. Access to your application's environment variables

## Google OAuth Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google Identity API

### 2. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "Cabzilla Connect"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users if needed

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - `http://localhost:3000` (for development)
   - Your production domain
5. Add authorized redirect URIs:
   - `http://localhost:5173`
   - `http://localhost:3000`
   - Your production domain
6. Copy the Client ID

### 4. Add to Environment Variables

Add the following to your `.env` file:
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

## Facebook OAuth Setup

### 1. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App"
3. Choose "Consumer" app type
4. Fill in the app details

### 2. Configure Facebook Login

1. In your app dashboard, go to "Add Product" > "Facebook Login"
2. Choose "Web" platform
3. Add your site URL:
   - `http://localhost:5173` (for development)
   - Your production domain
4. Configure settings:
   - Valid OAuth Redirect URIs: Add your domains
   - Client OAuth Login: Enabled
   - Web OAuth Login: Enabled
   - Enforce HTTPS: Disabled for development

### 3. Get App ID

1. Go to "Settings" > "Basic"
2. Copy the App ID

### 4. Add to Environment Variables

Add the following to your `.env` file:
```
VITE_FACEBOOK_APP_ID=your_facebook_app_id_here
```

## Database Setup

Run the following SQL migration to create the social_providers table:

```sql
-- Run the contents of sql/social_providers_migration.sql
```

## Testing

1. Start your development server
2. Go to the login or signup page
3. Click on "Continue with Google" or "Continue with Facebook"
4. Complete the OAuth flow
5. Verify that the user is created/linked in your database

## Troubleshooting

### Common Issues

1. **"Invalid Client ID" error**
   - Verify your Google Client ID is correct
   - Ensure the domain is added to authorized origins

2. **"App not configured" Facebook error**
   - Verify your Facebook App ID is correct
   - Ensure the domain is added to app settings
   - Check that Facebook Login product is added

3. **CORS errors**
   - Ensure your backend allows requests from your frontend domain
   - Check that the API endpoints are properly configured

4. **Database errors**
   - Verify the social_providers table exists
   - Check database connection settings
   - Ensure proper permissions

5. **Content Security Policy (CSP) errors**
   - The CSP has been updated in `index.html` to allow Google and Facebook domains
   - If you see "Refused to load script" errors, ensure the CSP includes:
     - `https://accounts.google.com` for Google Sign-In
     - `https://connect.facebook.net` for Facebook SDK
     - `https://graph.facebook.com` for Facebook API calls

6. **React DOM manipulation errors**
   - These are typically caused by development mode token generation
   - The AuthProvider has been updated to prevent these errors
   - If you still see errors, try clearing your browser cache and localStorage

### Development vs Production

- For development, use `localhost` domains
- For production, update all URLs to your actual domain
- Ensure HTTPS is enabled in production
- Update environment variables for production

## Security Considerations

1. Never expose your OAuth secrets in client-side code
2. Always validate tokens on the server side
3. Use HTTPS in production
4. Implement proper error handling
5. Consider rate limiting for OAuth endpoints

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure database migration is complete
4. Test with a fresh browser session
