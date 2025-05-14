
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";

interface Location {
  address: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

interface LocationSearchInputProps {
  placeholder?: string;
  onSelectLocation: (location: Location) => void;
  required?: boolean;
  defaultValue?: string;
}

export function LocationSearchInput({ 
  placeholder, 
  onSelectLocation, 
  required = false,
  defaultValue = '' 
}: LocationSearchInputProps) {
  const [searchValue, setSearchValue] = useState(defaultValue);
  
  // In a real application, we would use the Google Places API here
  // For now, we'll just simulate a selection
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue) {
      onSelectLocation({
        address: searchValue,
        lat: 0, // Would be populated by Google Places API
        lng: 0, // Would be populated by Google Places API
        placeId: 'place123' // Would be populated by Google Places API
      });
    }
  };

  useEffect(() => {
    if (defaultValue) {
      setSearchValue(defaultValue);
    }
  }, [defaultValue]);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input 
        placeholder={placeholder || "Search for a location"}
        className="pl-10"
        value={searchValue}
        onChange={handleChange}
        required={required}
      />
    </form>
  );
}
