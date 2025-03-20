
import React, { useEffect, useState } from 'react';
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationInput } from "@/components/LocationInput";
import { toast } from "sonner";
import { Location } from "@/types/api";

export default function MapDebugPage() {
  const { isLoaded, loadError, google } = useGoogleMaps();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [googleInfo, setGoogleInfo] = useState<string | null>(null);
  const [location, setLocation] = useState<Location>({
    id: 'debug_loc',
    name: '',
    address: '',
    isInVizag: false
  });

  // Check Google Maps loading status
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    
    // Safely create masked API key
    let maskedKey = 'Not configured';
    if (apiKey) {
      const firstChars = apiKey.substring(0, 4);
      const lastChars = apiKey.substring(apiKey.length - 4);
      maskedKey = `${firstChars}...${lastChars}`;
    }
    
    // Gather information about Google Maps
    let info = [
      `API Key (masked): ${maskedKey}`,
      `Maps loaded: ${isLoaded ? 'Yes ✅' : 'No ❌'}`,
      `Load Error: ${loadError ? '❌ ' + loadError.message : 'None ✅'}`,
      `Google object available: ${window.google ? 'Yes ✅' : 'No ❌'}`,
      `Google Maps available: ${window.google?.maps ? 'Yes ✅' : 'No ❌'}`,
      `Places API available: ${window.google?.maps?.places ? 'Yes ✅' : 'No ❌'}`
    ].join('\n');
    
    setGoogleInfo(info);
  }, [isLoaded, loadError, google]);
  
  // Function to help restart the Google Maps API
  const handleReloadMaps = () => {
    // We can't directly reload just the Maps API, but we can reload the page
    window.location.reload();
    toast.info("Reloading page to refresh Maps API...");
  };

  // Handle location change from LocationInput component
  const handleLocationChange = (newLocation: Location) => {
    console.log('Location changed in debug page:', newLocation);
    setLocation(newLocation);
    
    // Display success toast if a location was selected
    if (newLocation.address) {
      toast.success("Location successfully selected! Check console for details.");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Google Maps Debug Page</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Google Maps API Status</CardTitle>
            <CardDescription>
              Check if the Google Maps API is properly loaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-100 p-4 rounded text-sm">
              {googleInfo || 'Loading...'}
            </pre>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setApiKeyVisible(!apiKeyVisible)}
            >
              {apiKeyVisible ? 'Hide API Key' : 'Show API Key'}
            </Button>
            <Button onClick={handleReloadMaps}>
              Reload Maps API
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Autocomplete</CardTitle>
            <CardDescription>
              Test Google Places Autocomplete functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocationInput
              location={location}
              onLocationChange={handleLocationChange}
              placeholder="Try searching for a location"
              label="Test Location Input"
            />
            
            {location && location.address && (
              <div className="bg-slate-100 p-4 rounded">
                <h3 className="font-medium">Selected Location:</h3>
                <p className="text-sm">Name: {location.name}</p>
                <p className="text-sm">Address: {location.address}</p>
                <p className="text-sm">Coordinates: {location.lat}, {location.lng}</p>
                <p className="text-sm">In Vizag: {location.isInVizag ? 'Yes' : 'No'}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => setLocation({
                id: 'debug_loc',
                name: '',
                address: '',
                isInVizag: false
              })}
            >
              Reset Location
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
