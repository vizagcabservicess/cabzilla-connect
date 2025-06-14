import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, Car, Clock } from "lucide-react";
import { formatDate, formatTime } from '@/lib/dateUtils';
import { formatPrice } from '@/lib/cabData';

interface Location {
  name: string;
  isInVizag: boolean;
}

interface Vehicle {
  name: string;
  price: number;
  imageUrl?: string;
}

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate: Date | undefined;
  selectedCab: Vehicle | null;
  distance: number;
  totalPrice: number;
  tripType: string;
  hourlyPackage?: string;
}

export function BookingSummary(props: BookingSummaryProps) {
  console.log("BookingSummary props:", props);
  const {
    pickupLocation,
    dropLocation,
    pickupDate,
    selectedCab,
    distance,
    totalPrice,
    tripType,
    hourlyPackage
  } = props;

  return (
    <Card className="bg-gray-50 border-0">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold">Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {pickupLocation && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>
                Pickup: {pickupLocation.name}
              </span>
            </div>
          )}

          {dropLocation && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>
                Drop: {dropLocation.name}
              </span>
            </div>
          )}

          {pickupDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>
                {formatDate(pickupDate)} {formatTime(pickupDate)}
              </span>
            </div>
          )}

          {selectedCab && (
            <div className="flex items-center gap-2 text-sm">
              <Car className="h-4 w-4 text-gray-500" />
              <span>
                Vehicle: {selectedCab.name}
              </span>
            </div>
          )}

          {tripType && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>
                Trip Type: {tripType} {hourlyPackage && `(${hourlyPackage})`}
              </span>
            </div>
          )}

          {distance && (
            <div className="flex items-center gap-2 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-gray-500"
              >
                <path
                  fillRule="evenodd"
                  d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.214 4.5-2.599 4.5H4.645c-2.386 0-3.754-2.5-2.599-4.5L9.401 3.003zM12 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Distance: {distance} km</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total Price:</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
