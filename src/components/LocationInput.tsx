import React, { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Location } from "@/lib/locationData";
import { MapPin } from "lucide-react";

interface LocationInputProps {
  label?: string;
  placeholder: string;
  value?: any;
  onLocationChange: (location: Location) => void;
  isPickupLocation?: boolean;
  isAirportTransfer?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function LocationInput({
  label,
  placeholder,
  value,
  onLocationChange,
  isPickupLocation = false,
  isAirportTransfer = false,
  readOnly = false,
  className
}: LocationInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.address || value?.name || "");
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      setInputValue(value.address || value.name || "");
    }
  }, [value]);

  const handleLocationSelect = (location: Location) => {
    setInputValue(location.address || location.name || "");
    setIsOpen(false);
    onLocationChange(location);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchQuery(newValue);
    setIsOpen(true);
    
    // Create a temporary location object for immediate feedback
    const tempLocation: Location = {
      id: 'temp_' + Date.now(),
      name: newValue,
      address: newValue,
      city: '',
      state: '',
      lat: 0,
      lng: 0,
      type: 'other',
      popularityScore: 1,
      isInVizag: false
    };
    onLocationChange(tempLocation);
  };

  const filteredLocations = React.useMemo(() => {
    const searchTerm = searchQuery.toLowerCase();
    
    // Ensure vizagLocations is defined and is an array
    if (!Array.isArray(vizagLocations)) {
      console.error("vizagLocations is not defined or is not an array.");
      return [];
    }
    
    return vizagLocations.filter((location) => {
      const nameMatch = location.name?.toLowerCase().includes(searchTerm);
      const addressMatch = location.address?.toLowerCase().includes(searchTerm);
      return nameMatch || addressMatch;
    });
  }, [searchQuery]);
  
  const vizagLocations: Location[] = [
    {
      id: "vizag-airport",
      name: "Visakhapatnam Airport",
      address: "Visakhapatnam Airport, NH16, Visakhapatnam, Andhra Pradesh 530009, India",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.7167,
      lng: 83.2167,
      type: "airport",
      popularityScore: 90,
      isInVizag: true
    },
    {
      id: "railway-station",
      name: "Visakhapatnam Railway Station",
      address: "Railway Station Rd, Dondaparthy, Visakhapatnam, Andhra Pradesh 530004",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.7264,
      lng: 83.3072,
      type: "railway_station",
      popularityScore: 85,
      isInVizag: true
    },
    {
      id: "dwaraka-nagar",
      name: "Dwaraka Nagar",
      address: "Dwaraka Nagar, Visakhapatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.7204,
      lng: 83.3094,
      type: "neighborhood",
      popularityScore: 75,
      isInVizag: true
    },
    {
      id: "rk-beach",
      name: "RK Beach",
      address: "RK Beach Rd, Visakhapatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.7104,
      lng: 83.3247,
      type: "beach",
      popularityScore: 80,
      isInVizag: true
    },
    {
      id: "jagadamba-center",
      name: "Jagadamba Center",
      address: "Jagadamba Junction, Visakhapatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.7011,
      lng: 83.3044,
      type: "shopping_center",
      popularityScore: 70,
      isInVizag: true
    },
    {
      id: "mvp-double-road",
      name: "MVP Double Road",
      address: "MVP Double Road, Sector 8, MVP Colony, Visakhapatnam",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.7411,
      lng: 83.3344,
      type: "shopping_area",
      popularityScore: 65,
      isInVizag: true
    },
    {
      id: "arilova",
      name: "Arilova",
      address: "Arilova, Visakhapatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.7611,
      lng: 83.3544,
      type: "residential",
      popularityScore: 60,
      isInVizag: true
    },
    {
      id: "simhachalam-temple",
      name: "Simhachalam Temple",
      address: "Simhachalam Rd, Simhachalam, Visakhapatnam, Andhra Pradesh 530028",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.7811,
      lng: 83.3744,
      type: "tourist_attraction",
      popularityScore: 70,
      isInVizag: true
    },
    {
      id: "kailasagiri",
      name: "Kailasagiri",
      address: "Kailasagiri, Visakhapatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.7911,
      lng: 83.3944,
      type: "tourist_attraction",
      popularityScore: 75,
      isInVizag: true
    },
    {
      id: "rushikonda-beach",
      name: "Rushikonda Beach",
      address: "Rushikonda Beach, Visakhapatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.8011,
      lng: 83.4144,
      type: "beach",
      popularityScore: 80,
      isInVizag: true
    },
    {
      id: "bheemili",
      name: "Bheemili",
      address: "Bheemunipatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.8900,
      lng: 83.4400,
      type: "town",
      popularityScore: 55,
      isInVizag: true
    },
    {
      id: "tagarapuvalasa",
      name: "Tagarapuvalasa",
      address: "Tagarapuvalasa, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.9300,
      lng: 83.4000,
      type: "town",
      popularityScore: 50,
      isInVizag: true
    },
    {
      id: "pendurthi",
      name: "Pendurthi",
      address: "Pendurthi, Visakhapatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.7800,
      lng: 83.2000,
      type: "town",
      popularityScore: 45,
      isInVizag: true
    },
    {
      id: "gajuwaka",
      name: "Gajuwaka",
      address: "Gajuwaka, Visakhapatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.6800,
      lng: 83.2000,
      type: "town",
      popularityScore: 50,
      isInVizag: true
    },
    {
      id: "kurmannapalem",
      name: "Kurmannapalem",
      address: "Kurmannapalem, Visakhapatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.6500,
      lng: 83.1800,
      type: "town",
      popularityScore: 40,
      isInVizag: true
    },
    {
      id: "parawada",
      name: "Parawada",
      address: "Parawada, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.6300,
      lng: 83.0800,
      type: "town",
      popularityScore: 35,
      isInVizag: true
    },
    {
      id: "narsipatnam",
      name: "Narsipatnam",
      address: "Narsipatnam, Andhra Pradesh",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      lat: 17.6800,
      lng: 82.9800,
      type: "town",
      popularityScore: 30,
      isInVizag: false
    }
  ];
  
  return (
    <div className={cn("w-full mb-4", className)}>
      {label && (
        <label
          htmlFor={isPickupLocation ? "pickup-location" : "dropoff-location"}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <Popover open={isOpen && !readOnly} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div 
              className={cn(
                "w-full relative",
                readOnly && "cursor-not-allowed opacity-75"
              )}
            >
              <Input
                id={isPickupLocation ? "pickup-location" : "dropoff-location"}
                ref={inputRef}
                placeholder={placeholder}
                value={inputValue}
                onChange={handleInputChange}
                onClick={() => !readOnly && setIsOpen(true)}
                className={cn(
                  "pr-10",
                  isAirportTransfer && readOnly ? "bg-gray-100" : ""
                )}
                readOnly={readOnly}
                aria-label={label || (isPickupLocation ? "Pickup location" : "Dropoff location")}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="p-0 w-[300px] md:w-[400px]" 
            align="start"
            sideOffset={5}
          >
            <Command>
              <CommandInput 
                placeholder={`Search ${isPickupLocation ? "pickup" : "dropoff"} location...`} 
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-11"
              />
              <CommandList className="max-h-[300px] overflow-auto">
                <CommandEmpty className="p-2 text-sm text-center">
                  No locations found. Try a different search.
                </CommandEmpty>
                <CommandGroup heading="Popular Locations">
                  {filteredLocations.map((location) => (
                    <CommandItem
                      key={location.id}
                      value={location.id}
                      onSelect={() => handleLocationSelect(location)}
                      className="flex items-start py-3 cursor-pointer"
                    >
                      <div className="mr-2 mt-1">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{location.name}</span>
                        <span className="text-xs text-gray-500 line-clamp-2">
                          {location.address}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
