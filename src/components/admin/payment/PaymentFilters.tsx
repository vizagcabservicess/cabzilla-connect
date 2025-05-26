
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateRange } from 'react-day-picker';
import { PaymentStatus, PaymentMethod } from '@/types/payment';

interface PaymentFiltersProps {
  onSearch: (term: string) => void;
  onFilter: (filters: {
    dateRange?: DateRange;
    status?: PaymentStatus;
    method?: PaymentMethod;
  }) => void;
}

export function PaymentFilters({ onSearch, onFilter }: PaymentFiltersProps) {
  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <Input
            placeholder="Search payments..."
            onChange={(e) => onSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
