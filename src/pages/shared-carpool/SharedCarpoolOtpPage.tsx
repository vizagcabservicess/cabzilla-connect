import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, ShieldCheck } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'sonner';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { BRAND_GREEN } from '@/components/shared-carpooling/constants';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { sharedCarpoolUserAPI } from '@/services/api/sharedCarpoolAPI';
import { useCarpoolUser } from '@/providers/CarpoolUserProvider';
import { isCommuteSearchResume } from '@/components/shared-carpooling/pendingCommuteSearch';
import { getPostOtpVerificationPath } from '@/components/shared-carpooling/verificationRoutes';
import { carpoolLoginPath } from '@/components/shared-carpooling/carpoolAuthRoutes';

export default function SharedCarpoolOtpPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('return') || '/shared-carpooling/home';
  const signupName = params.get('name') ?? '';
  const isSignupFlow = params.get('mode') === 'signup' || signupName.trim() !== '';
  const { setSession } = useCarpoolUser();

  const [phone, setPhone] = useState(params.get('phone') ?? '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const autoOtpSent = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Signup only: auto-send OTP when phone is pre-filled from sign-up form
  useEffect(() => {
    if (!isSignupFlow) return;
    const digits = (params.get('phone') ?? '').replace(/\D/g, '');
    if (digits.length < 10 || autoOtpSent.current) return;
    autoOtpSent.current = true;
    setPhone(digits);

    void (async () => {
      setLoading(true);
      try {
        const { devOtp } = await sharedCarpoolUserAPI.sendOtp(digits);
        setStep('otp');
        setResendIn(30);
        if (devOtp) toast.message(`Demo OTP: ${devOtp}`);
        else toast.success('OTP sent to your WhatsApp');
      } catch {
        autoOtpSent.current = false;
        toast.error('Could not send OTP. Tap Send OTP to try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [params, isSignupFlow]);

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Enter a valid 10-digit WhatsApp number');
      return;
    }
    setLoading(true);
    try {
      const { devOtp } = await sharedCarpoolUserAPI.sendOtp(digits);
      setStep('otp');
      setResendIn(30);
      if (devOtp) toast.message(`Demo OTP: ${devOtp}`);
      else toast.success('OTP sent to your WhatsApp');
    } catch {
      toast.error('Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    const digits = phone.replace(/\D/g, '');
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const session = await sharedCarpoolUserAPI.verifyOtp(digits, otp, signupName.trim() || undefined);
      setSession(session);
      toast.success('Phone verified!');

      const resumeSearch = isCommuteSearchResume(returnTo);
      if (resumeSearch) {
        navigate(returnTo);
        return;
      }

      navigate(getPostOtpVerificationPath(session, returnTo));
    } catch {
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSignupFlow) {
    return (
      <>
        <Helmet><title>Sign In | Vizag Taxi Hub</title></Helmet>
        <CarpoolAppHeader showBack title="Sign In" />
        <main className="mx-auto max-w-lg px-4 py-12 text-center">
          <h1 className="text-xl font-bold text-gray-900">Use email to log in</h1>
          <p className="mt-2 text-sm text-gray-500">
            WhatsApp OTP is only required once when you create your account. Returning users log in with email &amp; password.
          </p>
          <Link
            to={carpoolLoginPath(returnTo)}
            className="mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND_GREEN }}
          >
            Go to Login
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>WhatsApp Verification | Vizag Taxi Hub</title>
      </Helmet>
      <CarpoolAppHeader showBack title={step === 'phone' ? 'Verify WhatsApp' : 'Enter OTP'} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="text-center">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: `${BRAND_GREEN}15` }}
          >
            {step === 'phone' ? (
              <FaWhatsapp className="h-8 w-8" style={{ color: '#25D366' }} />
            ) : (
              <ShieldCheck className="h-8 w-8" style={{ color: BRAND_GREEN }} />
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {step === 'phone' ? 'Verify your WhatsApp' : 'Enter OTP'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {step === 'phone'
              ? 'One-time verification when you sign up. You will not need OTP on future logins.'
              : `Code sent to +91 ${phone.replace(/\D/g, '')}`}
          </p>
        </div>

        {step === 'phone' ? (
          <div className="mt-8 space-y-4">
            <div className="flex gap-2">
              <div className="flex w-16 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium">
                +91
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="WhatsApp number"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={sendOtp}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: BRAND_GREEN }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send OTP on WhatsApp
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <button
              type="button"
              disabled={loading || otp.length !== 6}
              onClick={verify}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: BRAND_GREEN }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verify &amp; Continue
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              onClick={sendOtp}
              className="w-full text-sm font-medium text-gray-500 disabled:opacity-50"
            >
              {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
