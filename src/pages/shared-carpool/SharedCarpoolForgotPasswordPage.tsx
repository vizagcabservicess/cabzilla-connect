import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { BRAND_GREEN } from '@/components/shared-carpooling/constants';

export default function SharedCarpoolForgotPasswordPage() {
  const [params] = useSearchParams();
  const returnTo = params.get('return') || '/shared-carpooling/auth/login';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Could not send reset link');
      }
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Forgot Password | Vizag Taxi Hub</title></Helmet>
      <CarpoolAppHeader showBack title="Forgot Password" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Mail className="h-8 w-8" style={{ color: BRAND_GREEN }} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-500">Enter your email and we&apos;ll send a reset link</p>
        </div>
        {sent ? (
          <div className="mt-8 rounded-2xl border border-green-100 bg-green-50 p-5 text-center text-sm text-gray-700">
            Check your inbox for the password reset link.
            <Link to={`/shared-carpooling/auth/login?return=${encodeURIComponent(returnTo)}`} className="mt-4 block font-semibold" style={{ color: BRAND_GREEN }}>
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: BRAND_GREEN }}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Reset Link
            </button>
          </form>
        )}
      </main>
    </>
  );
}
