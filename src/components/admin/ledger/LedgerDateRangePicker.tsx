
import React, { useState } from 'react';
import { DateRange } from "react-day-picker";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { Calendar } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface LedgerDateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onApply: () => void;
  disabled?: boolean;
}

export function LedgerDateRangePicker({
  dateRange,
  onDateRangeChange,
  onApply,
  disabled = false
}: LedgerDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Preset date range handlers
  const handleToday = () => {
    const today = new Date();
    onDateRangeChange({ from: today, to: today });
  };

  const handleThisWeek = () => {
    const today = new Date();
    onDateRangeChange({ 
      from: startOfWeek(today, { weekStartsOn: 1 }), 
      to: endOfWeek(today, { weekStartsOn: 1 }) 
    });
  };

  const handleThisMonth = () => {
    const today = new Date();
    onDateRangeChange({ from: startOfMonth(today), to: endOfMonth(today) });
  };

  const handleYTD = () => {
    const today = new Date();
    onDateRangeChange({ from: startOfYear(today), to: today });
  };

  const handleLast30Days = () => {
    const today = new Date();
    onDateRangeChange({ from: subDays(today, 30), to: today });
  };

  // Handle apply and close popover
  const handleApplyClick = () => {
    onApply();
    setIsOpen(false);
  };

  return (
    <div className="flex items-center space-x-2">
      <DatePickerWithRange
        date={dateRange}
        setDate={onDateRangeChange}
        disabled={disabled}
      />

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-10" disabled={disabled}>
            <Calendar className="h-4 w-4 mr-2" />
            Presets
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="end">
          <div className="grid gap-1">
            <Button variant="ghost" size="sm" onClick={handleToday} className="justify-start">
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={handleThisWeek} className="justify-start">
              This Week
            </Button>
            <Button variant="ghost" size="sm" onClick={handleThisMonth} className="justify-start">
              This Month
            </Button>
            <Button variant="ghost" size="sm" onClick={handleYTD} className="justify-start">
              Year to Date
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLast30Days} className="justify-start">
              Last 30 Days
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button onClick={handleApplyClick} disabled={!dateRange || disabled}>
        Apply
      </Button>
    </div>
  );
}
