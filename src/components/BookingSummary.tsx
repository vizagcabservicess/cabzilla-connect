
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingSummaryProps {
  pickupLocation: any;
  dropLocation: any;
  pickupDate: Date;
  selectedCab: any;
  distance: number;
  totalPrice: number;
  tripType: string;
  hourlyPackage?: string;
  showBookNow?: boolean;
  onBookNow?: () => void;
}

export const BookingSummary = ({
  pickupLocation,
  dropLocation,
  pickupDate,
  selectedCab,
  distance,
  totalPrice,
  tripType,
  hourlyPackage,
  showBookNow = false,
  onBookNow
}: BookingSummaryProps) => {
  return (
    <div className="bg-white shadow rounded-xl p-5">
      <div className="font-bold text-lg mb-2">Booking Summary</div>
      <div className="text-xs text-gray-400 font-medium mb-3 uppercase">Trip Type</div>
      <div className="flex items-center gap-2 text-sm mb-2">
        <span>Tour</span>
      </div>
      <div className="flex items-center gap-2 text-sm mb-1">
        <span className="text-blue-600 font-medium">Total Distance</span>
        <span className="text-xs font-semibold">{distance} KM</span>
      </div>
      <div className="flex items-center gap-1 text-xs mb-1">
        <span className="text-blue-600">Pickup</span>
        <span>{pickupLocation?.name}</span>
      </div>
      <div className="flex items-center gap-1 text-xs mb-2">
        <Calendar className="h-4 w-4 text-blue-500 mr-1" />
        <span>{pickupDate && pickupDate instanceof Date ? pickupDate.toLocaleString('en-IN', { dateStyle: "medium", timeStyle: "short" }) : ''}</span>
      </div>
      <hr className="my-2" />
      <div className="mb-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold">{selectedCab?.name || ""}</span>
          <span>{selectedCab?.capacity ? `${selectedCab.capacity} persons` : ""}</span>
        </div>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span>Base fare</span>
        <span>₹{totalPrice ? totalPrice.toLocaleString('en-IN') : 0}</span>
      </div>
      <div className="flex justify-between items-center font-bold mt-2 text-base">
        <span>Total Price</span>
        <span className="text-blue-700 text-xl">₹{totalPrice ? totalPrice.toLocaleString('en-IN') : 0}</span>
      </div>
      {showBookNow && (
        <Button className="w-full mt-6" onClick={onBookNow} disabled={!selectedCab}>
          Book Now
        </Button>
      )}
    </div>
  );
}
