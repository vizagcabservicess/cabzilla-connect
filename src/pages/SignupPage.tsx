import { Link } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/providers/AuthProvider';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const { socialLogin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Signing up with Google...",
        description: "Please complete the Google signup process.",
      });
      await socialLogin('google');
      toast({
        title: "Registration Successful",
        description: "Your account has been created with Google. Welcome!",
      });
      navigate('/admin');
    } catch (error: any) {
      toast({
        title: "Google Signup Failed",
        description: error.response?.data?.error || "Failed to create account with Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Signing up with Facebook...",
        description: "Please complete the Facebook signup process.",
      });
      await socialLogin('facebook');
      toast({
        title: "Registration Successful",
        description: "Your account has been created with Facebook. Welcome!",
      });
      navigate('/admin');
    } catch (error: any) {
      toast({
        title: "Facebook Signup Failed",
        description: error.response?.data?.error || "Failed to create account with Facebook",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-20 px-4">
      <div className="flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-medium">Create an account</h1>
            <p className="mt-2 text-gray-600">
              Sign up to manage your bookings and get special offers
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <SignupForm />
            
            <div className="mt-6">
              <Separator className="my-4" />
              
              <SocialLoginButtons
                onGoogleLogin={handleGoogleSignup}
                onFacebookLogin={handleFacebookSignup}
                isLoading={isLoading}
                variant="signup"
              />
              
              <p className="text-center mt-6 text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-800">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
