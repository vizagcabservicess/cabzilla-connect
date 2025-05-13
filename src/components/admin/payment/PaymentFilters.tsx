import React, { useState } from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Search, Filter, CalendarRange } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PaymentStatus, PaymentMethod } from '@/types/payment';

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
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all');
  const [method, setMethod] = useState<PaymentMethod | 'all'>('all');
  
  const handleSearch = () => {
    onSearch(searchTerm);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleFilter = () => {
    const filters: {
      dateRange?: DateRange;
      status?: PaymentStatus;
      method?: PaymentMethod;
    } = {};
    
    if (dateRange) filters.dateRange = dateRange;
    if (status && status !== 'all') filters.status = status as PaymentStatus;
    if (method && method !== 'all') filters.method = method as PaymentMethod;
    
    onFilter(filters);
  };
  
  const handleReset = () => {
    setDateRange(undefined);
    setStatus('all');
    setMethod('all');
    onFilter({});
  };
  
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex w-full">
          <Input
            placeholder="Search by booking number, customer name, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyPress}
            className="rounded-r-none"
          />
          <Button 
            variant="default" 
            className="rounded-l-none" 
            onClick={handleSearch}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium leading-none">Filter Payments</h4>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <DatePickerWithRange 
                  date={dateRange}
                  setDate={setDateRange}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Status</label>
                <Select value={status} onValueChange={(value) => setStatus(value as PaymentStatus | 'all')}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod | 'all')}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Payment Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
                <Button size="sm" onClick={handleFilter}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Active Filters */}
      {(dateRange?.from || (status && status !== 'all') || (method && method !== 'all')) && (
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="text-muted-foreground">Active filters:</span>
          
          {dateRange?.from && (
            <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md flex items-center gap-1">
              <CalendarRange className="h-3.5 w-3.5" />
              {format(dateRange.from, 'PPP')}
              {dateRange.to && ` - ${format(dateRange.to, 'PPP')}`}
            </div>
          )}
          
          {status && status !== 'all' && (
            <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
              Status: {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          )}
          
          {method && method !== 'all' && (
            <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
              Method: {method.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
