
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
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
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [status, setStatus] = useState<PaymentStatus | undefined>();
  const [method, setMethod] = useState<PaymentMethod | undefined>();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleFilter = () => {
    onFilter({ dateRange, status, method });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setStatus(undefined);
    setMethod(undefined);
    onSearch('');
    onFilter({});
  };

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg border mb-4">
      <Input
        placeholder="Search payments..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="max-w-sm"
      />
      
      <Select value={status} onValueChange={(value) => setStatus(value as PaymentStatus)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="partial">Partial</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by method" />
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
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      
      <Button onClick={handleFilter}>Apply Filters</Button>
      <Button variant="outline" onClick={clearFilters}>Clear</Button>
    </div>
  );
}
