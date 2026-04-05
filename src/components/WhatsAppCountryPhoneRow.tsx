import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  useEffect(() => {
    return () => setCountrySearchTerm('');
  }, []);

  const filteredCountries = countryCodes.filter(
    (country) =>
      country.name.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
      country.code.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
      country.dialCode.includes(countrySearchTerm)
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-phone`} className="text-base font-medium text-gray-800">
        WhatsApp number
      </Label>

      {/* Country column: fixed min-width on mobile so +91 (IN) never truncates; phone takes the rest */}
      <div
        className={cn(
          'flex h-12 min-h-12 items-stretch overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-[box-shadow,border-color]',
          'focus-within:border-blue-400 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <div className="flex w-auto min-w-[9.75rem] max-w-[11rem] flex-[0_0_auto] items-center border-r border-gray-200 bg-slate-50/50 px-2.5 sm:min-w-[10.25rem] sm:max-w-[11.5rem] sm:px-3">
          <span className="sr-only">Country code</span>
          <Select
            value={selectedCountry.code}
            disabled={disabled}
            onValueChange={(value) => {
              const country = countryCodes.find((c) => c.code === value);
              if (country) {
                onCountryChange(country);
                setCountrySearchTerm('');
              }
            }}
          >
            <SelectTrigger
              id={`${idPrefix}-country`}
              aria-label="Country code, tap to change"
              className="h-12 min-h-12 w-full min-w-0 gap-1 border-0 bg-transparent px-0 py-0 shadow-none hover:bg-transparent focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-transparent [&>span]:line-clamp-none [&>span]:overflow-visible [&>span]:whitespace-nowrap [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-gray-800 [&>svg]:opacity-70"
            >
              <SelectValue>
                <span className="inline-flex max-w-none items-baseline gap-1 whitespace-nowrap text-base font-bold tabular-nums leading-none text-gray-900">
                  <span>{selectedCountry.dialCode}</span>
                  <span className="text-sm font-semibold text-gray-600">({selectedCountry.code})</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[200] max-h-72 w-[min(100vw-2rem,22rem)] rounded-xl border border-gray-200 shadow-lg">
              <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search countries..."
                    value={countrySearchTerm}
                    onChange={(e) => setCountrySearchTerm(e.target.value)}
                    className="h-9 rounded-lg border-gray-200 pl-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <SelectItem key={country.code} value={country.code} className="cursor-pointer rounded-lg">
                      <div className="flex items-center gap-2 py-0.5">
                        <span>{country.flag}</span>
                        <span className="font-medium text-gray-900">{country.code}</span>
                        <span className="text-gray-600">{country.dialCode}</span>
                        <span className="truncate text-xs text-gray-500">{country.name}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-gray-500">No countries found</div>
                )}
              </div>
            </SelectContent>
          </Select>
        </div>

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
    </div>
  );
}
