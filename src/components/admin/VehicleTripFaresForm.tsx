
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { directVehicleOperation } from '@/utils/apiHelper';
import { directApiPost } from '@/utils/directApiHelper';

interface VehicleTripFaresFormProps {
  vehicleId: string;
  tourId: string;
  initialPrice?: number;
  onSuccess?: () => void;
}

export function VehicleTripFaresForm({
  vehicleId,
  tourId,
  initialPrice = 0,
  onSuccess
}: VehicleTripFaresFormProps) {
  const [price, setPrice] = useState(initialPrice);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicleId || !tourId) {
      setError("Vehicle ID and Tour ID are required");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare the data
      const data = {
        vehicleId,
        tourId,
        price: Number(price)
      };
      
      console.log('Updating tour price with data:', data);

      // First try the direct API approach
      try {
        const response = await directApiPost('/api/admin/update-tour-price.php', data, {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          }
        });
        
        console.log('Tour price update response:', response);
        
        if (response && response.status === 'success') {
          toast.success('Tour price updated successfully');
          if (onSuccess) onSuccess();
          return;
        }
      } catch (directError) {
        console.error('Direct API failed:', directError);
      }
      
      // Fallback to the older method
      try {
        const response = await fetch('/api/admin/update-tour-price.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result && result.status === 'success') {
          toast.success('Tour price updated successfully');
          if (onSuccess) onSuccess();
          return;
        } else {
          throw new Error(result?.message || 'Unknown error');
        }
      } catch (fetchError: any) {
        throw new Error(`Fetch error: ${fetchError.message}`);
      }
    } catch (err: any) {
      console.error('Error updating tour price:', err);
      setError(err.message || 'Failed to update tour price');
      toast.error(`Error: ${err.message || 'Failed to update tour price'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update {tourId} Price for {vehicleId}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm bg-red-50 text-red-800 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="price">Price (₹)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min="0"
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Price
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
