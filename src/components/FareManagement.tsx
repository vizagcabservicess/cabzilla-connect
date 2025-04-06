
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { AirportFareForm } from './AirportFareForm';
import { LocalFareForm } from './LocalFareForm';
import { toast } from 'sonner';

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'airport' | 'outstation';
}

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!vehicleId) {
      setError("No vehicle selected. Please select a vehicle to manage its fares.");
      return;
    }

    // Clear any existing errors when vehicleId changes
    setError(null);
  }, [vehicleId]);

  const handleFareUpdated = () => {
    // Increment the refresh counter to trigger any other components that need refresh
    setRefreshCount(prev => prev + 1);
    
    // Clear any existing errors
    setError(null);
    
    // Dispatch a fare update event for other components to listen to
    try {
      const event = new CustomEvent('fare-data-updated', { 
        detail: { vehicleId, fareType, timestamp: Date.now() }
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error dispatching fare update event:', err);
    }
    
    toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fare updated successfully`);
  };

  return (
    <div className="w-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!vehicleId ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please select a vehicle to manage its fares.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {fareType === 'airport' && (
            <AirportFareForm 
              vehicleId={vehicleId} 
              onFareUpdated={handleFareUpdated} 
              key={`airport-${vehicleId}-${refreshCount}`}
            />
          )}

          {fareType === 'local' && (
            <LocalFareForm
              vehicleId={vehicleId}
              onFareUpdated={handleFareUpdated}
              key={`local-${vehicleId}-${refreshCount}`}
            />
          )}

          {fareType === 'outstation' && (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Outstation fare management will be implemented soon.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
