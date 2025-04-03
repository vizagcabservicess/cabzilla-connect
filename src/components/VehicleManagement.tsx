
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FareManagement } from './FareManagement';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';

interface VehicleManagementProps {
  vehicleId: string;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicleId }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [isFixing, setIsFixing] = React.useState(false);
  
  // Check if vehicle exists
  React.useEffect(() => {
    const checkVehicle = async () => {
      try {
        await directVehicleOperation(`api/admin/check-vehicle.php?id=${vehicleId}`, 'GET');
      } catch (err) {
        setError(`Could not verify vehicle with ID: ${vehicleId}. Some features might not work correctly.`);
      }
    };
    
    if (vehicleId) {
      checkVehicle();
    }
  }, [vehicleId]);
  
  const handleFixDatabase = async () => {
    setIsFixing(true);
    try {
      const result = await directVehicleOperation('api/admin/fix-database.php', 'GET');
      if (result.status === 'success') {
        toast.success('Database fixed successfully');
        setError(null);
      } else {
        toast.error('Failed to fix database');
      }
    } catch (err) {
      console.error('Error fixing database:', err);
      toast.error('Failed to fix database');
    } finally {
      setIsFixing(false);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleFixDatabase}
              disabled={isFixing}
            >
              {isFixing ? 'Fixing...' : 'Fix Database'}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {!vehicleId && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Info className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-medium">No Vehicle Selected</h3>
                <p className="text-muted-foreground mt-1">
                  Please select a vehicle to manage its fare settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {vehicleId && (
        <Tabs defaultValue="local" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">Local Fares</TabsTrigger>
            <TabsTrigger value="airport">Airport Fares</TabsTrigger>
          </TabsList>
          <TabsContent value="local">
            <FareManagement vehicleId={vehicleId} fareType="local" />
          </TabsContent>
          <TabsContent value="airport">
            <FareManagement vehicleId={vehicleId} fareType="airport" />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
