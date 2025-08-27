import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function SocialLoginConfigCheck() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;

  const isGoogleConfigured = !!googleClientId;
  const isFacebookConfigured = !!facebookAppId;

  if (isGoogleConfigured && isFacebookConfigured) {
    return null; // Don't show anything if both are configured
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-semibold">Social Login Configuration Required</p>
          <div className="space-y-1 text-sm">
            {!isGoogleConfigured && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                <span>Google Client ID not configured (VITE_GOOGLE_CLIENT_ID)</span>
              </div>
            )}
            {!isFacebookConfigured && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                <span>Facebook App ID not configured (VITE_FACEBOOK_APP_ID)</span>
              </div>
            )}
          </div>
          <p className="text-xs mt-2">
            Please check the <code>SOCIAL_LOGIN_SETUP.md</code> file for configuration instructions.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}





