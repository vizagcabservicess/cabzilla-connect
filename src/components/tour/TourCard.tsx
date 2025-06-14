
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Check } from "lucide-react";
import React from "react";
import type { TourListItem } from "@/types/tour";

interface TourCardProps {
  tour: TourListItem;
  onClick?: () => void;
}

export const TourCard: React.FC<TourCardProps> = ({ tour, onClick }) => {
  // Highlights to mimic "Round Trip Flights", "Intercity Car Transfers", etc.
  // These could be dynamic in the future if available in the API/data.
  const staticHighlights = [
    "Round Trip Flights",
    "4 Star Hotel & Houseboat",
    "Intercity Car Transfers",
    "Airport Transfers",
    "Selected Meals",
  ];
  const staticActivities = [
    "Houseboat Day Cruise",
    "Photoshoot at Tea Estate",
    "Speed Boat Ride",
  ];

  // Compute no. of nights/days
  const nights = Math.max(1, tour.days - 1);

  return (
    <Card
      className="rounded-xl overflow-hidden shadow group flex flex-col cursor-pointer hover:shadow-lg transition-all h-full"
      onClick={onClick}
    >
      <div className="relative">
        <img
          src={tour.imageUrl}
          alt={tour.tourName}
          className="object-cover w-full h-40"
        />
        <Badge className="absolute right-3 top-3 bg-white/80 text-gray-900 border font-bold rounded-md text-xs shadow px-3 py-1">
          {nights}N/{tour.days}D
        </Badge>
      </div>
      <CardContent className="flex-1 flex flex-col px-4 pt-3 pb-4">
        {/* Title & subtitle */}
        <div className="mb-1">
          <h3 className="font-semibold text-base text-gray-900 leading-tight">{tour.tourName}</h3>
          {/* Destinations are not separated in your data, but you may add them */}
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
        {/* Short Description */}
        <p className="text-xs text-gray-700 mb-3 line-clamp-2">{tour.description}</p>
        {/* --- List (mimic screenshot) --- */}
        <ul className="mb-2 space-y-0.5">
          {staticHighlights.map((hl, idx) => (
            <li key={idx} className="flex items-center gap-2 text-[13px] text-gray-800">
              <Check className="h-3.5 w-3.5 text-green-500" /> {hl}
            </li>
          ))}
        </ul>
        <ul className="mb-3 space-y-0.5">
          {staticActivities.map((act, idx) => (
            <li key={idx} className="flex items-center gap-2 text-[13px] text-teal-600">
              <Check className="h-3.5 w-3.5 text-teal-600" /> {act}
            </li>
          ))}
        </ul>
        {/* Pricing row */}
        <div className="flex items-end justify-between mt-auto pt-1 gap-2">
          <div className="text-xs text-gray-600">
            {/* Example EMI (static for now) */}
            No Cost EMI at <span className="font-bold text-[#1565c0]">₹{Math.floor((tour.minPrice || 5000) / 3).toLocaleString("en-IN")}/month</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-[#1565c0] leading-tight">
              ₹{(tour.minPrice || 5000).toLocaleString("en-IN")}
              <span className="text-xs font-normal text-gray-700 ml-1">/Person</span>
            </div>
            <div className="text-xs text-gray-500">
              {/* Example "Total Price": show a guessed total */}
              Total Price ₹{((tour.minPrice || 5000) * 4).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
