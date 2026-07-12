import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

const CARPOOL_BANNER_SRC =
  'https://vizagtaxihub.com/uploads/mobile-banner.jpg';

const DISMISS_KEY = 'vth-shared-carpool-popup-dismissed';
const OPEN_DELAY_MS = 600;

type SharedCarpoolingPopupProps = {
  enabled?: boolean;
};

export function SharedCarpoolingPopup({ enabled = true }: SharedCarpoolingPopupProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;

    const timer = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) dismiss();
    else setOpen(true);
  };

  if (!enabled) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showClose={false}
        className="left-auto top-auto max-w-[min(92vw,20rem)] translate-x-0 translate-y-0 gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none bottom-20 right-4 sm:bottom-6 sm:right-6 sm:max-w-xs"
      >
        <DialogTitle className="sr-only">
          Travel together, save together — Vizag Taxi Hub shared carpooling
        </DialogTitle>

        <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            aria-label="Close shared carpooling promotion"
          >
            <X className="h-4 w-4" />
          </button>

          <Link
            to="/shared-carpooling"
            onClick={dismiss}
            className="block"
            aria-label="Explore shared carpooling in Vizag"
          >
            <img
              src={CARPOOL_BANNER_SRC}
              alt="Travel together, save together — Vizag Taxi Hub shared carpooling for daily commute"
              className="h-auto w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use SharedCarpoolingPopup */
export const SharedCarpoolingBanner = SharedCarpoolingPopup;
