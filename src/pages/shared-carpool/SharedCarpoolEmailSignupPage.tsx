import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import type { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { BRAND_GREEN } from '@/components/shared-carpooling/constants';
import { carpoolLoginPath, carpoolOtpSignupPath } from '@/components/shared-carpooling/carpoolAuthRoutes';
import { authAPI } from '@/services/api/authAPI';
import { getAuthErrorMessage } from '@/lib/authLogic';
export default function SharedCarpoolEmailSignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('return') || '/shared-carpooling/home';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const goToWhatsAppVerify = (digits: string) => {
    navigate(carpoolOtpSignupPath(returnTo, digits, name.trim()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('Please accept the Terms & Conditions');
      return;
    }

    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length < 10) {
      toast.error('Enter a valid 10-digit WhatsApp number');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    let accountReady = false;

    try {
      const res = await authAPI.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: digits,
        role: 'customer',
      });

      if (!res.success) {
        toast.error(res.error || res.message || 'Signup failed');
        return;
      }

      accountReady = true;
      if (res.email_verification_required) {
        toast.message('Account created. Check your email to verify — then confirm WhatsApp below.');
      }
    } catch (err: unknown) {
      const status = (err as AxiosError)?.response?.status;
      if (status === 409) {
        accountReady = true;
        toast.message('This email or phone is already registered. Verify WhatsApp to continue.');
      } else {
        toast.error(getAuthErrorMessage(err));
        return;
      }
    } finally {
      setLoading(false);
    }

    if (!accountReady) return;

    toast.success('One more step — verify your WhatsApp number');
    goToWhatsAppVerify(digits);
  };

  return (
    <>
      <Helmet><title>Create Account | Vizag Taxi Hub</title></Helmet>
      <CarpoolAppHeader showBack title="Create Account" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          WhatsApp OTP is required once to verify your number. Later logins use email &amp; password.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {[
            { label: 'Full Name', value: name, set: setName, type: 'text' as const },
            { label: 'Email', value: email, set: setEmail, type: 'email' as const },
            { label: 'WhatsApp Number', value: phone, set: setPhone, type: 'tel' as const },
            { label: 'Password', value: password, set: setPassword, type: 'password' as const },
          ].map(({ label, value, set, type }) => (
            <div key={label}>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => set(
                  type === 'tel'
                    ? e.target.value.replace(/\D/g, '').slice(0, 10)
                    : e.target.value,
                )}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          ))}
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span>
              I agree to the{' '}
              <Link
                to="/terms-conditions"
                className="font-medium underline underline-offset-2 hover:opacity-80"
                style={{ color: BRAND_GREEN }}
              >
                Terms &amp; Conditions
              </Link>{' '}
              and{' '}
              <Link
                to="/privacy-policy"
                className="font-medium underline underline-offset-2 hover:opacity-80"
                style={{ color: BRAND_GREEN }}
              >
                Privacy Policy
              </Link>
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: BRAND_GREEN }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign Up
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to={carpoolLoginPath(returnTo)}
            className="font-semibold"
            style={{ color: BRAND_GREEN }}
          >
            Log in
          </Link>
        </p>
      </main>
    </>
  );
}
