import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { eventDutyAPI, resumeShareDuty } from '@/services/api/eventDutyAPI';

type ContinueDutyButtonProps = {
  dutyId: number;
  status: string;
  closingAt?: string | null;
  openingAt?: string | null;
  appearance: 'share' | 'admin';
  shareToken?: string;
  onDone?: () => void;
};

export function ContinueDutyButton({
  dutyId,
  status,
  closingAt,
  openingAt,
  appearance,
  shareToken,
  onDone,
}: ContinueDutyButtonProps) {
  const [busy, setBusy] = useState(false);
  const stopped = Boolean(openingAt) && (status === 'completed' || Boolean(closingAt));
  if (!stopped || dutyId < 1) return null;

  const resume = async () => {
    if (busy) return;
    const ok = window.confirm('Continue this duty? The ending odometer is removed, and hours start counting again from the stopped time.');
    if (!ok) return;
    setBusy(true);
    try {
      const res = appearance === 'share'
        ? await resumeShareDuty(shareToken || '', dutyId)
        : await eventDutyAPI.resumeDuty(dutyId);
      if (!res.duty) {
        throw new Error('This duty could not be continued.');
      }
      toast.success('Duty continued. Hours are counting again.');
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not continue this duty');
    } finally {
      setBusy(false);
    }
  };

  if (appearance === 'share') {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => { void resume(); }}
        className="rounded-full bg-[#2f6bff] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60 sm:text-[11px]"
      >
        {busy ? '…' : 'Continue'}
      </button>
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={() => { void resume(); }}>
      {busy ? 'Continuing…' : 'Continue duty'}
    </Button>
  );
}
