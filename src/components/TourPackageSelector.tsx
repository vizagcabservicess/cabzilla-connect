
import React, { useState, useEffect, useRef } from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { TourInfo } from '@/types/cab';
import { fareAPI } from '@/services/api';
import { availableTours, loadTourFares } from '@/lib/tourData';
import { MapPin } from 'lucide-react';
import { getApiUrl } from '@/config/api';

interface TourPackageSelectorProps {
  selectedTour: string | null;
  onTourChange: (tourId: string) => void;
}

export function TourPackageSelector({ selectedTour, onTourChange }: TourPackageSelectorProps) {
  const { toast } = useToast();
  const [tours, setTours] = useState<TourInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isInitialMount = useRef(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Skip the initial fetch if we already have a selected tour
    // This prevents unnecessary API calls and state updates
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (selectedTour) {
        return;
      }
    }

    const fetchTours = async () => {
      if (isLoading || hasError || hasFetchedRef.current) return;
      
      hasFetchedRef.current = true;
      setIsLoading(true);
      try {
        // Use the correct API endpoint that matches the backend structure
        const response = await fetch(getApiUrl('/api/fares/tours.php'));
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const tourData = await response.json();
        
        if (Array.isArray(tourData) && tourData.length > 0) {
          // Map API data to TourInfo format
          const apiTours: TourInfo[] = tourData.map(tour => ({
            id: tour.tourId,
            name: tour.tourName,
            distance: tour.distance || 0, // Use distance if provided, otherwise default to 0
            days: tour.days || 1,         // Use days if provided, otherwise default to 1
            image: `/tours/${tour.tourId}.jpg` // Assume images follow this naming convention
          }));
          
          console.log("Successfully loaded tours from API:", apiTours);
          setTours(apiTours);
          
          // Also load the tour fares to make sure they're cached
          await loadTourFares();
          
          // If no tour is selected, select the first one
          if (!selectedTour && apiTours.length > 0) {
            onTourChange(apiTours[0].id);
          }
        } else {
          // Fall back to local data if API returns empty result
          console.log("API returned no tours, using local data:", availableTours);
          setTours(availableTours);
          
          // If no tour is selected, select the first one
          if (!selectedTour && availableTours.length > 0) {
            onTourChange(availableTours[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching tours:", error);
        setHasError(true); // Set error flag to prevent continuous retries
        
        // Fall back to local data
        setTours(availableTours);
        
        // Only show the error toast once to avoid notification spam
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
  }, [selectedTour, onTourChange, toast, isLoading, hasError]); 

  // If tours are loaded from API/local but there's no selection, set a default
  useEffect(() => {
    if (!selectedTour && tours.length > 0 && !isLoading) {
      // This useEffect handles default selection cleanly without causing loops
      onTourChange(tours[0].id);
    }
  }, [tours, selectedTour, onTourChange, isLoading]);

  const handleTourChange = (tourId: string) => {
    console.log(`Tour selection changed to: ${tourId}`);
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
