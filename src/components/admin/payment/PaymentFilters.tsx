
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Search, Filter } from "lucide-react";
import { PaymentStatus, PaymentMethod } from '@/types/payment';
import { DateRange } from "react-day-picker";

interface PaymentFiltersProps {
  onSearch: (searchTerm: string) => void;
  onFilter: (filters: {
    dateRange?: DateRange;
    status?: PaymentStatus;
    method?: PaymentMethod;
  }) => void;
}

export function PaymentFilters({ onSearch, onFilter }: PaymentFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [status, setStatus] = useState<PaymentStatus | undefined>();
  const [method, setMethod] = useState<PaymentMethod | undefined>();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleApplyFilters = () => {
    onFilter({
      dateRange,
      status,
      method
    });
  };

  const handleClearFilters = () => {
    setDateRange(undefined);
    setStatus(undefined);
    setMethod(undefined);
    onFilter({});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
          />
          
          <Select value={status} onValueChange={(value: PaymentStatus) => setStatus(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={method} onValueChange={(value: PaymentMethod) => setMethod(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="wallet">Wallet</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="razorpay">Razorpay</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters} size="sm">
              Apply
            </Button>
            <Button onClick={handleClearFilters} variant="outline" size="sm">
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
