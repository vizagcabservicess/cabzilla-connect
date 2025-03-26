
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { authAPI } from '@/services/api';
import { LoginRequest } from '@/types/api';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { AlertCircle, ExternalLink, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function LoginForm() {
  const { toast: uiToast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'testing' | 'success' | 'failed'>('untested');
  const [isTesting, setIsTesting] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  useEffect(() => {
    // Display API URL for debugging
    const url = import.meta.env.VITE_API_BASE_URL || '';
    setApiUrl(url);
    
    // Clear any stale tokens on login page load
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // Only test connection on component mount if we have an API URL
    if (url) {
      testApiConnection();
    }
  }, []);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const testApiConnection = async () => {
    try {
      setConnectionStatus('testing');
      setIsTesting(true);
      console.log(`Testing API connection to ${apiUrl}`);
      
      // Try OPTIONS request first (preflight)
      const timestamp = new Date().getTime();
      const response = await fetch(`${apiUrl}/api/login.php?_t=${timestamp}`, {
        method: 'OPTIONS',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
          'X-Timestamp': timestamp.toString(),
          'X-Force-Refresh': 'true'
        },
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
        // Try GET request as fallback
        try {
          const getResponse = await fetch(`${apiUrl}/api/admin/db-connection-test.php?_t=${timestamp}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache, no-store',
              'X-Timestamp': timestamp.toString(),
              'X-Force-Refresh': 'true'
            },
            cache: 'no-store'
          });
          
          if (getResponse.ok) {
            setConnectionStatus('success');
            console.log('API connection test successful via fallback');
            
            toast.success('API connection successful via fallback test', {
              duration: 3000,
              description: `Connected to ${apiUrl}`
            });
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback connection test failed:', fallbackError);
        }
        
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

  const clearCacheAndRetry = () => {
    // Clear local data that might be causing issues
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('apiVersion');
    localStorage.removeItem('useDirectApi');
    localStorage.removeItem('useUltraEmergency');
    sessionStorage.removeItem('useDirectApi');
    sessionStorage.removeItem('useUltraEmergency');
    
    // Force timestamp update to bust cache
    localStorage.setItem('forceApiRefresh', Date.now().toString());
    sessionStorage.setItem('forceApiRefresh', Date.now().toString());
    
    // Reset error state
    setError(null);
    setLastResponse(null);
    
    // Show toast
    toast.info('Cleared cache and tokens', {
      duration: 2000
    });
    
    // Retry connection test
    setTimeout(testApiConnection, 500);
  };

  const onSubmit = async (values: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    setLastResponse(null);
    
    try {
      // Display a toast to show login is in progress
      toast.loading('Logging in...', { id: 'login-toast' });
      
      // Clear any existing tokens first
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Log form values for debugging (email only, not password)
      console.log("Login attempt with email:", values.email);
      
      // Add a timestamp to avoid caching issues
      const timestamp = new Date().getTime();
      console.log(`Login attempt timestamp: ${timestamp}`);
      
      // Use HTTP-only cookies to store authentication token
      const response = await authAPI.login(values);
      console.log("Login response:", {
        success: !!response,
        hasToken: !!response?.token,
        hasUser: !!response?.user
      });
      
      // Save response for debugging
      setLastResponse(response);
      
      if (response && response.token) {
        // Login succeeded, update toast
        toast.success('Login successful', { 
          id: 'login-toast', 
          description: `Welcome back, ${response.user?.name || 'User'}!` 
        });
        
        console.log("Login successful, token saved", { 
          tokenLength: response.token.length,
          tokenParts: response.token.split('.').length,
          user: response.user?.id
        });
        
        // Force a page reload to ensure fresh state
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } else {
        throw new Error("Authentication failed: No token received");
      }
    } catch (error) {
      console.error("Login error details:", error);
      
      // Update toast to show error
      toast.error('Login Failed', {
        id: 'login-toast',
        description: error instanceof Error ? error.message : "Authentication failed"
      });
      
      // Set error state for UI display
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
      
      {connectionStatus === 'failed' && (
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertTitle className="text-amber-800 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Connection Issues Detected
          </AlertTitle>
          <AlertDescription className="text-amber-700">
            <p className="mb-2">We're having trouble connecting to our servers. This could be due to:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Internet connectivity issues</li>
              <li>Server maintenance</li>
              <li>Network restrictions or firewalls</li>
            </ul>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearCacheAndRetry}
              className="mt-1"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Clear Cache &amp; Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="your@email.com" 
                    {...field} 
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    {...field} 
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="w-full relative" 
            disabled={isLoading || connectionStatus === 'failed' || connectionStatus === 'testing'}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : "Login"}
          </Button>
        </form>
      </Form>
      
      {lastResponse && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-gray-700">Debug Response Info</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 overflow-auto max-h-40">
              {JSON.stringify({
                hasToken: !!lastResponse?.token,
                hasUser: !!lastResponse?.user,
                status: lastResponse?.status || 'N/A',
                message: lastResponse?.message || 'N/A',
                timestamp: new Date().toISOString()
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </>
  );
}
