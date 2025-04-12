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
import { AlertCircle, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [loginAttempts, setLoginAttempts] = useState(0);

  useEffect(() => {
    // Display API URL for debugging
    const url = window.location.origin;
    setApiUrl(url);
    
    // Clear any stale tokens on login page load
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('userData');
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

  const onSubmit = async (values: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    setLoginAttempts(prev => prev + 1);
    
    try {
      // Display a toast to show login is in progress
      toast.loading('Logging in...', { id: 'login-toast' });
      
      // Clear any existing tokens first
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('userData');
      localStorage.removeItem('user');
      
      // Log form values for debugging (only email for privacy)
      console.log("Login attempt with email:", values.email);
      
      // Attempt login
      const response = await authAPI.login(values);
      
      if (response && response.token) {
        // Login succeeded, update toast
        toast.success('Login successful', { 
          id: 'login-toast', 
          description: `Welcome back, ${response.user?.name || 'User'}!` 
        });
        
        console.log("Login successful, redirecting to dashboard", { 
          user: response.user?.id,
          role: response.user?.role
        });
        
        // Ensure the token is saved before redirecting
        localStorage.setItem('authToken', response.token);
        
        // Add a slight delay before redirecting to ensure token is saved
        setTimeout(() => {
          // Navigate to dashboard - don't use window.location.href to avoid full page reload
          navigate('/dashboard');
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
      
      // If we've tried multiple times and keep failing, suggest fallback credentials
      if (loginAttempts >= 2) {
        uiToast({
          title: "Login Suggestion",
          description: "Try using demo@example.com with password: password123",
          variant: "default"
        });
      }
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || connectionStatus === 'failed' || connectionStatus === 'testing'}
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </Form>
      
      {loginAttempts > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>For demo access, use:</p>
          <p className="font-medium">email: demo@example.com</p>
          <p className="font-medium">password: password123</p>
        </div>
      )}
    </>
  );
}
