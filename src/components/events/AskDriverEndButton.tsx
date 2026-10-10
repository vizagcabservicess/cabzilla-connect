import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { endRequestResultMessage } from '@/lib/eventDuty';
import { eventDutyAPI, requestShareDutyEnd } from '@/services/api/eventDutyAPI';

type AskDriverEndButtonProps = {
  dutyId: number;
  status: string;
  endRequestedAt?: string | null;
  appearance: 'share' | 'admin';
  shareToken?: string;
  onDone?: () => void;
};

export function AskDriverEndButton({
  dutyId,
  status,
  endRequestedAt,
  appearance,
  shareToken,
  onDone,
}: AskDriverEndButtonProps) {
  const [busy, setBusy] = useState(false);
  if (status !== 'in_progress' || dutyId < 1) return null;

  const asked = Boolean(endRequestedAt);
  const label = appearance === 'share'
    ? (asked ? 'Remind' : 'End')
    : (asked ? 'Remind to end' : 'Ask to end');

  const send = async () => {
    if (busy) return;
    if (appearance === 'admin') {
      const ok = window.confirm(
        asked
          ? 'Send the end-duty alert to this driver again? Billable time stays stopped at the first request.'
          : 'Ask this driver to end the trip now? Time after this moment is not counted.',
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const res = appearance === 'share'
        ? await requestShareDutyEnd(shareToken || '', dutyId)
        : await eventDutyAPI.requestDutyEnd(dutyId);
      if (!res.delivery) {
        throw new Error('The end-duty alert is not active on the server yet.');
      }
      toast.success(endRequestResultMessage(res.delivery));
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reach the driver');
    } finally {
      setBusy(false);
    }
  };

  if (appearance === 'share') {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => { void send(); }}
        className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 sm:text-[11px]"
      >
        {busy ? '…' : label}
      </button>
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={() => { void send(); }}>
      {busy ? 'Sending…' : label}
    </Button>
  );
}
