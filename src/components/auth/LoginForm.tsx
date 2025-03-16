
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
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

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
  const [debugMode, setDebugMode] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  useEffect(() => {
    // Display API URL for debugging
    const url = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com/api';
    setApiUrl(url);
    
    // Clear any stale tokens on login page load
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    
    // Check for existing error state in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error')) {
      setDebugMode(true);
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
    setConnectionTested(true);
    try {
      // Test multiple endpoints
      const endpoints = [
        '/login',
        '/api/login',
        '/signup',
        '/api/signup',
        '/user/dashboard',
        '/api/user/dashboard'
      ];
      
      let successCount = 0;
      let failCount = 0;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Testing endpoint: ${apiUrl}${endpoint}`);
          
          const response = await fetch(`${apiUrl}${endpoint}`, {
            method: 'OPTIONS',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            }
          });
          
          console.log(`Endpoint ${endpoint} status:`, response.status);
          
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`Error testing ${endpoint}:`, err);
          failCount++;
        }
      }
      
      toast.success(`API Connection Test Results`, {
        description: `${successCount} endpoints accessible, ${failCount} failed`,
        duration: 5000,
      });
      
      // Try login directly
      try {
        const loginResponse = await fetch(`${apiUrl}/login`, {
          method: 'OPTIONS',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
        uiToast({
          title: `Login Endpoint Test: ${loginResponse.status}`,
          description: loginResponse.ok 
            ? "Login endpoint is accessible"
            : "Login endpoint is not accessible with OPTIONS request",
          duration: 5000,
        });
      } catch (error) {
        uiToast({
          title: "Login Endpoint Test Failed",
          description: error instanceof Error ? error.message : "Unknown network error",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      uiToast({
        title: "API Connectivity Test Failed",
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
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      
      // Log form values for debugging
      console.log("Login attempt with:", { email: values.email, passwordLength: values.password.length });
      
      // Show toast to indicate attempt
      toast.loading("Logging in...", { id: "login-attempt" });
      
      const response = await authAPI.login(values);
      
      if (response.token) {
        // Store token in localStorage and a backup in sessionStorage
        localStorage.setItem('auth_token', response.token);
        sessionStorage.setItem('auth_token', response.token); // Backup storage
        
        console.log("Login successful, token saved", { 
          tokenLength: response.token.length,
          user: response.user?.id
        });
        
        // Set a cookie as an additional backup (not used by the app, just for debugging)
        document.cookie = `auth_token_backup=${response.token.substring(0, 20)}...; path=/; max-age=1209600`;
        
        toast.success("Login Successful", {
          description: "Welcome back!",
          id: "login-attempt",
          duration: 3000,
        });
        
        // Force page reload to ensure fresh state
        window.location.href = '/dashboard';
      } else {
        toast.error("Authentication Failed", {
          description: "No token received",
          id: "login-attempt",
        });
        throw new Error("Authentication failed: No token received");
      }
    } catch (error) {
      console.error("Login error details:", error);
      setError(error as Error);
      
      toast.error("Login Failed", {
        description: error instanceof Error ? error.message : "Something went wrong",
        id: "login-attempt",
      });
      
      uiToast({
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
    testApiConnection(); // Auto-test connection on retry
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
      <div className="mb-4 p-2 bg-blue-50 rounded-md text-xs text-blue-700 flex items-center justify-between">
        <div className="flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          <span>API URL: {apiUrl}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={testApiConnection}>
          {connectionTested ? <RefreshCw className="w-3 h-3 mr-1" /> : null}
          Test API <ExternalLink className="ml-1 w-3 h-3" />
        </Button>
      </div>
      
      {debugMode && (
        <div className="mb-4 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-xs text-amber-700 mb-1">Debug Information:</p>
          <ul className="text-xs text-amber-800 list-disc pl-4">
            <li>Current URL: {window.location.href}</li>
            <li>Browser: {navigator.userAgent}</li>
            <li>Time: {new Date().toLocaleString()}</li>
            <li>Auth token present: {Boolean(localStorage.getItem('auth_token')) ? "Yes" : "No"}</li>
          </ul>
        </div>
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
          
          {debugMode && (
            <div className="text-xs text-gray-500 text-center mt-2">
              <button 
                type="button" 
                onClick={() => window.location.reload()} 
                className="text-blue-600 hover:underline"
              >
                Refresh page
              </button>
              {" | "}
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')} 
                className="text-blue-600 hover:underline"
              >
                Try dashboard directly
              </button>
            </div>
          )}
        </form>
      </Form>
    </>
  );
}
