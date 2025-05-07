
import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"

interface DateRangePickerProps {
  date: DateRange | undefined;
  onSelect: (date: DateRange | undefined) => void;
}

export function DateRangePicker({ date, onSelect }: DateRangePickerProps) {
  return (
    <Calendar
      initialFocus
      mode="range"
      defaultMonth={date?.from}
      selected={date}
      onSelect={onSelect}
      numberOfMonths={2}
      className="pointer-events-auto"
    />
  )
}
