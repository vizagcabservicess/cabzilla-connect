import '@/lib/fonts-poppins';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Check } from "lucide-react";
import React, { useState } from "react";
import type { TourListItem } from "@/types/tour";
import { TourAddToWidgetButton } from "@/components/tour/TourAddToWidgetButton";
import { TourItineraryDialog } from "@/components/tour/TourItineraryDialog";
import { DateTimePicker } from "@/components/DateTimePicker";
import { useTourCart } from "@/hooks/useTourCart";
import { startingTourPrice } from "@/lib/tourVehiclePrice";

// Use Poppins by default if available, else fallback
const fontClass = "font-poppins font-medium tracking-tight";

interface TourCardProps {
  tour: TourListItem & {
    inclusions?: string[];
    sightseeingPlaces?: string[];
    category?: string;
    difficulty?: string;
  };
  onClick?: () => void;
  onAddToWidget?: () => void;
  onRemove?: () => void;
  onToggleListed?: () => void;
  selected?: boolean;
  listed?: boolean;
  compact?: boolean;
  tourDate?: Date;
  dateConflict?: boolean;
  onTourDateChange?: (date: Date | undefined) => void;
  minDate?: Date;
}

// Clean duration: prefer timeDuration if present and not empty/whitespace
function getDurationText(tour: TourListItem & { timeDuration?: string; days?: number }) {
  if (tour.timeDuration && tour.timeDuration.trim().length > 0) {
    return tour.timeDuration.trim();
  }
  // fallback to 1N/1D, 2N/3D etc.
  if (!tour.days || typeof tour.days !== "number" || tour.days < 1) return "1N/1D";
  const nights = Math.max(1, tour.days - 1);
  return `${nights}N/${tour.days}D`;
}

export const TourCard: React.FC<TourCardProps> = ({
  tour,
  onClick,
  onAddToWidget,
  onRemove,
  onToggleListed,
  selected = false,
  listed = true,
  compact = false,
  tourDate,
  dateConflict = false,
  onTourDateChange,
  minDate,
}) => {
  const { has: cartHas } = useTourCart();
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const sightseeing: string[] = Array.isArray(tour.sightseeingPlaces) ? tour.sightseeingPlaces : [];
  const inclusions: string[] = Array.isArray(tour.inclusions) ? tour.inclusions : [];

  const displayPrice = startingTourPrice(tour.pricing) || (tour.minPrice > 0 ? tour.minPrice : 0);

  return (
    <Card
      className={`rounded-2xl overflow-hidden shadow-lg transition-all bg-[#fafbfc] flex flex-col font-sans cursor-pointer ${
        compact ? 'h-auto self-start' : 'h-full'
      } ${selected ? 'border-2 border-blue-600 ring-2 ring-blue-100' : 'border-0'} ${
        onToggleListed && !listed ? 'opacity-75' : ''
      }`}
      style={{ fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif' }}
      onClick={onClick}
    >
      {/* Image with duration badge */}
      <div className="relative">
        <img
          src={tour.imageUrl}
          alt={tour.tourName}
          className={`object-cover w-full ${compact ? 'h-28' : 'h-40'}`}
          style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        />
        {(onAddToWidget || onRemove) && (
          <TourAddToWidgetButton
            tourName={tour.tourName}
            onAdd={onAddToWidget}
            onRemove={onRemove}
            inCart={compact || cartHas(tour.tourId, tour.tourName)}
            removeWithX={compact}
            className="left-3 top-3"
          />
        )}
        <Badge className="absolute right-3 top-3 bg-blue-100 text-blue-900 border-0 font-medium rounded-md text-xs shadow px-3 py-1 tracking-wide"
          style={{
            fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif',
            fontWeight: 500
          }}
        >
          {tour.timeDuration && tour.timeDuration.trim().length > 0 ? tour.timeDuration.trim() : "Full Day"}
        </Badge>
      </div>

      <CardContent className={`${compact ? 'px-4 pt-3 pb-4' : 'px-6 pt-5 pb-6 flex-1'} flex flex-col ${fontClass}`}>
        {/* Title and optional badge row */}
        <div className="mb-2">
          <h3 className={`font-medium text-gray-900 tracking-tight leading-snug mb-1 ${compact ? 'text-sm' : 'text-lg'}`}
              style={{ fontWeight: 500, fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif' }}>
            {tour.tourName}
          </h3>
        </div>
        {/* Distance, Days */}
        <div className="flex gap-4 text-gray-600 text-xs mb-2 items-center">
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {tour.distance} km
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={14} /> {tour.days} day{tour.days > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="ml-auto shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              setItineraryOpen(true);
            }}
          >
            View Itinerary
          </button>
        </div>
        <TourItineraryDialog
          open={itineraryOpen}
          onOpenChange={setItineraryOpen}
          tourId={tour.tourId}
          tourName={tour.tourName}
        />
        {/* Description */}
        <p className="text-[13px] text-gray-700 mb-3 line-clamp-2">{tour.description}</p>
        {onTourDateChange && (
          <div
            className={`mb-2 rounded-lg border px-2.5 py-1 ${
              dateConflict ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200' : 'border-slate-200 bg-white'
            }`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <DateTimePicker
              label="TOUR DATE"
              date={tourDate}
              onDateChange={onTourDateChange}
              minDate={minDate || new Date()}
              variant="infield"
              className="w-full"
            />
            {dateConflict ? (
              <p className="px-0.5 pb-1.5 text-[10px] font-medium leading-snug text-amber-800">
                Same date & time as another tour. Choose a different slot.
              </p>
            ) : null}
          </div>
        )}
        {/* Inclusions */}
        {inclusions.length > 0 &&
          <ul className="mb-3 mt-0.5">
            {inclusions.map((inc, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <span className="text-blue-500 text-base">✔</span>
                <span>{inc}</span>
              </li>
            ))}
          </ul>
        }
        <div className={`flex items-end justify-between gap-2 ${compact ? 'mt-2 pt-2' : 'mt-auto pt-3'}`}>
          {onToggleListed ? (
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                listed
                  ? 'border border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                  : 'border border-slate-300 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-700'
              }`}
              style={{
                fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif',
                fontWeight: 500
              }}
              onClick={(event) => {
                event.stopPropagation();
                onToggleListed();
              }}
            >
              {listed ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : null}
              {listed ? 'Selected' : 'Select now'}
            </button>
          ) : (
            <button
              className="inline-block bg-[#2563eb] hover:bg-[#1662c4] text-white font-medium py-2 px-7 rounded-lg text-sm shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-300"
              style={{
                fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif',
                fontWeight: 500
              }}
              onClick={e => {
                e.stopPropagation();
                if (onClick) onClick();
              }}
            >
              Book Now
            </button>
          )}
          <div className="text-right flex flex-col items-end">
            <div className="text-xs text-gray-500 font-medium mb-1" style={{ fontWeight: 500 }}>
              Starts from
            </div>
            <div className="text-xl font-medium text-[#1565c0] leading-tight"
              style={{ fontWeight: 500, fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif' }}>
              ₹{displayPrice.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
