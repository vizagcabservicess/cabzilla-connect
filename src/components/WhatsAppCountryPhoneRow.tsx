import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { countryCodes, type CountryCode } from '@/lib/countryCodes';
import { cn } from '@/lib/utils';

export const defaultWhatsappCountry = (): CountryCode =>
  countryCodes.find((c) => c.code === 'IN') ?? countryCodes[0];

type Props = {
  idPrefix: string;
  selectedCountry: CountryCode;
  onCountryChange: (c: CountryCode) => void;
  phoneDigits: string;
  onPhoneDigitsChange: (digits: string) => void;
  disabled?: boolean;
};

export function WhatsAppCountryPhoneRow({
  idPrefix,
  selectedCountry,
  onCountryChange,
  phoneDigits,
  onPhoneDigitsChange,
  disabled = false,
}: Props) {
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
        setCountrySearchTerm('');
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setCountrySearchTerm('');
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const filteredCountries = countryCodes.filter(
    (country) =>
      country.name.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
      country.code.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
      country.dialCode.includes(countrySearchTerm)
  );

  return (
    <div ref={rootRef} className="relative space-y-2">
      <Label htmlFor={`${idPrefix}-phone`} className="text-[13px] font-semibold text-slate-700">
        WhatsApp number
      </Label>

      <div
        className={cn(
          'flex h-12 min-h-12 items-stretch overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition-[box-shadow,border-color]',
          'focus-within:border-blue-500 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.14)]',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <button
          type="button"
          id={`${idPrefix}-country`}
          disabled={disabled}
          aria-label="Country code"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-[4.75rem] shrink-0 items-center justify-center gap-0.5 border-r border-slate-200 bg-slate-50/70 px-1.5 text-[13px] font-bold tabular-nums text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/30"
        >
          <span>{selectedCountry.dialCode}</span>
          <ChevronDown
            className={cn('h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>

        <div className="flex min-h-0 min-w-0 flex-1 items-center">
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            disabled={disabled}
            placeholder="Mobile number"
            maxLength={selectedCountry.maxLength}
            value={phoneDigits}
            onChange={(e) =>
              onPhoneDigitsChange(e.target.value.replace(/\D/g, '').slice(0, selectedCountry.maxLength))
            }
            className="h-12 min-h-12 flex-1 rounded-none border-0 bg-transparent px-3 py-0 text-base text-gray-900 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {open && (
        <div
          role="listbox"
          aria-label="Select country code"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[60] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)]"
        >
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <Input
                placeholder="Search countries..."
                value={countrySearchTerm}
                onChange={(e) => setCountrySearchTerm(e.target.value)}
                className="h-9 rounded-lg border-slate-200 pl-8 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto overscroll-contain py-1">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const selected = country.code === selectedCountry.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors',
                      selected ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50',
                    )}
                    onClick={() => {
                      onCountryChange(country);
                      setCountrySearchTerm('');
                      setOpen(false);
                    }}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {country.flag}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">{country.dialCode}</span>
                    <span className="font-medium text-slate-600">{country.code}</span>
                    <span className="truncate text-xs text-slate-500">{country.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-sm text-gray-500">No countries found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
