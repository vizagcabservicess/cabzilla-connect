import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  WhatsAppCountryPhoneRow,
  defaultWhatsappCountry,
} from '@/components/WhatsAppCountryPhoneRow';
import { cn } from '@/lib/utils';
import type { CountryCode } from '@/lib/countryCodes';

type GuestWhatsAppPhoneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idPrefix: string;
  selectedCountry: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  phoneDigits: string;
  onPhoneDigitsChange: (digits: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  submitIcon?: ReactNode;
  description: string;
  routeLabel?: string;
};

export { defaultWhatsappCountry };

export function GuestWhatsAppPhoneDialog({
  open,
  onOpenChange,
  idPrefix,
  selectedCountry,
  onCountryChange,
  phoneDigits,
  onPhoneDigitsChange,
  onSubmit,
  submitLabel,
  submitIcon,
  description,
  routeLabel,
}: GuestWhatsAppPhoneDialogProps) {
  const canSubmit = phoneDigits.length === selectedCountry.maxLength;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="guest-wa-dialog w-[calc(100%-2rem)] max-w-[400px] gap-0 overflow-visible rounded-3xl border-0 bg-white p-0 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.28)] sm:w-full"
        showClose
      >
        <div className="relative overflow-hidden rounded-t-3xl bg-[linear-gradient(165deg,#e8f3ff_0%,#f0f7ff_42%,#ffffff_100%)] px-5 pb-4 pt-6 sm:px-6 sm:pt-7">
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#25D366]/15 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-8 top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366] shadow-[0_10px_24px_-8px_rgba(37,211,102,0.65)]">
              <FaWhatsapp className="h-7 w-7 text-white" aria-hidden />
            </div>
            <DialogHeader className="space-y-1.5 text-center sm:text-center">
              <DialogTitle className="text-[1.35rem] font-bold tracking-tight text-slate-900">
                Continue with WhatsApp
              </DialogTitle>
              <DialogDescription className="mx-auto max-w-[20rem] text-[13px] leading-relaxed text-slate-600">
                {description}
              </DialogDescription>
            </DialogHeader>

            {routeLabel ? (
              <div className="mt-3.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
                <span className="truncate">{routeLabel}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 space-y-4 overflow-visible rounded-b-3xl bg-white px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
          <WhatsAppCountryPhoneRow
            idPrefix={idPrefix}
            selectedCountry={selectedCountry}
            onCountryChange={(country) => {
              onCountryChange(country);
              onPhoneDigitsChange('');
            }}
            phoneDigits={phoneDigits}
            onPhoneDigitsChange={onPhoneDigitsChange}
          />

          <ul className="flex flex-col gap-1.5 text-[11px] text-slate-500 sm:text-xs">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
              Used only for booking updates — no spam
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
              Instant WhatsApp confirmation after you book
            </li>
          </ul>

          <DialogFooter className="mt-0 flex flex-col gap-0 sm:justify-stretch">
            <Button
              type="button"
              disabled={!canSubmit}
              className={cn(
                'h-12 w-full rounded-full text-[15px] font-bold tracking-wide shadow-sm transition-all',
                canSubmit
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                  : 'cursor-not-allowed bg-slate-200 text-slate-500 opacity-100 hover:bg-slate-200'
              )}
              onClick={onSubmit}
            >
              {submitIcon}
              {submitLabel}
            </Button>
            <p className="mt-3 text-center text-[11px] leading-snug text-slate-500">
              By continuing, you agree to our{' '}
              <Link
                to="/terms-conditions"
                className="font-medium text-blue-600 underline-offset-2 hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Terms
              </Link>{' '}
              &amp;{' '}
              <Link
                to="/privacy-policy"
                className="font-medium text-blue-600 underline-offset-2 hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Privacy Policy
              </Link>
              .
            </p>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
