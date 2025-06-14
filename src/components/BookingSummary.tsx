
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
    <div className="bg-white rounded-lg shadow p-4 mb-2 max-w-md mx-auto">
      <div className="font-semibold text-lg mb-2">Booking Summary</div>
      <div className="text-sm mb-1"><b>Trip Type:</b> {tripType === 'tour' ? 'Tour' : tripType}</div>
      <div className="text-sm mb-1"><b>Pickup:</b> {pickupLocation?.name}</div>
      <div className="text-sm mb-1">
        <b>Pickup Date:</b>{" "}
        {pickupDate && pickupDate instanceof Date
          ? pickupDate.toLocaleString('en-IN', { dateStyle: "medium", timeStyle: "short" })
          : ''}
      </div>
      <div className="text-sm mb-1"><b>Total Distance:</b> {distance} km</div>
      <hr className="my-2" />
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="font-semibold">{selectedCab?.name || ""}</span>
        <span>{selectedCab?.capacity ? `${selectedCab.capacity} persons` : ""}</span>
      </div>
      <div className="flex justify-between items-center text-sm mb-1">
        <span>Base fare:</span>
        <span>₹{totalPrice ? totalPrice.toLocaleString('en-IN') : 0}</span>
      </div>
      <div className="flex justify-between items-center font-semibold mt-2 text-base">
        <span>Total Price:</span>
        <span className="text-blue-700 text-lg">₹{totalPrice ? totalPrice.toLocaleString('en-IN') : 0}</span>
      </div>
      {showBookNow && (
        <Button className="w-full mt-5" onClick={onBookNow} disabled={!selectedCab}>
          Book Now
        </Button>
      )}
    </div>
  );
}
