import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface SmartBudgetCountdownProps {
  expiresAt: string | null | undefined;
  label?: string;
  className?: string;
  onExpire?: () => void;
  /** Green stacked badge for the customer offer page. */
  variant?: 'default' | 'offer';
}

export function SmartBudgetCountdown({
  expiresAt,
  label = 'Time left',
  className,
  onExpire,
  variant = 'default',
}: SmartBudgetCountdownProps) {
  const [remainingMs, setRemainingMs] = useState(() => {
    if (!expiresAt) return 0;
    return new Date(expiresAt).getTime() - Date.now();
  });

  useEffect(() => {
    if (!expiresAt) return;
    let expiredFired = false;

    const tick = () => {
      const next = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(next);
      if (next <= 0 && !expiredFired) {
        expiredFired = true;
        onExpire?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpire]);

  if (!expiresAt) return null;

  const expired = remainingMs <= 0;
  const timeLabel = expired ? 'Expired' : formatRemaining(remainingMs);

  if (variant === 'offer') {
    return (
      <div
        className={cn(
          'inline-flex flex-col items-center justify-center rounded-2xl px-3.5 py-2 text-center shadow-sm',
          expired
            ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
            : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80',
          className
        )}
      >
        <span className="text-[10px] font-medium leading-tight text-emerald-700/80">
          {label}
        </span>
        <span className="mt-0.5 text-base font-bold tabular-nums tracking-wide">
          {timeLabel}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium tabular-nums',
        expired
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-amber-200 bg-amber-50 text-amber-900',
        className
      )}
    >
      <span className="text-xs uppercase tracking-wide opacity-70">{label}</span>
      <span>{expired ? 'Expired' : formatRemaining(remainingMs)}</span>
    </div>
  );
}
