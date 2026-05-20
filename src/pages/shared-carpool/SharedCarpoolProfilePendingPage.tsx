import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { CheckCircle2, Clock, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { VerificationStepper } from '@/components/shared-carpooling/app/VerificationStepper';
import { CarpoolBottomNav } from '@/components/shared-carpooling/app/CarpoolBottomNav';
import { BRAND_GREEN } from '@/components/shared-carpooling/constants';
import { getProfileVerificationPath, hasSubmittedProfileVerification } from '@/components/shared-carpooling/verificationRoutes';
import { useCarpoolUser } from '@/providers/CarpoolUserProvider';
import { sharedCarpoolUserAPI } from '@/services/api/sharedCarpoolAPI';

const STEPS = [
  'Verify your official email (check inbox)',
  'Our team reviews your employee / student details',
  'You receive a WhatsApp notification once approved',
  'Book seats instantly on matching shared rides',
];

export default function SharedCarpoolProfilePendingPage() {
  const { user, loading, isProfileVerified, refreshProfile } = useCarpoolUser();
  const [resending, setResending] = useState(false);

  if (!loading && isProfileVerified) {
    return <Navigate to="/shared-carpooling/home" replace />;
  }

  if (!loading && user?.verificationStatus === 'pending' && !hasSubmittedProfileVerification(user)) {
    return <Navigate to="/shared-carpooling/profile/complete" replace />;
  }

  if (!loading && user?.verificationStatus !== 'pending') {
    return <Navigate to={getProfileVerificationPath(user)} replace />;
  }

  const emailVerified = user?.emailVerified ?? false;
  const displayEmail = user?.employeeEmail ?? user?.email;

  const handleResend = async () => {
    if (!user?.phone) return;
    setResending(true);
    try {
      await sharedCarpoolUserAPI.resendCarpoolEmail(user.phone);
      await refreshProfile();
      toast.success('Verification email sent — check your inbox');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not resend email');
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Helmet><title>Verification Pending | Vizag Taxi Hub</title></Helmet>
      <CarpoolAppHeader
        variant="branded"
        showBack
        title="Verify Your Account"
        logoSubtitle="Carpooling for Employees & Students"
      />
      <VerificationStepper currentStep={3} />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-6">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Verification Submitted</h1>
          <p className="mt-2 text-sm text-gray-500">
            We&apos;re reviewing your details. You&apos;ll be notified on WhatsApp once we confirm your account.
          </p>
        </div>

        {!emailVerified && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-gray-900">Verify your email</p>
                <p className="mt-1 text-xs text-gray-600">
                  We sent a verification link to{' '}
                  <span className="font-semibold">{displayEmail ?? 'your official email'}</span>.
                  Click the link in that email to continue — admin approval requires verified email.
                </p>
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: BRAND_GREEN }}
                >
                  {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Resend verification email
                </button>
              </div>
            </div>
          </div>
        )}

        {emailVerified && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Email verified — waiting for admin approval
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">What happens next?</h2>
          <ul className="mt-4 space-y-3">
            {STEPS.map((step) => (
              <li key={step} className="flex items-start gap-2.5 text-sm text-gray-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_GREEN }} />
                {step}
              </li>
            ))}
          </ul>
        </div>

        <Link
          to="/shared-carpooling/home"
          className="mt-6 flex w-full items-center justify-center rounded-xl py-4 text-sm font-semibold text-white"
          style={{ backgroundColor: BRAND_GREEN }}
        >
          Go to Home
        </Link>
      </main>
      <CarpoolBottomNav />
    </>
  );
}
