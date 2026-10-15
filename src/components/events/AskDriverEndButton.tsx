import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { endRequestResultMessage } from '@/lib/eventDuty';
import { eventDutyAPI, requestShareDutyEnd, revokeShareDutyEnd } from '@/services/api/eventDutyAPI';

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
  const [busy, setBusy] = useState<'ask' | 'revoke' | null>(null);
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
    setBusy('ask');
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
      setBusy(null);
    }
  };

  const revoke = async () => {
    if (busy || !asked) return;
    const ok = window.confirm('Revoke the end request? This trip stays open, and time after the request counts again.');
    if (!ok) return;
    setBusy('revoke');
    try {
      const res = appearance === 'share'
        ? await revokeShareDutyEnd(shareToken || '', dutyId)
        : await eventDutyAPI.revokeDutyEnd(dutyId);
      if (!res.duty) {
        throw new Error('The end request could not be revoked.');
      }
      toast.success('End request revoked. Time is counting again.');
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not revoke the end request');
    } finally {
      setBusy(null);
    }
  };

  if (appearance === 'share') {
    return (
      <>
        <button
          type="button"
          disabled={busy != null}
          onClick={() => { void send(); }}
          className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 sm:text-[11px]"
        >
          {busy === 'ask' ? '…' : label}
        </button>
        {asked ? (
          <button
            type="button"
            disabled={busy != null}
            onClick={() => { void revoke(); }}
            className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-60 sm:text-[11px]"
          >
            {busy === 'revoke' ? '…' : 'Revoke'}
          </button>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={busy != null} onClick={() => { void send(); }}>
        {busy === 'ask' ? 'Sending…' : label}
      </Button>
      {asked ? (
        <Button size="sm" variant="outline" disabled={busy != null} onClick={() => { void revoke(); }}>
          {busy === 'revoke' ? 'Revoking…' : 'Revoke end'}
        </Button>
      ) : null}
    </>
  );
}
