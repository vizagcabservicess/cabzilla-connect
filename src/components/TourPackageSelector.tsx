
import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { TourInfo } from '@/types/cab';
import { fareAPI } from '@/services/api';
import { availableTours } from '@/lib/tourData';
import { MapPin } from 'lucide-react';

interface TourPackageSelectorProps {
  selectedTour: string | null;
  onTourChange: (tourId: string) => void;
}

export function TourPackageSelector({ selectedTour, onTourChange }: TourPackageSelectorProps) {
  const { toast } = useToast();
  const [tours, setTours] = useState<TourInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTours = async () => {
      setIsLoading(true);
      try {
        // Try to fetch tours from API
        const tourData = await fareAPI.getTourFares();
        
        if (Array.isArray(tourData) && tourData.length > 0) {
          // Map API data to TourInfo format
          const apiTours: TourInfo[] = tourData.map(tour => ({
            id: tour.tourId,
            name: tour.tourName,
            distance: 0, // Default distance
            days: 1,     // Default days
            image: `/tours/${tour.tourId}.jpg` // Assume images follow this naming convention
          }));
          
          console.log("Loaded tours from API:", apiTours);
          setTours(apiTours);
          
          // If no tour is selected, select the first one
          if (!selectedTour && apiTours.length > 0) {
            onTourChange(apiTours[0].id);
          }
        } else {
          // Fall back to local data if API returns empty result
          console.log("Using local tours data:", availableTours);
          setTours(availableTours);
          
          // If no tour is selected, select the first one
          if (!selectedTour && availableTours.length > 0) {
            onTourChange(availableTours[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching tours:", error);
        
        // Fall back to local data
        setTours(availableTours);
        toast({
          title: "Could not fetch tours",
          description: "Using default tour packages instead.",
          variant: "destructive",
          duration: 3000,
        });
        
        // If no tour is selected, select the first one
        if (!selectedTour && availableTours.length > 0) {
          onTourChange(availableTours[0].id);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTours();
  }, [selectedTour, onTourChange, toast]);

  const handleTourChange = (tourId: string) => {
    onTourChange(tourId);
  };

  const selectedTourInfo = tours.find(tour => tour.id === selectedTour);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 mb-1">SELECT TOUR PACKAGE</Label>
      <Select
        value={selectedTour || ''}
        onValueChange={handleTourChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "Loading tours..." : "Select a tour package"} />
        </SelectTrigger>
        <SelectContent>
          {tours.map((tour) => (
            <SelectItem key={tour.id} value={tour.id} className="py-2">
              <div className="flex flex-col">
                <span>{tour.name}</span>
                {tour.distance > 0 && (
                  <span className="text-xs text-gray-500 flex items-center mt-1">
                    <MapPin size={12} className="mr-1" />
                    {tour.distance} km journey
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedTourInfo && (
        <div className="mt-2 text-sm text-gray-600">
          <div className="flex items-center">
            <MapPin size={14} className="mr-1 text-blue-500" />
            <span>{selectedTourInfo.name} - {selectedTourInfo.distance > 0 ? `${selectedTourInfo.distance} km` : 'Custom tour'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
