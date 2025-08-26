import React from 'react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';

interface SocialLoginButtonsProps {
  onGoogleLogin: () => void;
  isLoading?: boolean;
  variant?: 'login' | 'signup';
}

export function SocialLoginButtons({ 
  onGoogleLogin, 
  isLoading = false,
  variant = 'login'
}: SocialLoginButtonsProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">
            Or continue with
          </span>
        </div>
      </div>
      
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogleLogin}
        disabled={isLoading}
      >
        <FcGoogle className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>
    </div>
  );
}
