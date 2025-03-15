
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface SocialLoginProps {
  onLoginSuccess?: (userData: any) => void;
}

export function SocialLogin({ onLoginSuccess }: SocialLoginProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    toast({
      title: "Login Feature",
      description: "Google login will be integrated with Firebase. This is a UI placeholder.",
      duration: 3000,
    });
    
    // Simulate successful login after a delay
    setTimeout(() => {
      const mockUserData = {
        id: 'google-user-123',
        name: 'Demo User',
        email: 'demo@example.com',
        photoURL: 'https://via.placeholder.com/150',
        provider: 'google'
      };
      
      // Store user data in localStorage for persistence
      localStorage.setItem('userData', JSON.stringify(mockUserData));
      
      if (onLoginSuccess) {
        onLoginSuccess(mockUserData);
      }
      
      setIsLoading(false);
    }, 1500);
  };
  
  const handleFacebookLogin = () => {
    setIsLoading(true);
    toast({
      title: "Login Feature",
      description: "Facebook login will be integrated with Firebase. This is a UI placeholder.",
      duration: 3000,
    });
    
    // Simulate successful login after a delay
    setTimeout(() => {
      const mockUserData = {
        id: 'facebook-user-456',
        name: 'Demo User',
        email: 'demo@example.com',
        photoURL: 'https://via.placeholder.com/150',
        provider: 'facebook'
      };
      
      // Store user data in localStorage for persistence
      localStorage.setItem('userData', JSON.stringify(mockUserData));
      
      if (onLoginSuccess) {
        onLoginSuccess(mockUserData);
      }
      
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"
          />
        </svg>
        Continue with Google
      </Button>
      
      <Button
        type="button"
        variant="outline"
        onClick={handleFacebookLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
          />
        </svg>
        Continue with Facebook
      </Button>
    </div>
  );
}
