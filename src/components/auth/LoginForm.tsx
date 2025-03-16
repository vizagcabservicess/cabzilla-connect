
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
      const response = await authAPI.login(values);
      
      if (!response.token) {
        throw new Error('No token received from server');
      }
      
      console.log('Login successful, token received');
      
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
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </Form>
  );
}
