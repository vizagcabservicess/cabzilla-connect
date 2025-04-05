
import { useState } from 'react';
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
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { toast } from 'sonner';

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

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Show a toast to indicate signup is in progress
      const loadingToastId = toast.loading("Creating your account...");
      
      try {
        console.log("Attempting signup with debug-login.php endpoint...");
        
        // Use the working debug-login endpoint that we know works
        const response = await fetch('/api/debug-login.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(values)
        });
        
        console.log("Signup response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`Signup failed with status: ${response.status}`);
        }
        
        // Get the response text for debugging
        const responseText = await response.text();
        console.log("Signup response text:", responseText);
        
        // Parse the response
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
        }
        
        console.log("Signup response data:", data);
        
        if (data.token) {
          // Store auth data same as login
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('user', JSON.stringify({
            ...data.user,
            name: values.name,
            email: values.email,
            phone: values.phone
          }));
          
          // Success - update the loading toast
          toast.success("Account created successfully!", { id: loadingToastId });
          
          uiToast({
            title: "Welcome to our service!",
            description: "Your account has been created successfully. You'll be redirected to your dashboard.",
            duration: 5000,
          });
          
          // Short delay before redirecting to ensure toast is seen
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        } else {
          throw new Error("Signup failed: No token received");
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
                <Input placeholder="John Doe" {...field} />
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
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Sign Up"}
        </Button>
      </form>
    </Form>
  );
}
