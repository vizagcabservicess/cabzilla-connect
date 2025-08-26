import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function GoogleOAuthTest() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  const testGoogleOAuth = async () => {
    setStatus('testing');
    setError('');

    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const origin = window.location.origin;
      
      console.log('Testing Google OAuth configuration:');
      console.log('Client ID:', clientId);
      console.log('Origin:', origin);
      
      // Load Google SDK if not already loaded
      if (!window.google) {
        console.log('Loading Google SDK...');
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            console.log('Google SDK loaded successfully');
            resolve();
          };
          script.onerror = (error) => {
            console.error('Failed to load Google SDK:', error);
            reject(new Error('Failed to load Google SDK'));
          };
          document.head.appendChild(script);
        });
      }

      // Test if Google accounts API is available
      if (!window.google?.accounts?.id) {
        throw new Error('Google Accounts API not available');
      }

      // Test initialization only - don't try to render button or trigger OAuth
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          // This callback should never be called in this test
          console.log('Unexpected callback triggered:', response);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false
      });
      
      // If we get here, the configuration is working
      setStatus('success');
      
    } catch (err) {
      console.error('Google OAuth test failed:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google OAuth Configuration Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Test your Google OAuth configuration to ensure it's working properly.
          </p>
          
          <div className="text-xs space-y-1">
            <div><strong>Client ID:</strong> {import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}</div>
            <div><strong>Origin:</strong> {window.location.origin}</div>
          </div>
        </div>

        <Button 
          onClick={testGoogleOAuth} 
          disabled={status === 'testing'}
          className="w-full"
        >
          {status === 'testing' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Google OAuth Configuration'
          )}
        </Button>

        {status === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Google OAuth configuration is working correctly!
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Google OAuth test failed: {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
