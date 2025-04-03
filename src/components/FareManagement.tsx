
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getApiUrl } from '@/config/api';
import { formatDataForMultipart } from '@/utils/apiHelper';

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'airport';
}

interface LocalFare {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

interface AirportFare {
  vehicleId: string;
  priceOneWay: number;
  priceRoundTrip: number;
  nightCharges: number;
  extraWaitingCharges: number;
}

type Fare = LocalFare | AirportFare;

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fare, setFare] = useState<Fare | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFareData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const endpoint = fareType === 'local' 
          ? `api/admin/direct-local-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}` 
          : `api/admin/direct-airport-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`;
        
        const response = await fetch(getApiUrl(endpoint), {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Force-Refresh': 'true'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load ${fareType} fare data`);
        }

        const data = await response.json();

        if (data.status === 'success' && data.fares && data.fares.length > 0) {
          setFare(data.fares[0]);
          console.log(`Loaded ${fareType} fare data:`, data.fares[0]);
        } else if (data.status === 'success' && (!data.fares || data.fares.length === 0)) {
          // Create default fare structure if none exists
          const defaultFare = createDefaultFare(vehicleId, fareType);
          setFare(defaultFare);
          console.log(`No ${fareType} fare found, using default:`, defaultFare);
        } else {
          throw new Error(data.message || `Failed to load ${fareType} fare data`);
        }
      } catch (err) {
        console.error(`Error loading ${fareType} fares:`, err);
        setError(`Error loading ${fareType} fare data. Please try again.`);
        // Create default fare structure on error
        const defaultFare = createDefaultFare(vehicleId, fareType);
        setFare(defaultFare);
      } finally {
        setIsLoading(false);
      }
    };

    if (vehicleId) {
      loadFareData();
    }
  }, [vehicleId, fareType]);

  const createDefaultFare = (vehicleId: string, type: 'local' | 'airport'): Fare => {
    if (type === 'local') {
      return {
        vehicleId,
        price4hrs40km: 0,
        price8hrs80km: 0,
        price10hrs100km: 0,
        priceExtraKm: 0,
        priceExtraHour: 0
      } as LocalFare;
    } else {
      return {
        vehicleId,
        priceOneWay: 0,
        priceRoundTrip: 0,
        nightCharges: 0,
        extraWaitingCharges: 0
      } as AirportFare;
    }
  };

  const handleChange = (field: string, value: string) => {
    if (!fare) return;
    
    const numericValue = parseFloat(value) || 0;
    
    setFare({
      ...fare,
      [field]: numericValue
    });
  };

  const handleSave = async () => {
    if (!fare || !vehicleId) return;
    
    try {
      setIsSaving(true);
      setError(null);

      // Determine the correct endpoint based on the fare type
      const endpoint = fareType === 'local' 
        ? 'api/admin/local-fares-update.php'
        : 'api/admin/airport-fares-update.php';

      // Create form data
      const formData = formatDataForMultipart({
        ...fare,
        vehicle_id: vehicleId // Ensure we have the vehicle ID
      });

      // Make the API call
      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to save ${fareType} fare data`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fare updated successfully`);
      } else {
        throw new Error(result.message || `Failed to save ${fareType} fare data`);
      }
    } catch (err: any) {
      console.error(`Error saving ${fareType} fare:`, err);
      setError(`Error saving ${fareType} fare data: ${err.message}`);
      toast.error(`Failed to save ${fareType} fare data`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading {fareType} fare data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {fareType === 'local' ? 'Local Package Fares' : 'Airport Transfer Fares'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          {fareType === 'local' && fare && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price4hrs40km">4 Hours / 40 KM (₹)</Label>
                  <Input
                    id="price4hrs40km"
                    type="number"
                    value={(fare as LocalFare).price4hrs40km}
                    onChange={(e) => handleChange('price4hrs40km', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price8hrs80km">8 Hours / 80 KM (₹)</Label>
                  <Input
                    id="price8hrs80km"
                    type="number"
                    value={(fare as LocalFare).price8hrs80km}
                    onChange={(e) => handleChange('price8hrs80km', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price10hrs100km">10 Hours / 100 KM (₹)</Label>
                  <Input
                    id="price10hrs100km"
                    type="number"
                    value={(fare as LocalFare).price10hrs100km}
                    onChange={(e) => handleChange('price10hrs100km', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceExtraKm">Extra KM (₹)</Label>
                  <Input
                    id="priceExtraKm"
                    type="number"
                    value={(fare as LocalFare).priceExtraKm}
                    onChange={(e) => handleChange('priceExtraKm', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceExtraHour">Extra Hour (₹)</Label>
                  <Input
                    id="priceExtraHour"
                    type="number"
                    value={(fare as LocalFare).priceExtraHour}
                    onChange={(e) => handleChange('priceExtraHour', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </>
          )}

          {fareType === 'airport' && fare && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceOneWay">One Way (₹)</Label>
                  <Input
                    id="priceOneWay"
                    type="number"
                    value={(fare as AirportFare).priceOneWay}
                    onChange={(e) => handleChange('priceOneWay', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceRoundTrip">Round Trip (₹)</Label>
                  <Input
                    id="priceRoundTrip"
                    type="number"
                    value={(fare as AirportFare).priceRoundTrip}
                    onChange={(e) => handleChange('priceRoundTrip', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nightCharges">Night Charges (₹)</Label>
                  <Input
                    id="nightCharges"
                    type="number"
                    value={(fare as AirportFare).nightCharges}
                    onChange={(e) => handleChange('nightCharges', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extraWaitingCharges">Extra Waiting Charges (₹/hr)</Label>
                  <Input
                    id="extraWaitingCharges"
                    type="number"
                    value={(fare as AirportFare).extraWaitingCharges}
                    onChange={(e) => handleChange('extraWaitingCharges', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Fare Details'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
