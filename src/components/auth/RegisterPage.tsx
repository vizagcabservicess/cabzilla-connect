
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { authAPI } from '@/services/api/authAPI';
import { Car, Eye, EyeOff } from 'lucide-react';
import { SocialLoginButtons } from './SocialLoginButtons';
import { useAuth } from '@/providers/AuthProvider';
import { SocialLoginConfigCheck } from './SocialLoginConfigCheck';

export function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { socialLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authAPI.signup(formData);
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created. Please sign in.",
      });

      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.response?.data?.error || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Car className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <p className="text-gray-600">Join our pooling community</p>
        </CardHeader>
        <CardContent>
          <SocialLoginConfigCheck />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Input
                type="tel"
                placeholder="Phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <SocialLoginButtons
            onGoogleLogin={handleGoogleSignup}
            onFacebookLogin={handleFacebookSignup}
            isLoading={isLoading}
            variant="signup"
          />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
