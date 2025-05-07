
import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"

interface DateRangePickerProps {
  date: DateRange | undefined;
  onSelect: (date: DateRange | undefined) => void;
}

export function DateRangePicker({ date, onSelect }: DateRangePickerProps) {
  // Check if date is valid before using it
  const validDate: DateRange | undefined = React.useMemo(() => {
    if (!date) return undefined;
    
    try {
      // Validate from and to dates
      const from = date.from ? new Date(date.from) : undefined;
      const to = date.to ? new Date(date.to) : undefined;
      
      // Check if dates are valid
      if (from && isNaN(from.getTime())) return undefined;
      if (to && isNaN(to.getTime())) return undefined;
      
      return { 
        from: from, 
        to: to 
      };
    } catch (error) {
      console.error("Invalid date range:", error);
      return undefined;
    }
  }, [date]);
  
  return (
    <Calendar
      initialFocus
      mode="range"
      defaultMonth={validDate?.from}
      selected={validDate}
      onSelect={onSelect}
      numberOfMonths={2}
      className="pointer-events-auto"
    />
  )
}

export default DateRangePicker;
