import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import type { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { BRAND_GREEN } from '@/components/shared-carpooling/constants';
import { carpoolSignupPath } from '@/components/shared-carpooling/carpoolAuthRoutes';
import { getPostOtpVerificationPath } from '@/components/shared-carpooling/verificationRoutes';
import { useAuth } from '@/providers/AuthProvider';
import { useCarpoolUser } from '@/providers/CarpoolUserProvider';
import { sharedCarpoolUserAPI } from '@/services/api/sharedCarpoolAPI';
import { getAuthErrorMessage } from '@/lib/authLogic';

export default function SharedCarpoolEmailLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setSession } = useCarpoolUser();
  const [params] = useSearchParams();
  const returnTo = params.get('return') || '/shared-carpooling/home';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (!res.success) {
        toast.error(res.error || res.message || 'Login failed');
        return;
      }

      toast.success('Welcome back!');
      const digits = (res.user?.phone ?? '').replace(/\D/g, '').slice(-10);
      if (digits.length < 10) {
        toast.error('No phone on your account. Please sign up for carpooling first.');
        navigate(carpoolSignupPath(returnTo));
        return;
      }

      try {
        const session = await sharedCarpoolUserAPI.getProfile(digits);
        setSession(session);
        navigate(getPostOtpVerificationPath(session, returnTo));
      } catch {
        toast.error('No carpool account found. Sign up once — WhatsApp OTP is only required during signup.');
        navigate(carpoolSignupPath(returnTo));
      }
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ email_verification_required?: boolean }>;
      if (axiosErr.response?.data?.email_verification_required) {
        toast.error('Please verify your email first, then log in again.');
      } else {
        toast.error(getAuthErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Login with Email | Vizag Taxi Hub</title></Helmet>
      <CarpoolAppHeader showBack title="Login with Email" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Use your email and password — no WhatsApp OTP needed</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: BRAND_GREEN }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Login
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link to={`/shared-carpooling/auth/signup?return=${encodeURIComponent(returnTo)}`} className="font-semibold" style={{ color: BRAND_GREEN }}>
            Sign up
          </Link>
        </p>
        <p className="mt-3 text-center text-sm">
          <Link to={`/shared-carpooling/auth/forgot-password?return=${encodeURIComponent(returnTo)}`} className="text-gray-500 hover:text-gray-800">
            Forgot password?
          </Link>
        </p>
      </main>
    </>
  );
}
