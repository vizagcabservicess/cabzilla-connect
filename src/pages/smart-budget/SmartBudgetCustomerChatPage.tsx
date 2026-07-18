import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import {
  SMART_BUDGET_POLL_INTERVAL_MS,
  canSmartBudgetChat,
  canSmartBudgetPayUnlock,
  isSmartBudgetTerminal,
  type SmartBudgetMessage,
  type SmartBudgetSession,
} from '@/types/smartBudget';
import { SmartBudgetChatThread } from '@/components/smart-budget/SmartBudgetChatThread';

export default function SmartBudgetCustomerChatPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [session, setSession] = useState<SmartBudgetSession | null>(null);
  const [messages, setMessages] = useState<SmartBudgetMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [s, msgs] = await Promise.all([
        smartBudgetAPI.public.getSessionByToken(token),
        smartBudgetAPI.public.getMessages(token),
      ]);
      setSession(s);
      setMessages(msgs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!session || isSmartBudgetTerminal(session.status)) return;
    const id = window.setInterval(() => void refresh(), SMART_BUDGET_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [session, refresh]);

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
          <AlertTitle>Chat unavailable</AlertTitle>
          <AlertDescription>{error || 'Session not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canSmartBudgetChat(session.status)) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
        <Alert>
          <AlertTitle>Chat not open yet</AlertTitle>
          <AlertDescription>
            Chat unlocks after Vizag Taxi Hub or a vendor accepts your budget request.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link to={`/smart-budget/s/${token}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to session
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/smart-budget/s/${token}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Session
          </Link>
        </Button>
        {canSmartBudgetPayUnlock(session) ? (
          <Button asChild size="sm" className="bg-emerald-700 hover:bg-emerald-800">
            <Link to={`/smart-budget/s/${token}/pay`}>Pay fee</Link>
          </Button>
        ) : session.contacts_unlocked || session.payment_status === 'paid' || session.status === 'fee_paid' ? (
          <span className="text-xs font-medium text-emerald-800">Fee paid</span>
        ) : null}
      </div>
      <SmartBudgetChatThread
        messages={messages}
        currentRole="customer"
        disabled={isSmartBudgetTerminal(session.status)}
        onSend={async (body) => {
          try {
            const msg = await smartBudgetAPI.public.sendMessage(token, body);
            setMessages((prev) => [...prev, msg]);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Send failed');
            throw err;
          }
        }}
      />
    </div>
  );
}
