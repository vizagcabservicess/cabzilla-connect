import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SmartBudgetMessage, SmartBudgetSenderRole } from '@/types/smartBudget';
import { validateSmartBudgetChatMessage } from '@/lib/smartBudgetChatGuard';
import { cn } from '@/lib/utils';

interface SmartBudgetChatThreadProps {
  messages: SmartBudgetMessage[];
  currentRole: SmartBudgetSenderRole;
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
}

function roleLabel(role: SmartBudgetSenderRole): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'customer':
      return 'Customer';
    case 'vendor':
      return 'Vendor';
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function SmartBudgetChatThread({
  messages,
  currentRole,
  onSend,
  disabled = false,
  isLoading = false,
}: SmartBudgetChatThreadProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [guardHint, setGuardHint] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // Keep scroll inside the chat panel — never scroll the page.
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    const check = validateSmartBudgetChatMessage(value);
    setGuardHint(value.trim() && !check.ok ? check.reason : null);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending || disabled) return;
    const check = validateSmartBudgetChatMessage(body);
    if (!check.ok) {
      setGuardHint(check.reason);
      toast.error(check.reason);
      return;
    }
    setSending(true);
    try {
      await onSend(body);
      setDraft('');
      setGuardHint(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-lg border bg-background">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Private chat</h3>
        <p className="text-xs text-muted-foreground">
          Customer · Vendor · Admin — no phone numbers or digits allowed
        </p>
      </div>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_role === currentRole;
            return (
              <div
                key={msg.id}
                className={cn('flex flex-col gap-0.5', mine ? 'items-end' : 'items-start')}
              >
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {msg.sender_name || roleLabel(msg.sender_role)}
                </span>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    mine
                      ? 'bg-emerald-700 text-white'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {msg.body}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="space-y-1.5 border-t p-3">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder={disabled ? 'Chat unavailable' : 'Type a message (no numbers)…'}
            disabled={disabled || sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void handleSend()}
            disabled={disabled || sending || !draft.trim() || Boolean(guardHint)}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {guardHint && <p className="text-[11px] text-red-600">{guardHint}</p>}
      </div>
    </div>
  );
}
