import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { socialAuthService } from '@/services/socialAuthService';

interface SocialLoginTestProps {
  onGoogleSDKLoaded?: () => void;
  onFacebookSDKLoaded?: () => void;
  onGoogleSDKError?: () => void;
  onFacebookSDKError?: () => void;
}

export function SocialLoginTest({
  onGoogleSDKLoaded,
  onFacebookSDKLoaded,
  onGoogleSDKError,
  onFacebookSDKError
}: SocialLoginTestProps = {}) {
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [facebookStatus, setFacebookStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  const testGoogleSDK = async () => {
    setGoogleStatus('testing');
    setError('');
    
    try {
      await socialAuthService.initGoogleSDK();
      setGoogleStatus('success');
      onGoogleSDKLoaded?.();
    } catch (err) {
      setGoogleStatus('error');
      setError(err instanceof Error ? err.message : 'Google SDK initialization failed');
      onGoogleSDKError?.();
    }
  };

  const testFacebookSDK = async () => {
    setFacebookStatus('testing');
    setError('');
    
    try {
      await socialAuthService.initFacebookSDK();
      setFacebookStatus('success');
      onFacebookSDKLoaded?.();
    } catch (err) {
      setFacebookStatus('error');
      setError(err instanceof Error ? err.message : 'Facebook SDK initialization failed');
      onFacebookSDKError?.();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'testing':
        return <AlertCircle className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'SDK Loaded Successfully';
      case 'error':
        return 'SDK Loading Failed';
      case 'testing':
        return 'Loading SDK...';
      default:
        return 'Not Tested';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Social Login SDK Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FcGoogle className="h-5 w-5" />
              <span className="font-medium">Google SDK</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(googleStatus)}
              <span className="text-sm">{getStatusText(googleStatus)}</span>
            </div>
          </div>
          <Button 
            onClick={testGoogleSDK} 
            disabled={googleStatus === 'testing'}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Test Google SDK
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaFacebook className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Facebook SDK</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(facebookStatus)}
              <span className="text-sm">{getStatusText(facebookStatus)}</span>
            </div>
          </div>
          <Button 
            onClick={testFacebookSDK} 
            disabled={facebookStatus === 'testing'}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Test Facebook SDK
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Make sure you have set up your environment variables:</p>
          <p className="font-mono">VITE_GOOGLE_CLIENT_ID=your_client_id</p>
          <p className="font-mono">VITE_FACEBOOK_APP_ID=your_app_id</p>
          <p>• Check the browser console for detailed error messages</p>
        </div>
      </CardContent>
    </Card>
  );
}
