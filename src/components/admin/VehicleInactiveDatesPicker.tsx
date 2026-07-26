import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MAX_PREVIEW_DAYS = 366;

interface InactiveDateRange {
  id: string;
  from: Date;
  to: Date;
  reason?: string;
}

interface VehicleInactiveDatesPickerProps {
  inactiveDates: InactiveDateRange[];
  onInactiveDatesChange: (dates: InactiveDateRange[]) => void;
  className?: string;
}

export function VehicleInactiveDatesPicker({
  inactiveDates,
  onInactiveDatesChange,
  className
}: VehicleInactiveDatesPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');

  const previewSelectedDates = useMemo(() => {
    const dates: Date[] = [];
    for (const range of inactiveDates) {
      if (!range?.from || !range?.to) continue;
      const start = new Date(range.from);
      const end = new Date(range.to);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) continue;
      const current = new Date(start);
      let added = 0;
      while (current <= end && dates.length < MAX_PREVIEW_DAYS && added < MAX_PREVIEW_DAYS) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
        added += 1;
      }
      if (dates.length >= MAX_PREVIEW_DAYS) break;
    }
    return dates;
  }, [inactiveDates]);

  const addInactiveDateRange = () => {
    if (selectedRange?.from && selectedRange?.to) {
      const newRange: InactiveDateRange = {
        id: Date.now().toString(),
        from: selectedRange.from,
        to: selectedRange.to,
        reason: reason.trim() || undefined
      };

      console.log('Adding new inactive date range:', newRange);
      const updatedDates = [...inactiveDates, newRange];
      console.log('Updated inactive dates:', updatedDates);
      onInactiveDatesChange(updatedDates);
      setSelectedRange(undefined);
      setReason('');
      setIsOpen(false);
    }
  };

  const removeInactiveDateRange = (id: string) => {
    onInactiveDatesChange(inactiveDates.filter(range => range.id !== id));
  };

  const isDateInInactiveRange = (date: Date) => {
    return inactiveDates.some(range => 
      date >= range.from && date <= range.to
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Vehicle Inactive Dates</h3>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Inactive Period
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Date Range
                </label>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={selectedRange?.from}
                  selected={selectedRange}
                  onSelect={setSelectedRange}
                  numberOfMonths={2}
                  disabled={(date) => date < new Date()}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Maintenance, Driver leave"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedRange(undefined);
                    setReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={addInactiveDateRange}
                  disabled={!selectedRange?.from || !selectedRange?.to}
                >
                  Add Period
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {inactiveDates.length > 0 ? (
        <div className="space-y-2">
          {inactiveDates.map((range) => (
            <Card key={range.id} className="border-orange-200 bg-orange-50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {format(range.from, 'MMM dd, yyyy')} - {format(range.to, 'MMM dd, yyyy')}
                      </Badge>
                      {range.reason && (
                        <span className="text-sm text-gray-600">
                          ({range.reason})
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInactiveDateRange(range.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No inactive periods set</p>
          <p className="text-xs text-gray-400">Vehicle is available for all dates</p>
        </div>
      )}

      {/* Calendar Preview */}
      {inactiveDates.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Calendar Preview</h4>
          <Card>
            <CardContent className="p-4">
              <Calendar
                mode="multiple"
                selected={previewSelectedDates}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
                modifiers={{
                  inactive: (date) => isDateInInactiveRange(date)
                }}
                modifiersStyles={{
                  inactive: { backgroundColor: '#fed7aa', color: '#9a3412' }
                }}
              />
              <div className="mt-3 flex items-center space-x-4 text-xs text-gray-600">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-orange-200 rounded"></div>
                  <span>Inactive dates</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
