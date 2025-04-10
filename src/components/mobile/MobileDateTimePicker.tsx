
import { Calendar } from "lucide-react";
import { DateTimePicker } from "@/components/DateTimePicker";

interface MobileDateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
}

export function MobileDateTimePicker({ 
  date, 
  onDateChange,
  minDate
}: MobileDateTimePickerProps) {
  // Safety check: ensure date is a valid Date object
  const isValidDate = date && !isNaN(date.getTime());
  
  // Only format the date if it's valid
  const formattedDate = isValidDate ? new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date) : '';
  
  const formattedTime = isValidDate ? new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date) : '';

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center mb-1">
        <span className="text-xs font-medium text-gray-500">TRIP START</span>
      </div>
      
      <div className="relative">
        <DateTimePicker
          date={isValidDate ? date : undefined}
          onDateChange={onDateChange}
          minDate={minDate}
        >
          <div className="flex items-center">
            <Calendar size={18} className="text-gray-500 mr-3" />
            {isValidDate ? (
              <div>
                <div className="font-medium">{formattedDate}</div>
                <div className="text-sm text-gray-600">{formattedTime}</div>
              </div>
            ) : (
              <span className="text-gray-500">Select date and time</span>
            )}
          </div>
        </DateTimePicker>
      </div>
    </div>
  );
}
