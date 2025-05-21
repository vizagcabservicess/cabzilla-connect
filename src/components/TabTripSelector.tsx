import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhoneIcon, PlaneIcon, CarIcon, MapIcon } from "lucide-react";
import { TripType } from "@/lib/tripTypes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

interface TabTripSelectorProps {
  selectedTab: TripType;
  tripMode: string;
  onTabChange: (value: TripType) => void;
  onTripModeChange: (value: string) => void;
}

export function TabTripSelector({
  selectedTab,
  tripMode,
  onTabChange,
  onTripModeChange
}: TabTripSelectorProps) {
  const navigate = useNavigate();
  
  const handleTabChange = (value: TripType) => {
    if (value === 'tour') {
      // For tour tab, navigate to the tours page
      navigate('/tours');
      return;
    }
    
    // For other tabs, use the normal behavior
    onTabChange(value);
  };
  
  return (
    <Tabs
      defaultValue={selectedTab}
      value={selectedTab}
      onValueChange={handleTabChange}
      className="w-full"
    >
      <TabsList className="w-full bg-muted flex">
        <TabsTrigger value="outstation" className="flex-1">
          <PhoneIcon className="mr-1 h-4 w-4 hidden sm:block" />
          Outstation
        </TabsTrigger>
        <TabsTrigger value="airport" className="flex-1">
          <PlaneIcon className="mr-1 h-4 w-4 hidden sm:block" />
          Airport
        </TabsTrigger>
        <TabsTrigger value="local" className="flex-1">
          <CarIcon className="mr-1 h-4 w-4 hidden sm:block" />
          Local
        </TabsTrigger>
        <TabsTrigger value="tour" className="flex-1">
          <MapIcon className="mr-1 h-4 w-4 hidden sm:block" />
          Tour
        </TabsTrigger>
      </TabsList>
      <TabsContent value="outstation">
        <div className="flex items-center space-x-2">
          <Label>Trip Mode</Label>
          <RadioGroup defaultValue={tripMode} className="flex h-9 gap-2" onValueChange={onTripModeChange}>
            <RadioGroupItem value="one-way" id="r1" />
            <Label htmlFor="r1">One Way</Label>
            <RadioGroupItem value="round-trip" id="r2" />
            <Label htmlFor="r2">Round Trip</Label>
          </RadioGroup>
        </div>
      </TabsContent>
      <TabsContent value="airport">
        <p className="text-sm text-muted-foreground">
          Select Airport trip for transfers to and from the airport.
        </p>
      </TabsContent>
      <TabsContent value="local">
        <p className="text-sm text-muted-foreground">
          Book local trips by hourly packages.
        </p>
      </TabsContent>
      <TabsContent value="tour">
        <p className="text-sm text-muted-foreground">
          Explore our tour packages.
        </p>
      </TabsContent>
    </Tabs>
  );
}
