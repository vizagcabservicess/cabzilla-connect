import { Link } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { SocialLogin } from '@/components/SocialLogin';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  return (
    <div className="container mx-auto py-20 px-4">
      <div className="flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-medium">Log in to your account</h1>
            <p className="mt-2 text-gray-600">
              Welcome back! Please enter your details
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <LoginForm />
            
            <div className="mt-6">
              <Separator className="my-4" />
              
              <SocialLogin />
              
              <p className="text-center mt-6 text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-800">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
