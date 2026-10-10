import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface EventListFilterValue {
  vehicle: string;
  from: string;
  to: string;
}

interface EventListFiltersProps {
  vehicles: string[];
  value: EventListFilterValue;
  onChange: (next: EventListFilterValue) => void;
  extra?: ReactNode;
}

export function EventListFilters({ vehicles, value, onChange, extra }: EventListFiltersProps) {
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
      <div className="min-w-0 w-full md:w-auto">
        <Label>Vehicle</Label>
        <Select value={value.vehicle} onValueChange={(vehicle) => onChange({ ...value, vehicle })}>
          <SelectTrigger className="w-full min-w-0 md:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vehicles</SelectItem>
            {vehicles.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 w-full md:w-auto">
        <Label>From</Label>
        <Input className="w-full min-w-0" type="date" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      </div>
      <div className="min-w-0 w-full md:w-auto">
        <Label>To</Label>
        <Input className="w-full min-w-0" type="date" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} />
      </div>
      <div className="flex min-w-0 flex-wrap gap-2">{extra}</div>
    </div>
  );
}
