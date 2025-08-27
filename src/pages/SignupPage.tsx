import { Link } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/providers/AuthProvider';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getDashboardUrl } from '@/utils/authUtils';
import { authAPI } from '@/services/api/authAPI';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function SignupPage() {
  const { socialSignup, socialSignupWithData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [socialData, setSocialData] = useState<any>(null);

  // Check if user was redirected from login with social data
  useEffect(() => {
    const storedSocialData = localStorage.getItem('social_signup_data');
    if (storedSocialData) {
      try {
        const parsedData = JSON.parse(storedSocialData);
        setSocialData(parsedData);
        toast({
          title: "Complete Your Signup",
          description: `Please complete your signup with ${parsedData.provider}.`,
        });
      } catch (error) {
        console.error('Error parsing social data:', error);
      }
    }
  }, [toast]);

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Signing up with Google...",
        description: "Please complete the Google signup process.",
      });
      
      // Use stored social data if available, otherwise get new data
      let signupData = socialData;
      if (!signupData || signupData.provider !== 'google') {
        // Get fresh Google data
        const response = await socialSignup('google');
        signupData = response;
      } else {
        // Use stored data and clear it
        localStorage.removeItem('social_signup_data');
        
        // Create the signup data object with all required fields
        // Map the fields correctly: 'id' should be 'providerId'
        const signupRequest = {
          provider: signupData.provider,
          providerId: signupData.providerId || signupData.id, // Use providerId if available, fallback to id
          email: signupData.email,
          name: signupData.name,
          picture: signupData.picture,
          phone: signupData.phone || ''
        };
        
        // Call the social signup API with stored data
        const response = await socialSignupWithData(signupRequest);
        signupData = response;
      }
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created with Google. Welcome!",
      });
      
      // Redirect based on user role
      const user = signupData?.user || null;
      const dashboardUrl = getDashboardUrl(user);
      navigate(dashboardUrl);
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

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar />
      
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
      
      <Footer />
    </div>
  );
}
