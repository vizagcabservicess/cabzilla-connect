
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock } from "lucide-react";
import React from "react";
import type { TourListItem } from "@/types/tour";

// Use Poppins by default if available, else fallback
const fontClass = "font-poppins font-medium tracking-tight";

interface TourCardProps {
  tour: TourListItem & {
    inclusions?: string[];
    sightseeingPlaces?: string[];
    category?: string; // Optional for future: like "Nature & Adventure"
    difficulty?: string; // e.g. "Easy"
  };
  onClick?: () => void;
}

// Utility to format 1N/2D etc correctly (only used as fallback)
function getNightsDays(days?: number) {
  if (!days || typeof days !== "number" || days < 1) return "1N/1D";
  const nights = Math.max(1, days - 1);
  return `${nights}N/${days}D`;
}

// Utility for duration text display
function getDurationText(tour: TourListItem & { timeDuration?: string; days?: number }) {
  if (tour.timeDuration && tour.timeDuration.trim().length > 0) {
    return tour.timeDuration;
  }
  // fallback to 1N/1D, 2N/3D etc.
  return getNightsDays(tour.days);
}

export const TourCard: React.FC<TourCardProps> = ({ tour, onClick }) => {
  // Always expect inclusions/sightseeing as arrays, else empty
  const sightseeing: string[] = Array.isArray(tour.sightseeingPlaces) ? tour.sightseeingPlaces : [];
  const inclusions: string[] = Array.isArray(tour.inclusions) ? tour.inclusions : [];

  // Price selection and formatting
  const sedanVehicleId = Object.keys(tour.pricing || {}).find(
    (vid) => vid.toLowerCase().includes("sedan")
  );
  const sedanPrice = sedanVehicleId ? tour.pricing[sedanVehicleId] : 0;
  const minPrice = tour.minPrice && tour.minPrice > 0 ? tour.minPrice : sedanPrice;
  const displayPrice = sedanPrice > 0 ? sedanPrice : minPrice;

  return (
    <Card
      className="rounded-2xl overflow-hidden shadow-lg transition-all h-full border-0 bg-[#fafbfc] flex flex-col font-sans cursor-pointer"
      style={{ fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif' }}
      onClick={onClick}
    >
      {/* Image with duration badge */}
      <div className="relative">
        <img
          src={tour.imageUrl}
          alt={tour.tourName}
          className="object-cover w-full h-40"
          style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        />
        <Badge className="absolute right-3 top-3 bg-blue-100 text-blue-900 border-0 font-medium rounded-md text-xs shadow px-3 py-1 tracking-wide"
          style={{
            fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif',
            fontWeight: 500
          }}
        >
          {getDurationText(tour)}
        </Badge>
      </div>

      <CardContent className={`px-6 pt-5 pb-6 flex flex-col flex-1 ${fontClass}`}>
        {/* Title and optional badge row */}
        <div className="mb-2">
          <h3 className="font-medium text-lg text-gray-900 tracking-tight leading-snug mb-1"
              style={{ fontWeight: 500, fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif' }}>
            {tour.tourName}
          </h3>
          {/* Optional badges (for future: category/difficulty) */}
          {/* <div className="flex gap-2 mb-1">
            {tour.category && (
              <Badge className="bg-[#EBF1FF] text-[#2744FF] font-medium rounded px-2 py-0.5 text-xs">
                {tour.category}
              </Badge>
            )}
            {tour.difficulty && (
              <Badge className="bg-[#F4F4F4] text-gray-700 font-medium rounded px-2 py-0.5 text-xs">
                {tour.difficulty}
              </Badge>
            )}
          </div> */}
        </div>
        {/* Distance, Days, (Optional: Duration) */}
        <div className="flex gap-4 text-gray-600 text-xs mb-2 items-center">
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {tour.distance} km
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={14} /> {tour.days} day{tour.days > 1 ? "s" : ""}
          </span>
        </div>
        {/* Description */}
        <p className="text-[13px] text-gray-700 mb-3 line-clamp-2">{tour.description}</p>
        {/* Sightseeing is currently omitted – add if needed per design */}
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
        {/* Book Now & Price */}
        <div className="flex items-end justify-between mt-auto pt-3 gap-2">
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
          <div className="text-right">
            <div className="text-xl font-medium text-[#1565c0] leading-tight"
                 style={{ fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif', fontWeight: 500 }}>
              ₹{displayPrice.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-gray-500 font-medium"><span>Starts from</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
