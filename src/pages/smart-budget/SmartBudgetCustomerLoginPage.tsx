import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import { useSmartBudgetCustomerAuth } from '@/providers/SmartBudgetCustomerAuthProvider';

type Mode = 'login' | 'signup';
type SignupStep = 'details' | 'otp';

export default function SmartBudgetCustomerLoginPage() {
  const { applyAuth, isAuthenticated, isLoading } = useSmartBudgetCustomerAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>('details');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/smart-budget/customer" replace />;
  }

  const digits = phone.replace(/\D/g, '').slice(-10);

  const switchMode = (next: Mode) => {
    setMode(next);
    setSignupStep('details');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async (e?: FormEvent) => {
    e?.preventDefault();
    if (digits.length !== 10) {
      toast.error('Enter a valid 10-digit WhatsApp number');
      return;
    }
    if (!password) {
      toast.error('Enter your password');
      return;
    }
    setSubmitting(true);
    try {
      const auth = await smartBudgetAPI.customer.login({ phone: digits, password });
      applyAuth(auth);
      toast.success('Welcome back');
      navigate('/smart-budget/customer', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const sendSignupOtp = async () => {
    if (!name.trim()) {
      toast.error('Enter your name');
      return;
    }
    if (digits.length !== 10) {
      toast.error('Enter a valid 10-digit WhatsApp number');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const { dev_otp } = await smartBudgetAPI.customer.sendSignupOtp(digits);
      setSignupStep('otp');
      setResendIn(30);
      toast.success('OTP sent to your WhatsApp');
      if (dev_otp) toast.message(`Debug OTP: ${dev_otp}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const completeSignup = async (e?: FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setSubmitting(true);
    try {
      const auth = await smartBudgetAPI.customer.verifySignup({
        phone: digits,
        otp,
        name: name.trim(),
        password,
      });
      applyAuth(auth);
      toast.success('Account created');
      navigate('/smart-budget/customer', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === 'login') {
            void handleLogin(e);
            return;
          }
          if (signupStep === 'details') void sendSignupOtp();
          else void completeSignup(e);
        }}
        className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
            Vizag Taxi Hub
          </p>
          <h1 className="text-xl font-bold">Customer portal</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login'
              ? 'Log in with your phone and password'
              : signupStep === 'details'
                ? 'Create an account — WhatsApp OTP is required only for signup'
                : `Enter the OTP sent to +91 ${digits}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => switchMode('login')}
          >
            Log in
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>

        {mode === 'login' ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="phone">WhatsApp phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Your password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Log in
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              New here?{' '}
              <button
                type="button"
                className="text-emerald-800 underline"
                onClick={() => switchMode('signup')}
              >
                Sign up with OTP
              </button>
            </p>
          </>
        ) : signupStep === 'details' ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-phone">
                WhatsApp phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="signup-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">
                Confirm password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send WhatsApp OTP
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                className="text-emerald-800 underline"
                onClick={() => switchMode('login')}
              >
                Log in
              </button>
            </p>
          </>
        ) : (
          <>
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <Button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify & create account
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs"
              disabled={submitting || resendIn > 0}
              onClick={() => void sendSignupOtp()}
            >
              {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full text-xs"
              onClick={() => setSignupStep('details')}
            >
              Edit signup details
            </Button>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Vendor?{' '}
          <Link className="text-emerald-800 underline" to="/smart-budget/vendor/login">
            Vendor portal
          </Link>
        </p>
      </form>
    </div>
  );
}
