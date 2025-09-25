import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { useAuth } from '@/providers/AuthProvider';
import { SocialLoginButtons } from './SocialLoginButtons';
import { SocialLoginConfigCheck } from './SocialLoginConfigCheck';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { getDashboardUrl } from '@/utils/authUtils';

export function LoginForm() {
  const { login, socialLogin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      toast.loading('Logging in...', { id: 'login-toast' });
      const response = await login(email, password);
      
      toast.success('Login successful', { 
        id: 'login-toast', 
        description: `Redirecting to your dashboard...` 
      });
      
      // Get the user from the response or from the auth context
      const user = response?.user || null;
      
      // Redirect based on user role
      setTimeout(() => {
        const dashboardUrl = getDashboardUrl(user);
        navigate(dashboardUrl);
      }, 500);
    } catch (error) {
      toast.error('Login failed', {
        id: 'login-toast',
        description: error instanceof Error ? error.message : 'Authentication failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      toast.loading('Signing in with Google...', { id: 'social-login-toast' });
      const response = await socialLogin('google');
      
      // Check if user needs to sign up first
      if (response.redirect_to_signup) {
        toast.dismiss('social-login-toast');
        toast.error('Account not found', {
          id: 'social-login-toast',
          description: 'Please sign up first before using Google login'
        });
        
        // Store social data for signup
        localStorage.setItem('social_signup_data', JSON.stringify(response.social_data));
        
        // Redirect to signup page
        setTimeout(() => {
          navigate('/register');
        }, 1000);
        return;
      }
      
      toast.success('Google login successful', { 
        id: 'social-login-toast', 
        description: `Redirecting to your dashboard...` 
      });
      
      // Get the user from the response or from the auth context
      const user = response?.user || null;
      
      // Redirect based on user role
      setTimeout(() => {
        const dashboardUrl = getDashboardUrl(user);
        navigate(dashboardUrl);
      }, 500);
    } catch (error) {
      toast.error('Google login failed', {
        id: 'social-login-toast',
        description: error instanceof Error ? error.message : 'Authentication failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPasswordForm
        onBack={() => setShowForgotPassword(false)}
        onSuccess={() => setShowForgotPassword(false)}
      />
    );
  }

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
      <SocialLoginConfigCheck />
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Password</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="text-sm text-blue-600 hover:text-blue-500 underline"
        >
          Forgot your password?
        </button>
      </div>

      <div className="mt-8">
        <SocialLoginButtons
          onGoogleLogin={handleGoogleLogin}
          isLoading={isLoading}
          variant="login"
        />
      </div>
    </>
  );
}
