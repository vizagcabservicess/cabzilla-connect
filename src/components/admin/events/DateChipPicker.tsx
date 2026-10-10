import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDutyDate, formatDutyDateShort, toLocalIsoDate } from '@/lib/eventDuty';

interface DateChipPickerProps {
  dates: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function dateFromIso(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function DateChipPicker({ dates, selected, onChange }: DateChipPickerProps) {
  const toggle = (date: string) => {
    onChange(selected.includes(date) ? selected.filter((d) => d !== date) : [...selected, date].sort());
  };
  const allowed = new Set(dates);
  const selectedDays = selected.map(dateFromIso);
  const fromDate = dates[0] ? dateFromIso(dates[0]) : undefined;
  const toDate = dates.length ? dateFromIso(dates[dates.length - 1]) : undefined;

  return (
    <div className="space-y-2">
      <Calendar
        mode="multiple"
        selected={selectedDays}
        onSelect={(days) => {
          const next = (days || [])
            .map(toLocalIsoDate)
            .filter((iso) => allowed.has(iso))
            .sort();
          onChange(next);
        }}
        disabled={(day) => !allowed.has(toLocalIsoDate(day))}
        fromDate={fromDate}
        toDate={toDate}
        defaultMonth={fromDate}
      />
      <div className="flex flex-wrap gap-2">
        {dates.map((date) => {
          const active = selected.includes(date);
          return (
            <Button
              key={date}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => toggle(date)}
            >
              {formatDutyDateShort(date)}
            </Button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...dates])}>
          Select all
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
          Clear
        </Button>
      </div>
    </div>
  );
}

export function EventDateFilter({
  dates,
  value,
  onChange,
}: {
  dates: string[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const allowed = new Set(dates);
  const fromDate = dates[0] ? dateFromIso(dates[0]) : undefined;
  const toDate = dates.length ? dateFromIso(dates[dates.length - 1]) : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline">
            <CalendarDays className="mr-2 h-4 w-4" />
            {value ? formatDutyDate(value) : 'Filter by date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? dateFromIso(value) : undefined}
            onSelect={(day) => {
              if (!day) {
                onChange(null);
                return;
              }
              const iso = toLocalIsoDate(day);
              onChange(allowed.has(iso) ? iso : null);
            }}
            disabled={(day) => !allowed.has(toLocalIsoDate(day))}
            fromDate={fromDate}
            toDate={toDate}
            defaultMonth={value ? dateFromIso(value) : fromDate}
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          All dates
        </Button>
      )}
    </div>
  );
}
