import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { BRAND_GREEN } from '@/components/shared-carpooling/constants';
import { sharedCarpoolUserAPI } from '@/services/api/sharedCarpoolAPI';
import { useCarpoolUser } from '@/providers/CarpoolUserProvider';

export default function SharedCarpoolVerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { setSession } = useCarpoolUser();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    void (async () => {
      try {
        const session = await sharedCarpoolUserAPI.verifyCarpoolEmail(token);
        setSession(session);
        setStatus('success');
        toast.success('Email verified successfully');
        setTimeout(() => navigate('/shared-carpooling/profile/pending', { replace: true }), 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed');
      }
    })();
  }, [token, setSession, navigate]);

  return (
    <>
      <Helmet><title>Verify Email | Vizag Taxi Hub Carpooling</title></Helmet>
      <CarpoolAppHeader showBack title="Verify Email" />
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-green-700" />
            <p className="mt-4 text-sm text-gray-600">Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">Email Verified!</h1>
            <p className="mt-2 text-sm text-gray-500">Redirecting you to your verification status…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-14 w-14 text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">Verification Failed</h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <Link
              to="/shared-carpooling/profile/pending"
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND_GREEN }}
            >
              <Mail className="h-4 w-4" />
              Back to verification status
            </Link>
          </>
        )}
      </main>
    </>
  );
}
