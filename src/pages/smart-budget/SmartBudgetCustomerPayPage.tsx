import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import {
  canSmartBudgetChat,
  canSmartBudgetPayUnlock,
  isSmartBudgetContactsUnlocked,
  type SmartBudgetSession,
} from '@/types/smartBudget';
import { SmartBudgetFeeGate } from '@/components/smart-budget/SmartBudgetFeeGate';
import { SmartBudgetContactsReveal } from '@/components/smart-budget/SmartBudgetContactsReveal';
import { SmartBudgetTripSummary } from '@/components/smart-budget/SmartBudgetTripSummary';
import {
  initRazorpay,
  openRazorpayCheckout,
  type RazorpayResponse,
} from '@/services/razorpayService';

export default function SmartBudgetCustomerPayPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SmartBudgetSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { syncPayment?: boolean }) => {
    if (!token) return;
    try {
      let data = await smartBudgetAPI.public.getSessionByToken(token);
      if (
        opts?.syncPayment !== false &&
        !isSmartBudgetContactsUnlocked(data) &&
        (data.status === 'chat_open' ||
          data.status === 'vendor_claimed' ||
          data.status === 'admin_assigned')
      ) {
        try {
          data = await smartBudgetAPI.public.syncUnlockPayment(token);
        } catch {
          /* sync endpoint may be unavailable; keep session payload */
        }
      }
      setSession(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handlePay = async () => {
    if (!session) return;
    if (!canSmartBudgetPayUnlock(session)) {
      toast.error('Advance payment is not available after this fee was paid');
      return;
    }
    setPaying(true);
    try {
      const ready = await initRazorpay();
      if (!ready) {
        toast.error('Payment SDK failed to load');
        return;
      }
      const order = await smartBudgetAPI.public.createUnlockPayment(token);
      if (!order?.razorpay_order_id || !order?.razorpay_key) {
        throw new Error('Could not create payment order. Please try again.');
      }

      let confirmed = false;
      const confirmPayment = async (raw: RazorpayResponse | Record<string, unknown>) => {
        if (confirmed) return;

        const response = raw as Record<string, unknown>;
        const razorpay_order_id = String(
          response.razorpay_order_id || response.order_id || order.razorpay_order_id || ''
        ).trim();
        const razorpay_payment_id = String(
          response.razorpay_payment_id || response.payment_id || ''
        ).trim();
        const razorpay_signature = String(
          response.razorpay_signature || response.signature || ''
        ).trim();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          // Incomplete callback — try server-side Razorpay reconcile before failing.
          const synced = await refresh({ syncPayment: true });
          if (synced && isSmartBudgetContactsUnlocked(synced)) {
            confirmed = true;
            toast.success('Payment received — contacts unlocked');
            navigate(`/smart-budget/s/${token}`, { replace: true });
            return;
          }
          throw new Error(
            'Payment completed but verification details were incomplete. Tap Pay again or refresh — we will sync automatically.'
          );
        }

        confirmed = true;
        const updated = await smartBudgetAPI.public.confirmUnlockPayment(token, {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        });
        setSession(updated);
        toast.success('Payment successful — contacts unlocked');
        navigate(`/smart-budget/s/${token}`, { replace: true });
      };

      await new Promise<void>((resolve, reject) => {
        openRazorpayCheckout(
          {
            key: order.razorpay_key,
            amount: Math.round(Number(order.amount) * 100),
            currency: order.currency || 'INR',
            name: 'Vizag Taxi Hub',
            description: 'Smart Budget 10% booking fee',
            order_id: order.razorpay_order_id,
            // Handler is required by Razorpay types; openRazorpayCheckout also forwards to onSuccess.
            handler: () => undefined,
            prefill: {
              name: session.customer_name || undefined,
              contact: session.customer_phone || undefined,
            },
            theme: { color: '#047857' },
          },
          (response) => {
            void confirmPayment(response).then(resolve).catch(reject);
          },
          () => reject(new Error('Payment failed')),
          undefined,
          () => {
            // Modal closed — if Razorpay already captured, sync unlock; otherwise cancel quietly.
            void refresh({ syncPayment: true }).then((updated) => {
              if (updated && isSmartBudgetContactsUnlocked(updated)) {
                toast.success('Payment received — contacts unlocked');
                navigate(`/smart-budget/s/${token}`, { replace: true });
              }
              resolve();
            });
          }
        );
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      if (/already paid/i.test(msg)) {
        const updated = await refresh({ syncPayment: true });
        if (updated && isSmartBudgetContactsUnlocked(updated)) {
          toast.success('Payment already received — contacts unlocked');
          navigate(`/smart-budget/s/${token}`, { replace: true });
          return;
        }
      }
      toast.error(msg);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>Payment unavailable</AlertTitle>
          <AlertDescription>{error || 'Session not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isSmartBudgetContactsUnlocked(session)) {
    return (
      <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/smart-budget/s/${token}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to session
          </Link>
        </Button>
        <Alert>
          <AlertTitle>Already paid</AlertTitle>
          <AlertDescription>
            The booking advance fee is already paid. Contacts are unlocked — no further payment is needed.
          </AlertDescription>
        </Alert>
        <SmartBudgetContactsReveal session={session} perspective="customer" />
      </div>
    );
  }

  if (!canSmartBudgetChat(session.status) && session.status !== 'fee_paid' && session.status !== 'completed') {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
        <Alert>
          <AlertTitle>Not ready for payment</AlertTitle>
          <AlertDescription>
            Wait until a partner accepts your request, then pay the booking fee to unlock contacts.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link to={`/smart-budget/s/${token}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/smart-budget/s/${token}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to session
        </Link>
      </Button>
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <SmartBudgetTripSummary session={session} />
      </div>
      <SmartBudgetFeeGate session={session} onPay={() => void handlePay()} isPaying={paying} />
      <SmartBudgetContactsReveal session={session} perspective="customer" />
    </div>
  );
}
