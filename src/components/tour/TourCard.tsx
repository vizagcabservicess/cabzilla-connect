
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Check } from "lucide-react";
import React from "react";
import type { TourListItem } from "@/types/tour";

interface TourCardProps {
  tour: TourListItem & {
    inclusions?: string[];
    sightseeingPlaces?: string[];
  };
  onClick?: () => void;
}

export const TourCard: React.FC<TourCardProps> = ({ tour, onClick }) => {
  // Compute nights
  const nights = Math.max(1, (tour.days || 1) - 1);

  // Use sightseeing first section (if available), else empty
  const sightseeing: string[] = (tour as any).sightseeingPlaces || [];
  // Use inclusions second section (dynamically)
  const inclusions: string[] = (tour as any).inclusions || [];

  // Dynamic duration badge
  const nightsDaysStr = `${nights}N/${tour.days}D`;

  // Dynamic price: sedan price, then min price fallback, then 0
  const sedanVehicleId = Object.keys(tour.pricing || {}).find(
    vid => vid.toLowerCase().includes("sedan")
  );
  const sedanPrice = sedanVehicleId ? tour.pricing[sedanVehicleId] : 0;
  const minPrice = tour.minPrice && tour.minPrice > 0 ? tour.minPrice : sedanPrice;
  const displayPrice = sedanPrice > 0 ? sedanPrice : minPrice;
  // "Starts from" vehicle type
  const startFromVehicle = sedanVehicleId ? "Sedan" : "Base";
  // Calculate EMI (3 months, showing as example)
  const emi = displayPrice > 0 ? Math.floor(displayPrice / 3) : 0;

  return (
    <Card
      className="rounded-2xl overflow-hidden shadow group flex flex-col cursor-pointer hover:shadow-lg transition-all h-full border border-gray-100"
      onClick={onClick}
    >
      <div className="relative">
        <img
          src={tour.imageUrl}
          alt={tour.tourName}
          className="object-cover w-full h-40"
        />
        <Badge className="absolute right-3 top-3 bg-white/90 text-gray-900 border font-bold rounded-md text-xs shadow px-3 py-1">
          {nightsDaysStr}
        </Badge>
      </div>
      <CardContent className="flex-1 flex flex-col px-5 pt-4 pb-4">
        {/* Title & subtitle */}
        <div className="mb-1">
          <h3 className="font-semibold text-lg text-gray-900 leading-tight">{tour.tourName}</h3>
        </div>
        {/* Distance, Days */}
        <div className="flex gap-3 text-gray-600 text-xs mb-2">
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {tour.distance} km
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={14} /> {tour.days} day{tour.days > 1 ? "s" : ""}
          </span>
        </div>
        {/* Description */}
        <p className="text-xs text-gray-700 mb-3 line-clamp-2">{tour.description}</p>
        {/* Sightseeing Place List */}
        {sightseeing.length > 0 && (
          <ul className="mb-1 space-y-0.5">
            {sightseeing.map((place, idx) => (
              <li key={idx} className="flex items-center gap-2 text-[15px] text-green-700 font-medium">
                <Check className="h-4 w-4 text-green-500" /> {place}
              </li>
            ))}
          </ul>
        )}
        {/* Inclusions List */}
        {inclusions.length > 0 && (
          <ul className="mb-3 space-y-0.5 mt-1">
            {inclusions.map((inc, idx) => (
              <li key={idx} className="flex items-center gap-2 text-[15px] text-blue-700 font-medium">
                <Check className="h-4 w-4 text-blue-500" /> {inc}
              </li>
            ))}
          </ul>
        )}
        {/* Pricing & Action Row */}
        <div className="flex items-end justify-between mt-auto pt-2 gap-2">
          <div>
            <button
              className="inline-block bg-[#1565c0] text-white py-1.5 px-6 rounded font-semibold text-sm shadow hover:bg-[#1e88e5] transition-all"
              onClick={e => {
                e.stopPropagation();
                if (onClick) onClick();
              }}
            >
              Book Now
            </button>
            <div className="text-xs text-gray-600 mt-1.5 font-medium">
              {startFromVehicle} &middot; 4 persons
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-[#1565c0] leading-tight">
              ₹{displayPrice.toLocaleString("en-IN")}
              <span className="text-sm font-normal text-gray-700 ml-1"></span>
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-medium">Starts from</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

