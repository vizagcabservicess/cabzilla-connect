import React from 'react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';

interface SocialLoginButtonsProps {
  onGoogleLogin: () => void;
  onFacebookLogin: () => void;
  isLoading?: boolean;
  variant?: 'login' | 'signup';
}

export function SocialLoginButtons({ 
  onGoogleLogin, 
  onFacebookLogin, 
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
      
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onFacebookLogin}
        disabled={isLoading}
      >
        <FaFacebook className="mr-2 h-4 w-4 text-blue-600" />
        Continue with Facebook
      </Button>
    </div>
  );
}
