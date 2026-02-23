import React from 'react';
import { cn } from '@/lib/utils';
import type { SeatStatus } from '@/services/api/groupTourAPI';

// 17-seater layout: Row1: 1, Row2-5: 4 each
const SEAT_LAYOUT: string[][] = [
  ['S1'],
  ['S2', 'S3', 'S4', 'S5'],
  ['S6', 'S7', 'S8', 'S9'],
  ['S10', 'S11', 'S12', 'S13'],
  ['S14', 'S15', 'S16', 'S17'],
];

export type SeatDisplayStatus = 'available' | 'available_female_only' | 'selected' | 'reserved' | 'booked' | 'booked_female' | 'blocked' | 'driver';

interface SeatMapProps {
  seats: Record<string, SeatStatus>;
  selectedSeats: string[];
  onSeatClick: (seatId: string) => void;
  maxSelections?: number;
  disabled?: boolean;
  customerGender?: 'male' | 'female' | '';
  showPrices?: boolean;
  basePrice?: number;
}

export function SeatMap({ seats, selectedSeats, onSeatClick, maxSelections = 6, disabled, customerGender = '', showPrices = false, basePrice = 500 }: SeatMapProps) {
  const getDisplayStatus = (seatId: string): SeatDisplayStatus => {
    if (seatId === 'DRIVER') return 'driver';
    const s = seats[seatId];
    if (!s) return 'available';
    if (s.status === 'booked') return s.passenger_gender === 'female' ? 'booked_female' : 'booked';
    if (s.status === 'blocked') return 'blocked';
    if (s.status === 'reserved') return 'reserved';
    if (selectedSeats.includes(seatId)) return 'selected';
    return s.is_female_only ? 'available_female_only' : 'available';
  };

  const handleClick = (seatId: string) => {
    if (seatId === 'DRIVER' || disabled) return;
    const status = getDisplayStatus(seatId);
    if (status === 'booked' || status === 'booked_female' || status === 'reserved' || status === 'blocked') return;
    if (status === 'selected') {
      onSeatClick(seatId);
      return;
    }
    // Female-only seats: only female passengers can select
    if (status === 'available_female_only' && customerGender === 'male') return;
    if (selectedSeats.length >= maxSelections) return;
    onSeatClick(seatId);
  };

  const seatStyles: Record<SeatDisplayStatus, string> = {
    available:
      'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-emerald-600',
    available_female_only:
      'bg-pink-500 hover:bg-pink-400 text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-pink-600',
    selected:
      'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400 ring-offset-2 cursor-pointer border-2 border-blue-700',
    reserved:
      'bg-amber-400 text-amber-900 cursor-not-allowed opacity-80 border-2 border-amber-500',
    booked:
      'bg-gray-400 text-gray-600 cursor-not-allowed opacity-70 border-2 border-gray-500',
    booked_female:
      'bg-pink-200 text-pink-900 cursor-not-allowed opacity-80 border-2 border-pink-400',
    blocked:
      'bg-red-300 text-red-800 cursor-not-allowed opacity-80 border-2 border-red-500',
    driver:
      'bg-gray-700 text-gray-300 cursor-not-allowed border-2 border-gray-800',
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-emerald-500 border border-emerald-600" />
          <span>Available (all)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-pink-500 border border-pink-600" />
          <span>Female only</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-blue-600 border border-blue-700" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-amber-400 border border-amber-500" />
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-400 border border-gray-500" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-pink-200 border border-pink-400" />
          <span>Booked (F)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-300 border border-red-500" />
          <span>Blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-700 border border-gray-800" />
          <span>Driver</span>
        </div>
      </div>

      {/* Bus layout */}
      <div className="relative bg-gradient-to-b from-slate-100 to-slate-200 rounded-2xl p-4 sm:p-6 shadow-xl border-2 border-slate-300">
        {/* Windshield */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 sm:w-24 sm:h-5 bg-slate-400 rounded-t-full opacity-60" />

        {/* Driver seat */}
        <div className="flex justify-center mb-3">
          <button
            type="button"
            disabled
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 rounded-lg font-bold text-[10px] sm:text-xs flex items-center justify-center',
              seatStyles.driver
            )}
          >
            DRIVER
          </button>
        </div>

        {/* Passenger seats */}
        {SEAT_LAYOUT.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={cn(
              'flex justify-center gap-2 sm:gap-3 mb-3',
              rowIdx === 0 ? 'gap-0' : ''
            )}
          >
            {row.map((seatId) => {
              const status = getDisplayStatus(seatId);
              const isClickable =
                status === 'available' ||
                (status === 'available_female_only' && customerGender === 'female') ||
                (status === 'selected' && selectedSeats.includes(seatId));
              return (
                <button
                  key={seatId}
                  type="button"
                  disabled={!isClickable || disabled}
                  onClick={() => handleClick(seatId)}
                  className={cn(
                    'min-w-[2.25rem] min-h-[2.25rem] sm:min-w-[2.75rem] sm:min-h-[2.75rem] rounded-lg font-semibold text-[10px] sm:text-xs flex flex-col items-center justify-center transition-transform hover:scale-105 active:scale-95 py-0.5 px-1',
                    seatStyles[status],
                    !isClickable && status !== 'driver' && 'hover:scale-100'
                  )}
                >
                  <span>{seatId}</span>
                  {showPrices && status !== 'driver' && (status === 'available' || status === 'available_female_only' || status === 'selected') && (
                    <span className="text-[8px] sm:text-[9px] font-normal opacity-90 leading-tight">
                      ₹{((seats[seatId]?.price ?? basePrice)).toLocaleString('en-IN')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
