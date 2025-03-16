
import { LocalTripPurpose, HourlyPackage, hourlyPackages, getLocalPackagePrice, clearFareCaches } from "@/lib/cabData";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";

interface LocalTripSelectorProps {
  tripPurpose: LocalTripPurpose;
  onTripPurposeChange: (value: LocalTripPurpose) => void;
  hourlyPackage: string;
  onHourlyPackageChange: (value: string) => void;
}

export function LocalTripSelector({ 
  tripPurpose, 
  onTripPurposeChange, 
  hourlyPackage, 
  onHourlyPackageChange 
}: LocalTripSelectorProps) {
  
  // Clear fare caches on component mount to ensure fresh calculations
  useEffect(() => {
    console.log("LocalTripSelector mounted with package:", hourlyPackage);
    clearFareCaches(); // Clear caches on component mount
    
    if (!hourlyPackage) {
      console.log("Setting default hourly package");
      onHourlyPackageChange(hourlyPackages[0].id);
    }
  }, []);

  // Clear caches when package changes to ensure fresh pricing
  const handlePackageChange = (value: string) => {
    console.log("Hourly package changed to:", value);
    clearFareCaches(); // Clear caches when package changes
    onHourlyPackageChange(value);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="trip-purpose" className="text-xs font-medium text-gray-700">TRIP PURPOSE</Label>
        <Select 
          value={tripPurpose} 
          onValueChange={(val) => onTripPurposeChange(val as LocalTripPurpose)}
        >
          <SelectTrigger id="trip-purpose" className="w-full mt-1">
            <SelectValue placeholder="Select trip purpose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="business">Business Trip</SelectItem>
            <SelectItem value="personal">Personal Trip</SelectItem>
            <SelectItem value="city-tour">City Tour</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="hourly-package" className="text-xs font-medium text-gray-700">HOURLY PACKAGE</Label>
        <Select 
          value={hourlyPackage} 
          onValueChange={handlePackageChange}
        >
          <SelectTrigger id="hourly-package" className="w-full mt-1">
            <SelectValue placeholder="Select hourly package" />
          </SelectTrigger>
          <SelectContent>
            {hourlyPackages.map((pkg) => (
              <SelectItem key={pkg.id} value={pkg.id}>
                {pkg.name} - ₹{getLocalPackagePrice(pkg.id, 'sedan')}+
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
