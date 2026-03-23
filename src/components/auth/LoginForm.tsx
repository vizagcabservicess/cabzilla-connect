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
import { PhonePromptModal } from './PhonePromptModal';
import { getDashboardUrl } from '@/utils/authUtils';
import { getAuthErrorMessage, isEmailVerificationError } from '@/lib/authLogic';

export function LoginForm() {
  const { login, socialLogin, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [pendingDashboardUrl, setPendingDashboardUrl] = useState<string | null>(null);
  const [phoneSubmitLoading, setPhoneSubmitLoading] = useState(false);

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
    } catch (error: any) {
      if (isEmailVerificationError(error)) {
        toast.error('Email verification required', {
          id: 'login-toast',
          description: 'Please verify your email address before logging in. Check your inbox for a verification email.',
          action: {
            label: 'Resend Email',
            onClick: () => navigate('/verify-email', { state: { email } })
          }
        });
      } else {
        toast.error('Login failed', {
          id: 'login-toast',
          description: getAuthErrorMessage(error)
        });
      }
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
      
      toast.success('Google login successful', { 
        id: 'social-login-toast', 
        description: `Redirecting to your dashboard...` 
      });
      
      const user = response?.user || null;
      const dashboardUrl = getDashboardUrl(user);
      const needsPhone = user && (!user.phone || String(user.phone).trim() === '');
      
      if (needsPhone) {
        setPendingDashboardUrl(dashboardUrl);
        setShowPhonePrompt(true);
      } else {
        setTimeout(() => navigate(dashboardUrl), 500);
      }
    } catch (error) {
      toast.error('Google login failed', {
        id: 'social-login-toast',
        description: getAuthErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (phone: string) => {
    setPhoneSubmitLoading(true);
    try {
      await updateProfile({ phone });
      toast.success('Phone number saved');
      if (pendingDashboardUrl) {
        navigate(pendingDashboardUrl);
        setPendingDashboardUrl(null);
      }
      setShowPhonePrompt(false);
    } finally {
      setPhoneSubmitLoading(false);
    }
  };

  const handlePhoneSkip = () => {
    if (pendingDashboardUrl) {
      navigate(pendingDashboardUrl);
      setPendingDashboardUrl(null);
    }
    setShowPhonePrompt(false);
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

      <PhonePromptModal
        open={showPhonePrompt}
        onClose={handlePhoneSkip}
        onSubmit={handlePhoneSubmit}
        isLoading={phoneSubmitLoading}
      />
    </>
  );
}
