
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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function LoginForm() {
  const { toast: uiToast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Clear any existing tokens when the login form is mounted
  useEffect(() => {
    // Clear all possible storage locations to ensure clean login
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    
    // Also clear any lingering auth cookies
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    console.log('Cleared existing auth tokens for fresh login');
  }, []);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login with:', values.email);
      
      // Add timestamp to prevent cached responses
      const timestamp = new Date().getTime();
      const requestWithTimestamp = {
        ...values,
        _timestamp: timestamp
      };
      
      // Make direct fetch call to debug API connection
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com/api';
      console.log('Using API URL:', `${apiUrl}/login`);
      
      // Try a direct fetch first to diagnose any issues
      try {
        const directResponse = await fetch(`${apiUrl}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store'
          },
          body: JSON.stringify(requestWithTimestamp)
        });
        
        console.log('Direct fetch response status:', directResponse.status);
        if (!directResponse.ok) {
          const errorText = await directResponse.text();
          console.log('Error response from direct fetch:', errorText);
        }
      } catch (fetchError) {
        console.error('Direct fetch failed:', fetchError);
      }
      
      // Proceed with the original login flow
      const response = await authAPI.login(requestWithTimestamp);
      
      if (!response || !response.token) {
        throw new Error('No token received from server');
      }
      
      console.log('Login successful, token received of length:', response.token.length);
      
      // Store token in multiple places for redundancy
      localStorage.setItem('auth_token', response.token);
      sessionStorage.setItem('auth_token', response.token);
      
      // Also set as cookie with HttpOnly and Secure flags if possible
      document.cookie = `auth_token=${response.token}; path=/; max-age=${60*60*24*30}; SameSite=Strict`;
      
      toast.success("Login Successful", {
        description: "Welcome back!",
        duration: 3000,
      });
      
      uiToast({
        title: "Login Successful",
        description: "Welcome back!",
        duration: 3000,
      });
      
      // Short delay before navigation to ensure token is properly saved
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (error) {
      console.error('Login failed:', error);
      setError(error as Error);
      
      let errorMessage = error instanceof Error 
        ? error.message 
        : "Something went wrong. Please try again.";
        
      // Special handling for common auth errors
      if (errorMessage.includes('401') || errorMessage.includes('Invalid email or password')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (errorMessage.includes('network') || errorMessage.includes('failed')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error("Login Failed", {
        description: errorMessage,
        duration: 5000,
      });
      
      uiToast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prevCount => prevCount + 1);
    // Try to clear any browser cache issues
    window.location.reload();
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
        <div className="text-xs text-gray-500 mb-2">
          API URL: {import.meta.env.VITE_API_BASE_URL || 'Using default URL'}
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </Form>
  );
}
