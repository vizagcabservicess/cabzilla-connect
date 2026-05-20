import { useMemo, useRef, useState } from 'react';
import { Building2, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type CompanySearchSelectProps = {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
};

export function CompanySearchSelect({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = 'Select or search your company',
}: CompanySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const select = (option: string) => {
    onChange(option);
    setQuery(option);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-10 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-green-50',
                  value === option && 'bg-green-50 font-medium text-green-800',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(option)}
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
