import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Ban, Check, Loader2, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import {
  SMART_BUDGET_POLL_INTERVAL_MS,
  canSmartBudgetCancel,
  canSmartBudgetChat,
  formatSmartBudgetFeeLabel,
  isSmartBudgetAwaitingFee,
  isSmartBudgetTerminal,
  type SmartBudgetMessage,
  type SmartBudgetSession,
} from '@/types/smartBudget';
import { Badge } from '@/components/ui/badge';
import { SmartBudgetTripSummary } from '@/components/smart-budget/SmartBudgetTripSummary';
import { SmartBudgetChatThread } from '@/components/smart-budget/SmartBudgetChatThread';
import { SmartBudgetContactsReveal } from '@/components/smart-budget/SmartBudgetContactsReveal';
import { SmartBudgetCountdown } from '@/components/smart-budget/SmartBudgetCountdown';
import { useSmartBudgetVendorAuth } from '@/providers/SmartBudgetVendorAuthProvider';

function VendorLeadDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const { isAuthenticated, isLoading: authLoading } = useSmartBudgetVendorAuth();
  const [session, setSession] = useState<SmartBudgetSession | null>(null);
  const [messages, setMessages] = useState<SmartBudgetMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const s = await smartBudgetAPI.vendor.getLead(sessionId);
      setSession(s);
      if (canSmartBudgetChat(s.status)) {
        const msgs = await smartBudgetAPI.vendor.getMessages(sessionId);
        setMessages(msgs);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refresh();
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    if (!session || isSmartBudgetTerminal(session.status)) return;
    const timer = window.setInterval(() => void refresh(), SMART_BUDGET_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [session, refresh]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/smart-budget/vendor/login" replace />;
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>Lead unavailable</AlertTitle>
          <AlertDescription>{error || 'Not found or already closed'}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link to="/smart-budget/vendor">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to leads
          </Link>
        </Button>
      </div>
    );
  }

  const isMine =
    session.status === 'vendor_claimed' ||
    session.status === 'chat_open' ||
    session.status === 'fee_paid' ||
    session.status === 'completed';
  const isOpen = session.status === 'marketplace';

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/smart-budget/vendor">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Dashboard
        </Link>
      </Button>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="outline">{session.status.replace(/_/g, ' ')}</Badge>
          <Badge
            className={
              isSmartBudgetAwaitingFee(session)
                ? 'bg-amber-100 text-amber-950 hover:bg-amber-100'
                : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-100'
            }
          >
            {formatSmartBudgetFeeLabel(session)}
          </Badge>
        </div>
        <SmartBudgetTripSummary session={session} hideWebsiteFare />
      </div>

      {isMine && isSmartBudgetAwaitingFee(session) && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <AlertTitle>Awaiting customer 10% fee</AlertTitle>
          <AlertDescription>
            You have accepted this trip. Customer contacts stay masked until they pay the unlock fee
            {session.booking_fee_amount != null
              ? ` of ₹${Number(session.booking_fee_amount).toLocaleString('en-IN')}`
              : ''}
            . Chat remains available
            {session.fee_due_at
              ? ` until ${new Date(session.fee_due_at).toLocaleString('en-IN')}`
              : ''}
            .
          </AlertDescription>
        </Alert>
      )}

      {isMine && isSmartBudgetAwaitingFee(session) && session.fee_due_at && (
        <SmartBudgetCountdown
          expiresAt={session.fee_due_at}
          label="Fee payment window"
          onExpire={() => void refresh()}
        />
      )}

      {isOpen && (
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-emerald-700 hover:bg-emerald-800"
            disabled={acting}
            onClick={async () => {
              setActing(true);
              try {
                const updated = await smartBudgetAPI.vendor.acceptLead(sessionId);
                setSession(updated);
                toast.success('You claimed this lead');
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : 'Already claimed by another vendor'
                );
                await refresh();
              } finally {
                setActing(false);
              }
            }}
          >
            {acting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Accept
          </Button>
          <Button
            variant="outline"
            disabled={acting}
            onClick={async () => {
              setActing(true);
              try {
                await smartBudgetAPI.vendor.skipLead(sessionId);
                toast.message('Skipped');
                window.location.href = '/smart-budget/vendor';
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Skip failed');
              } finally {
                setActing(false);
              }
            }}
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Skip
          </Button>
        </div>
      )}

      {isMine && (
        <>
          <SmartBudgetContactsReveal session={session} perspective="vendor" />
          {canSmartBudgetCancel(session.status) && (
            <Button
              type="button"
              variant="destructive"
              disabled={acting}
              onClick={async () => {
                const paid =
                  session.contacts_unlocked ||
                  session.payment_status === 'paid' ||
                  session.status === 'fee_paid';
                const ok = window.confirm(
                  paid
                    ? 'Cancel after customer paid? Your wallet will be debited and this ride reopens to all vendors for 10 more minutes.'
                    : 'Cancel before customer pays? No wallet charge — the ride reopens to other vendors.'
                );
                if (!ok) return;
                setActing(true);
                try {
                  const result = await smartBudgetAPI.vendor.cancelSession(sessionId);
                  setSession(result.session);
                  if (result.penalty > 0) {
                    toast.success(
                      `Cancelled · wallet debit ₹${result.penalty.toLocaleString('en-IN')} · ride reopened`
                    );
                  } else {
                    toast.success('Cancelled with no charge · ride reopened to marketplace');
                  }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Cancel failed');
                } finally {
                  setActing(false);
                }
              }}
            >
              {acting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
              Cancel ride
            </Button>
          )}
          <SmartBudgetChatThread
            messages={messages}
            currentRole="vendor"
            disabled={isSmartBudgetTerminal(session.status)}
            onSend={async (body) => {
              const msg = await smartBudgetAPI.vendor.sendMessage(sessionId, body);
              setMessages((prev) => [...prev, msg]);
            }}
          />
        </>
      )}

      {!isOpen && !isMine && (
        <Alert>
          <AlertTitle>Closed</AlertTitle>
          <AlertDescription>
            This request is no longer available (claimed by another vendor or expired).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function SmartBudgetVendorLeadPage() {
  return <VendorLeadDetail />;
}
