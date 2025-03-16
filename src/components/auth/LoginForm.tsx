
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { authAPI, loadToken } from '@/services/api';
import { LoginRequest } from '@/types/api';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function LoginForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Clear all caches on component mount to ensure fresh state
  useEffect(() => {
    // Clear sessionStorage of any potential stale data
    Object.keys(sessionStorage).forEach(key => {
      if (key !== 'auth_token') {
        sessionStorage.removeItem(key);
      }
    });
    
    // Also clear localStorage of any stale caches
    const keysToPreserve = ['auth_token', 'user_data'];
    Object.keys(localStorage).forEach(key => {
      if (!keysToPreserve.includes(key)) {
        localStorage.removeItem(key);
      }
    });
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
    setLoginAttempts(prev => prev + 1);
    
    console.log(`Login attempt ${loginAttempts + 1} for email: ${values.email}`);
    
    try {
      // Show loading toast
      toast({
        title: "Logging in...",
        description: "Please wait while we verify your credentials",
        duration: 3000,
      });
      
      const response = await authAPI.login(values);
      
      // Store user data in localStorage and sessionStorage as backup
      if (response.user) {
        localStorage.setItem('user_data', JSON.stringify(response.user));
        sessionStorage.setItem('user_data', JSON.stringify(response.user));
      }
      
      // Show success toast with useToast hook
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to dashboard...",
        duration: 3000,
      });
      
      // Also use Sonner toast for additional visibility
      sonnerToast.success("Login successful", {
        description: "Welcome back! Redirecting to dashboard...",
        duration: 3000,
      });
      
      // Double-check token was properly set
      if (!loadToken()) {
        // If token wasn't properly set in headers, try again
        console.warn("Token not properly set in headers, attempting to reload token");
        setTimeout(loadToken, 500);
      }
      
      // Short delay before redirect to ensure token is properly stored
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (error) {
      setError(error as Error);
      
      // Show error toast with useToast hook
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
        duration: 5000,
      });
      
      // Also use Sonner toast for additional visibility
      sonnerToast.error("Login failed", {
        description: error instanceof Error ? error.message : "Something went wrong",
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
