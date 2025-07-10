import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { poolingAPI } from '@/services/api/poolingAPI';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { AlertCircle, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'testing' | 'success' | 'failed'>('untested');
  const [isTesting, setIsTesting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Display API URL for debugging
    const url = import.meta.env.VITE_API_BASE_URL || '';
    setApiUrl(url);
    
    // Only test connection on component mount if we have an API URL
    if (url) {
      testApiConnection();
    }
  }, []);

  const testApiConnection = async () => {
    try {
      setConnectionStatus('testing');
      setIsTesting(true);
      console.log(`Testing API connection to ${apiUrl}`);
      
      // Try OPTIONS request first (preflight)
      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'OPTIONS',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        },
        // Add cache busting
        cache: 'no-store'
      });
      
      // Log response information for debugging
      console.log('API connection test response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      if (response.ok) {
        setConnectionStatus('success');
        console.log('API connection test successful');
        
        toast.success('API connection successful', {
          duration: 3000,
          description: `Connected to ${apiUrl}`
        });
      } else {
        setConnectionStatus('failed');
        console.error('API connection test failed with status:', response.status);
        
        toast.error('API connection failed', {
          description: `Server returned status ${response.status}: ${response.statusText}`,
          duration: 5000,
        });
      }
    } catch (error) {
      setConnectionStatus('failed');
      console.error('API connection test error:', error);
      
      toast.error('API Connection Failed', {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      toast.loading('Logging in...', { id: 'login-toast' });
      await login(email, password);
      toast.success('Login successful', { 
        id: 'login-toast', 
        description: `Redirecting to your dashboard...` 
      });
      // The redirect is handled by the AuthProvider/route protection
      // We can just reload or let the state update trigger it.
      // A small delay can help the user see the message.
      setTimeout(() => {
        window.location.href = '/admin'; // Or a more dynamic dashboard path
      }, 500);

    } catch (error) {
      console.error('Login error details:', error);
      toast.error('Login Failed', {
        id: 'login-toast',
        description: error instanceof Error ? error.message : 'Authentication failed'
      });
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    testApiConnection();
  };

  if (error) {
    return (
      <ApiErrorFallback 
        error={error} 
        onRetry={handleRetry}
        title="Login Failed" 
      />
    );
  }

  return (
    <>
      {apiUrl && (
        <div className="mb-4 p-2 bg-blue-50 rounded-md text-xs text-blue-700 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span>API URL: {apiUrl}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={testApiConnection}
            disabled={isTesting}
            className="gap-1"
          >
            {isTesting ? (
              <>Testing <RefreshCw className="ml-1 w-3 h-3 animate-spin" /></>
            ) : (
              <>Test <ExternalLink className="ml-1 w-3 h-3" /></>
            )}
          </Button>
        </div>
      )}
      
      {connectionStatus !== 'untested' && (
        <Alert 
          className={`mb-4 ${
            connectionStatus === 'testing' 
              ? 'bg-blue-50 border-blue-200 text-blue-800' 
              : connectionStatus === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {connectionStatus === 'testing' ? (
            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
          ) : connectionStatus === 'success' ? (
            <ShieldCheck className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription>
            {connectionStatus === 'testing' 
              ? 'Testing server connection...' 
              : connectionStatus === 'success' 
                ? 'Server connection successful. You can proceed with login.' 
                : 'Server connection failed. The API may be unavailable.'}
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Password</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || connectionStatus === 'failed' || connectionStatus === 'testing'}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </>
  );
}
