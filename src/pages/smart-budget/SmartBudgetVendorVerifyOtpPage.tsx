import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { smartBudgetAPI, smartBudgetVendorStorage } from '@/services/api/smartBudgetAPI';
import { SIGNUP_DRAFT_KEY } from './SmartBudgetVendorSignupPage';

type Draft = {
  phone: string;
  name: string;
  email: string;
  password: string;
  vehicleType: string;
  vehicleNumber: string;
  acceptAnyVehicleType?: boolean;
  profileUrl: string;
};

export default function SmartBudgetVendorVerifyOtpPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phoneParam = (params.get('phone') || '').replace(/\D/g, '').slice(-10);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(30);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Draft;
      if (phoneParam && parsed.phone !== phoneParam) return;
      setDraft(parsed);
    } catch {
      /* ignore */
    }
  }, [phoneParam]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const phone = draft?.phone || phoneParam;

  const resend = async () => {
    if (phone.length !== 10) return;
    setLoading(true);
    try {
      const { dev_otp } = await smartBudgetAPI.vendor.sendSignupOtp(phone);
      setResendIn(30);
      toast.success('OTP resent to WhatsApp');
      if (dev_otp) toast.message(`Debug OTP: ${dev_otp}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resend failed');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!draft) {
      toast.error('Signup session expired');
      navigate('/smart-budget/vendor/signup');
      return;
    }
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const { signup_token } = await smartBudgetAPI.vendor.verifySignupOtp(draft.phone, otp);
      const auth = await smartBudgetAPI.vendor.registerVendor({
        signup_token,
        name: draft.name,
        email: draft.email || undefined,
        password: draft.password,
        primary_vehicle_type: draft.vehicleType,
        primary_vehicle_number: draft.vehicleNumber,
        profile_image_url: draft.profileUrl,
        accept_any_vehicle_type: Boolean(draft.acceptAnyVehicleType),
      });
      smartBudgetVendorStorage.setAuth(auth);
      sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
      toast.success('Phone verified — upload documents to go live');
      navigate('/smart-budget/vendor/onboarding', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!draft) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm">
        <p>Signup session incomplete or expired.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/smart-budget/vendor/signup">Back to signup</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-800">
            Vizag Taxi Hub
          </p>
          <h1 className="text-lg font-bold">Verify WhatsApp OTP</h1>
          <p className="text-xs text-muted-foreground">Sent to +91 {phone}</p>
        </div>
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <Button
          type="button"
          className="w-full bg-emerald-700 hover:bg-emerald-800"
          disabled={loading}
          onClick={() => void verify()}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Verify & create account
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-xs"
          disabled={loading || resendIn > 0}
          onClick={() => void resend()}
        >
          {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
        </Button>
      </div>
    </div>
  );
}
