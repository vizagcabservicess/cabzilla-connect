
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
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
import { AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function LoginForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'failed'>('untested');

  useEffect(() => {
    // Display API URL for debugging
    const url = import.meta.env.VITE_API_BASE_URL || '';
    setApiUrl(url);
    
    // Clear any stale tokens on login page load
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    
    // Test connection on component mount
    testApiConnection();
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
      console.log(`Testing API connection to ${apiUrl}`);
      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'OPTIONS',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        setConnectionStatus('success');
        console.log('API connection test successful');
      } else {
        setConnectionStatus('failed');
        console.error('API connection test failed with status:', response.status);
      }
      
      toast({
        title: `API Connection: ${response.ok ? 'Successful' : 'Failed'}`,
        description: `Connection to ${apiUrl} ${response.ok ? 'succeeded' : `failed with status ${response.status}`}`,
        duration: 5000,
      });
    } catch (error) {
      setConnectionStatus('failed');
      console.error('API connection test error:', error);
      
      toast({
        title: "API Connection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const onSubmit = async (values: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Clear any existing tokens first
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      
      // Log form values for debugging
      console.log("Login attempt with email:", values.email);
      
      const response = await authAPI.login(values);
      
      if (response.token) {
        // Store token in multiple places for redundancy
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('auth_token', response.token);
        sessionStorage.setItem('auth_token', response.token);
        
        console.log("Login successful, token saved", { 
          tokenLength: response.token.length,
          user: response.user?.id
        });
        
        // Store user data
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }
        
        toast({
          title: "Login Successful",
          description: "Welcome back!",
          duration: 3000,
        });
        
        // Force page reload to ensure fresh state
        window.location.href = '/dashboard';
      } else {
        throw new Error("Authentication failed: No token received");
      }
    } catch (error) {
      console.error("Login error details:", error);
      setError(error as Error);
      
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
        duration: 5000,
      });
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
          <Button variant="ghost" size="sm" onClick={testApiConnection}>
            Test <ExternalLink className="ml-1 w-3 h-3" />
          </Button>
        </div>
      )}
      
      {connectionStatus !== 'untested' && (
        <Alert 
          className={`mb-4 ${connectionStatus === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
        >
          {connectionStatus === 'success' ? (
            <ShieldCheck className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription>
            {connectionStatus === 'success' 
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
                  <Input placeholder="your@email.com" {...field} />
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
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading || connectionStatus === 'failed'}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </Form>
    </>
  );
}
