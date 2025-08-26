import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { SocialLoginTest } from '@/components/auth/SocialLoginTest';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export function SocialLoginTestPage() {
  const { socialLogin } = useAuth();
  const [testResults, setTestResults] = useState<{
    googleSDK: 'pending' | 'success' | 'error';
    facebookSDK: 'pending' | 'success' | 'error';
    environmentVars: 'pending' | 'success' | 'error';
    backendConnection: 'pending' | 'success' | 'error';
  }>({
    googleSDK: 'pending',
    facebookSDK: 'pending',
    environmentVars: 'pending',
    backendConnection: 'pending'
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check environment variables
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;

    setTestResults(prev => ({
      ...prev,
      environmentVars: googleClientId ? 'success' : 'error'
    }));

    // Test backend connection
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      const response = await fetch('/src/backend/php-templates/api/auth/social-login.php', {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      setTestResults(prev => ({
        ...prev,
        backendConnection: response.ok ? 'success' : 'error'
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        backendConnection: 'error'
      }));
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      toast.loading('Testing Google login...', { id: 'test-google' });
      await socialLogin('google');
      toast.success('Google login test successful!', { id: 'test-google' });
    } catch (error) {
      toast.error('Google login test failed', {
        id: 'test-google',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      toast.loading('Testing Facebook login...', { id: 'test-facebook' });
      await socialLogin('facebook');
      toast.success('Facebook login test successful!', { id: 'test-facebook' });
    } catch (error) {
      toast.error('Facebook login test failed', {
        id: 'test-facebook',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return 'Ready';
      case 'error':
        return 'Failed';
      default:
        return 'Testing...';
    }
  };

  const allTestsPassed = testResults.environmentVars === 'success' && testResults.backendConnection === 'success';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Social Login Test Page
          </h1>
          <p className="text-gray-600">
            Test and verify your Google and Facebook login integration
          </p>
        </div>

        {/* Configuration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Configuration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.environmentVars)}
                  <span>Environment Variables</span>
                </div>
                <Badge variant={testResults.environmentVars === 'success' ? 'default' : 'destructive'}>
                  {getStatusText(testResults.environmentVars)}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.backendConnection)}
                  <span>Backend Connection</span>
                </div>
                <Badge variant={testResults.backendConnection === 'success' ? 'default' : 'destructive'}>
                  {getStatusText(testResults.backendConnection)}
                </Badge>
              </div>
            </div>

            {testResults.environmentVars === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Environment variables are not properly configured. Please check your .env file.
                </AlertDescription>
              </Alert>
            )}

            {testResults.backendConnection === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Backend connection failed. Make sure your PHP server is running and the social-login.php endpoint is accessible.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

         {/* SDK Testing */}
         <Card>
           <CardHeader>
             <CardTitle>SDK Testing</CardTitle>
           </CardHeader>
           <CardContent>
             <SocialLoginTest 
               onGoogleSDKLoaded={() => setTestResults(prev => ({ ...prev, googleSDK: 'success' }))}
               onFacebookSDKLoaded={() => setTestResults(prev => ({ ...prev, facebookSDK: 'success' }))}
               onGoogleSDKError={() => setTestResults(prev => ({ ...prev, googleSDK: 'error' }))}
               onFacebookSDKError={() => setTestResults(prev => ({ ...prev, facebookSDK: 'error' }))}
             />
           </CardContent>
         </Card>

        {/* Live Testing */}
        <Card>
          <CardHeader>
            <CardTitle>Live Testing</CardTitle>
          </CardHeader>
          <CardContent>
            {allTestsPassed ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All tests passed! You can now test the actual login flow.
                  </AlertDescription>
                </Alert>
                
                <SocialLoginButtons
                  onGoogleLogin={handleGoogleLogin}
                  onFacebookLogin={handleFacebookLogin}
                  isLoading={isLoading}
                  variant="login"
                />
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please fix the configuration issues above before testing the login flow.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Environment Variables Display */}
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-mono">VITE_GOOGLE_CLIENT_ID:</span>
                <span className="font-mono text-gray-600">
                  {import.meta.env.VITE_GOOGLE_CLIENT_ID ? 
                    `${import.meta.env.VITE_GOOGLE_CLIENT_ID.substring(0, 20)}...` : 
                    'Not set'
                  }
                </span>
              </div>
                             <div className="flex justify-between">
                 <span className="font-mono">VITE_FACEBOOK_APP_ID:</span>
                 <span className="font-mono text-gray-600">
                   {import.meta.env.VITE_FACEBOOK_APP_ID || 'Not set (Optional)'}
                 </span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
