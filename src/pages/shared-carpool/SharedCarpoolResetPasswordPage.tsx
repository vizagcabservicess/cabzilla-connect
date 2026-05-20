import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { BRAND_GREEN } from '@/components/shared-carpooling/constants';

export default function SharedCarpoolResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (data.status !== 'success') throw new Error(data.message);
      setDone(true);
      toast.success('Password updated');
    } catch {
      toast.error('Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Reset Password | Vizag Taxi Hub</title></Helmet>
      <CarpoolAppHeader showBack title="Reset Password" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Lock className="h-8 w-8" style={{ color: BRAND_GREEN }} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Create new password</h1>
        </div>
        {done ? (
          <div className="mt-8 text-center">
            <Link to="/shared-carpooling/auth/login" className="font-semibold" style={{ color: BRAND_GREEN }}>Continue to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {[
              { label: 'New Password', value: password, set: setPassword },
              { label: 'Confirm Password', value: confirm, set: setConfirm },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: BRAND_GREEN }}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset Password
            </button>
          </form>
        )}
      </main>
    </>
  );
}
