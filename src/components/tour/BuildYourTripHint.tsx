import { Briefcase, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildYourTripPath, scrollToBuildYourTrip } from '@/lib/buildYourTrip';
import { cn } from '@/lib/utils';

type BuildYourTripHintProps = {
  className?: string;
};

export function goBuildYourTrip(navigate?: (to: string) => void): void {
  if (typeof window !== 'undefined' && window.location.pathname === '/') {
    scrollToBuildYourTrip();
    return;
  }
  navigate?.(buildYourTripPath());
}

export function BuildYourTripHint({ className }: BuildYourTripHintProps) {
  const navigate = useNavigate();
  return (
    <section className={cn('mt-3 w-full lg:mt-0', className)}>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-[1.35rem] bg-[#FFF6E8] px-4 py-3.5 text-left shadow-[0_1px_0_rgba(253,230,190,0.8)]"
        onClick={() => goBuildYourTrip(navigate)}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center text-[#C4A574]">
          <Briefcase className="h-7 w-7" strokeWidth={1.6} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold leading-tight text-slate-900">
            Planning a trip?
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-slate-500">
            Choose multiple tours and combine them into one perfect trip.
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </button>
    </section>
  );
}
