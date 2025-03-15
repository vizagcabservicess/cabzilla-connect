
import { Link } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';
import { SocialLogin } from '@/components/SocialLogin';
import { Separator } from '@/components/ui/separator';

export default function SignupPage() {
  return (
    <div className="container mx-auto py-20 px-4">
      <div className="flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="mt-2 text-gray-600">
              Sign up to manage your bookings and get special offers
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <SignupForm />
            
            <div className="mt-6">
              <Separator className="my-4" />
              
              <SocialLogin />
              
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
