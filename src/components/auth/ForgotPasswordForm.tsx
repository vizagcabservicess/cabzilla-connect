import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

interface ForgotPasswordFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function ForgotPasswordForm({ onBack, onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setIsSubmitted(true);
        toast.success('Reset link sent!', {
          description: 'Check your email for password reset instructions.'
        });
      } else {
        throw new Error(data.message || 'Failed to send reset link');
      }
    } catch (error) {
      toast.error('Failed to send reset link', {
        description: error instanceof Error ? error.message : 'Please try again later.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Check your email</h3>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={onSuccess}
            className="w-full"
          >
            Back to Login
          </Button>
          <Button
            onClick={() => setIsSubmitted(false)}
            variant="outline"
            className="w-full"
          >
            Try different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Forgot your password?</h3>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            disabled={isLoading || !email}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </Button>
          
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
        </div>
      </form>
    </div>
  );
}
