import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import type { SmartBudgetSession } from '@/types/smartBudget';
import { SmartBudgetTripSummary } from '@/components/smart-budget/SmartBudgetTripSummary';

export default function SmartBudgetVendorOfferConfirmPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SmartBudgetSession | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [claimedByMe, setClaimedByMe] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const data = await smartBudgetAPI.vendor.getOfferByToken(token);
      setSession(data.session);
      setCanClaim(Boolean(data.can_claim));
      setClaimedByMe(Boolean(data.claimed_by_me));
      setVendorName(data.vendor_name || '');
      setPhoneMasked(data.vendor_phone_masked);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Offer unavailable');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sendOtp = async () => {
    setSendingOtp(true);
    try {
      const result = await smartBudgetAPI.vendor.sendClaimOtp(token);
      setOtpStep(true);
      setOtp('');
      if (result.phone_masked) setPhoneMasked(result.phone_masked);
      if (result.dev_otp) {
        toast.message(`Dev OTP: ${result.dev_otp}`);
      } else {
        toast.success(result.message || 'OTP sent to your WhatsApp');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    await sendOtp();
  };

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setConfirming(true);
    try {
      const result = await smartBudgetAPI.vendor.confirmClaimWithOtp(token, otp.trim());
      toast.success('Booking confirmed — you got this trip');
      const sessionId = result.session?.id;
      if (sessionId) {
        navigate(`/smart-budget/vendor/leads/${sessionId}`, { replace: true });
      } else {
        navigate('/smart-budget/vendor', { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not confirm booking');
      await refresh();
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f6]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Trip unavailable</AlertTitle>
          <AlertDescription>{error || 'This confirm link is invalid or expired.'}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link to="/smart-budget/vendor/login">Vendor login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f7f5_0%,#ffffff_45%,#eef7f1_100%)]">
      <header className="border-b border-emerald-100/80 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            Vizag Taxi Hub · Partners
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-emerald-900">
            Confirm this booking
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {vendorName
              ? `Hi ${vendorName} — review the trip details, then confirm with WhatsApp OTP.`
              : 'Review the trip details, then confirm with WhatsApp OTP.'}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <section className="rounded-[1.25rem] border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Trip details</h2>
          <SmartBudgetTripSummary session={session} showStatus={false} hideWebsiteFare />
        </section>

        {claimedByMe ? (
          <Alert className="rounded-[1.25rem] border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <AlertTitle>You already confirmed this trip</AlertTitle>
            <AlertDescription>
              Open your partner dashboard to chat and track the advance payment.
            </AlertDescription>
            <Button asChild className="mt-3 bg-emerald-600 hover:bg-emerald-700">
              <Link to={`/smart-budget/vendor/leads/${session.id}`}>Open booking</Link>
            </Button>
          </Alert>
        ) : !canClaim ? (
          <Alert className="rounded-[1.25rem]">
            <AlertTitle>No longer available</AlertTitle>
            <AlertDescription>
              Another partner may have confirmed this trip, or the offer window closed.
            </AlertDescription>
            <Button asChild variant="outline" className="mt-3">
              <Link to="/smart-budget/vendor">View open trips</Link>
            </Button>
          </Alert>
        ) : (
          <form
            onSubmit={(e) => void (otpStep ? handleConfirm(e) : handleRequestOtp(e))}
            className="space-y-4 rounded-[1.25rem] border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Confirm with WhatsApp</h2>
              <p className="mt-1 text-sm text-slate-500">
                We&apos;ll send a 6-digit OTP to your registered WhatsApp
                {phoneMasked ? ` (${phoneMasked})` : ''}. No password needed.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 rounded-2xl bg-emerald-50/80 p-3 text-sm text-slate-700 ring-1 ring-emerald-100 sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Trip already prefilled</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>OTP on your WhatsApp</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>First confirm wins</span>
              </div>
            </div>

            {otpStep ? (
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <Label htmlFor="vendor-claim-otp">Enter WhatsApp OTP</Label>
                <Input
                  id="vendor-claim-otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="h-12 rounded-xl text-center text-lg font-semibold tracking-[0.4em]"
                  autoFocus
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={confirming}
                    className="h-12 flex-1 rounded-xl bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
                  >
                    {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm booking
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl"
                    disabled={sendingOtp || confirming}
                    onClick={() => void sendOtp()}
                  >
                    {sendingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Resend OTP
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="submit"
                disabled={sendingOtp}
                className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
              >
                {sendingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue with WhatsApp OTP
              </Button>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
