import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { authAPI } from '@/services/api/authAPI';
import { SignupRequest } from '@/types/api';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { toast } from 'sonner';
import { UserRole } from '@/types/pooling';

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function SignupForm() {
  const { toast: uiToast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const form = useForm<SignupRequest>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignupRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Show a toast to indicate signup is in progress
      const loadingToastId = toast.loading("Creating your account...");
      
      try {
        const response = await authAPI.signup({ ...values, role: 'customer' });
        console.log('Registration API response:', response);

        if (response && response.email_verification_required) {
          // Email verification required - update the loading toast
          toast.success("Account created successfully!", { id: loadingToastId });
          uiToast({
            title: "Email Verification Required",
            description: "Please check your email and click the verification link to activate your account.",
            duration: 8000,
          });
          // Redirect to email verification page or show verification message
          setTimeout(() => {
            navigate('/verify-email', { state: { email: values.email } });
          }, 1000);
        } else if (response && response.message.includes('successful')) {
          // Success - update the loading toast
          toast.success("Account created successfully!", { id: loadingToastId });
          uiToast({
            title: "Welcome to our service!",
            description: "Your account has been created successfully. You'll be redirected to your dashboard.",
            duration: 5000,
          });
          // Short delay before redirecting to ensure toast is seen
          setTimeout(() => {
            navigate('/login');
          }, 1000);
        } else {
          // Show backend error message if available
          toast.error("Signup failed", { id: loadingToastId });
          throw new Error(response?.error || response?.message || 'Registration failed');
        }
      } catch (signupError) {
        // Update the loading toast to show error
        toast.error("Signup failed", { id: loadingToastId });
        throw signupError;
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError(error as Error);
      
      uiToast({
        title: "Signup Failed",
        description: error instanceof Error ? error.message : "Something went wrong during signup",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    form.clearErrors();
  };

  if (error) {
    return (
      <ApiErrorFallback 
        error={error} 
        onRetry={handleRetry}
        title="Signup Failed" 
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your@email.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="1234567890" type="tel" {...field} />
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
        
        {/* Legal Disclaimer */}
        <div className="text-xs text-gray-600 text-center mt-4">
          By proceeding, you agree to Vizag Taxi Hub's{' '}
          <Link to="/privacy-policy" className="text-blue-600 hover:text-blue-800 underline">
            Privacy Policy
          </Link>
          ,{' '}
          <Link to="/user-agreement" className="text-blue-600 hover:text-blue-800 underline">
            User Agreement
          </Link>
          {' '}and{' '}
          <Link to="/terms-conditions" className="text-blue-600 hover:text-blue-800 underline">
            Terms & Conditions
          </Link>
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Sign Up"}
        </Button>
      </form>
    </Form>
  );
}
