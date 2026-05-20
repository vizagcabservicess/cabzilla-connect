import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_GREEN, BRAND_GREEN_LIGHT } from './constants';
import { commuteScheduleLabel, normalizeScheduleId } from './scheduleUtils';

type RideScheduleBadgeProps = {
  schedule?: string;
  className?: string;
  showIcon?: boolean;
};

export function RideScheduleBadge({ schedule, className, showIcon = false }: RideScheduleBadgeProps) {
  const label = commuteScheduleLabel(normalizeScheduleId(schedule));

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold sm:text-[11px]',
        className,
      )}
      style={{ backgroundColor: BRAND_GREEN_LIGHT, color: BRAND_GREEN }}
    >
      {showIcon && <CalendarDays className="h-3 w-3 shrink-0" />}
      <span className="truncate">{label}</span>
    </span>
  );
}
