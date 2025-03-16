
import { useState } from 'react';
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
      // Clear all storage first to avoid conflicts
      localStorage.clear();
      sessionStorage.clear();
      
      // Also clear any existing cookies that might interfere
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Clear any existing tokens first
      authAPI.logout(false); // Don't redirect on logout
      
      console.log('Attempting login with credentials:', { email: values.email, passwordLength: values.password.length });
      
      // Attempt login with a slight delay to ensure cleanup is complete
      setTimeout(async () => {
        try {
          // Add a cache-busting parameter to the request
          const timestamp = new Date().getTime();
          const response = await authAPI.login({
            ...values,
            _: timestamp // Add cache-busting timestamp
          });
          
          console.log('Login response received:', { 
            status: response.status, 
            hasToken: !!response.token,
            tokenLength: response.token ? response.token.length : 0
          });
          
          if (!response.token) {
            throw new Error('No token received from server');
          }
          
          // Immediate verification of token to ensure it's valid
          const isValid = authAPI.verifyToken(response.token);
          if (!isValid) {
            throw new Error('Received token is invalid');
          }
          
          // Add additional success messages and notifications
          toast.success("Login Successful", {
            description: "Welcome back!",
            duration: 3000,
          });
          
          uiToast({
            title: "Login Successful",
            description: "Welcome back!",
            duration: 3000,
          });
          
          console.log("Login successful, navigating to dashboard");
          
          // Use a slight delay to ensure token is properly set before navigation
          setTimeout(() => {
            navigate('/dashboard');
          }, 300);
        } catch (error) {
          handleLoginError(error);
        } finally {
          setIsLoading(false);
        }
      }, 100);
      
    } catch (error) {
      handleLoginError(error);
      setIsLoading(false);
    }
  };
  
  const handleLoginError = (error: any) => {
    console.error("Login failed:", error);
    setError(error instanceof Error ? error : new Error(String(error)));
    
    // Show error in both toast systems for reliability
    toast.error("Login Failed", {
      description: error instanceof Error ? error.message : "Something went wrong",
      duration: 5000,
    });
    
    uiToast({
      title: "Login Failed",
      description: error instanceof Error ? error.message : "Something went wrong",
      variant: "destructive",
      duration: 5000,
    });
  };

  const handleRetry = () => {
    setError(null);
    form.reset();
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
