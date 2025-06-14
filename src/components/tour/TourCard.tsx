
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";
import React from "react";
import type { TourListItem } from "@/types/tour";

// Use Poppins by default if available, else fallback
const fontClass = "font-poppins font-semibold tracking-tight";

interface TourCardProps {
  tour: TourListItem & {
    inclusions?: string[];
    sightseeingPlaces?: string[];
  };
  onClick?: () => void;
}

// Utility to format 1N/2D etc correctly
function getNightsDays(days?: number) {
  if (!days || typeof days !== "number" || days < 1) return "1N/1D";
  const nights = Math.max(1, days - 1);
  return `${nights}N/${days}D`;
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
        <Badge className="absolute right-3 top-3 bg-blue-100 text-blue-900 border-0 font-bold rounded-md text-xs shadow px-3 py-1 tracking-wide">
          {getNightsDays(tour.days)}
        </Badge>
      </div>

      <CardContent className={`px-6 pt-5 pb-6 flex flex-col flex-1 ${fontClass}`}>
        {/* Title */}
        <div className="mb-2">
          <h3 className="font-bold text-lg text-gray-900 tracking-tight leading-snug mb-1">
            {tour.tourName}
          </h3>
        </div>
        {/* Distance, Days row */}
        <div className="flex gap-4 text-gray-600 text-xs mb-2">
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {tour.distance} km
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={14} /> {tour.days} day{tour.days > 1 ? "s" : ""}
          </span>
        </div>
        {/* Description */}
        <p className="text-[13px] text-gray-700 mb-3 line-clamp-2">{tour.description}</p>

        {/* Sightseeing - green (Omitted here as per screenshot: only Araku/Lambasingi details and inclusions) */}

        {/* Inclusions - blue */}
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
            className="inline-block bg-[#2563eb] text-white font-bold py-2 px-7 rounded-lg text-sm shadow transition-all hover:bg-[#1e48b6] focus:outline-none focus:ring-2 focus:ring-blue-300"
            onClick={e => {
              e.stopPropagation();
              if (onClick) onClick();
            }}
            style={{ fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif' }}
          >
            Book Now
          </button>
          <div className="text-right">
            <div className="text-xl font-bold text-[#1565c0] leading-tight" style={{ fontFamily: '"Poppins", "Segoe UI", Arial, sans-serif' }}>₹{displayPrice.toLocaleString("en-IN")}</div>
            <div className="text-xs text-gray-500 font-semibold"><span>Starts from</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

