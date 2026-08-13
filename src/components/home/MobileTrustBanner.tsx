import type { ReactNode } from 'react';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { cn } from '@/lib/utils';

type TrustBadgeTone = 'green' | 'blue' | 'amber' | 'gold';

const TONE_STYLES: Record<TrustBadgeTone, { ring: string; fill: string; icon: string }> = {
  green: {
    ring: 'bg-emerald-50 text-emerald-600',
    fill: 'bg-emerald-500',
    icon: 'text-white',
  },
  blue: {
    ring: 'bg-blue-50 text-blue-600',
    fill: 'bg-blue-500',
    icon: 'text-white',
  },
  amber: {
    ring: 'bg-amber-50 text-amber-700',
    fill: 'bg-amber-400',
    icon: 'text-white',
  },
  gold: {
    ring: 'bg-yellow-50 text-yellow-600',
    fill: 'bg-yellow-400',
    icon: 'text-white',
  },
};

function TrustBadgeIcon({
  tone,
  children,
  innerClassName,
}: {
  tone: TrustBadgeTone;
  children: ReactNode;
  innerClassName?: string;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm ring-4 ring-white',
        styles.ring
      )}
      aria-hidden
    >
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          styles.fill,
          styles.icon,
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

const TRUST_BADGES = [
  {
    tone: 'green' as const,
    title: 'GST Registered',
    subtitle: '100% Compliant',
    icon: <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />,
  },
  {
    tone: 'blue' as const,
    title: 'Verified',
    subtitle: 'Google Verified',
    icon: <BadgeCheck className="h-4 w-4" strokeWidth={2.5} />,
  },
  {
    tone: 'amber' as const,
    title: '6+ Years',
    subtitle: 'Since 2020',
    icon: <span className="text-[11px] font-bold leading-none">6+</span>,
  },
  {
    tone: 'gold' as const,
    title: '4.9 Rating',
    subtitle: '700+ Reviews',
    icon: <FcGoogle className="h-4 w-4" aria-hidden />,
    innerClassName: 'bg-white text-inherit',
  },
] as const;

export function MobileTrustBanner() {
  return (
    <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-white px-2.5 py-3 shadow-sm">
      <div className="grid grid-cols-4 items-start gap-x-1">
        {TRUST_BADGES.map(({ tone, title, subtitle, icon, innerClassName }) => (
          <div key={title} className="flex min-w-0 flex-col items-center text-center">
            <TrustBadgeIcon tone={tone} innerClassName={innerClassName}>
              {icon}
            </TrustBadgeIcon>
            <p className="mt-2 flex min-h-[1.25rem] w-full items-start justify-center px-0.5 text-[10px] font-semibold leading-tight text-slate-900">
              {title}
            </p>
            <p className="flex min-h-[1.25rem] w-full items-start justify-center px-0.5 text-[9px] leading-snug text-slate-500">
              {subtitle}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
