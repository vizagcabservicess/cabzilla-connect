import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FleetVehicle } from '@/types/cab';
import { VehicleServiceInfo } from './VehicleServiceInfo';
import { Car, Edit } from 'lucide-react';

interface FleetVehicleCardProps {
  vehicle: FleetVehicle;
  onEdit: (vehicle: FleetVehicle) => void;
  onView: (vehicle: FleetVehicle) => void;
}

export function FleetVehicleCard({ vehicle, onEdit, onView }: FleetVehicleCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg flex items-center">
              <Car className="h-5 w-5 mr-2 text-gray-600" />
              {vehicle.vehicleNumber}
            </h3>
            <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
          </div>
          <Badge className={getStatusColor(vehicle.status)}>
            {vehicle.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Fuel Type</p>
              <p className="font-medium">{vehicle.fuelType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Capacity</p>
              <p className="font-medium">{vehicle.capacity || 'N/A'} passengers</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Vehicle Type</p>
              <p className="font-medium">{vehicle.vehicleType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Luggage</p>
              <p className="font-medium">{vehicle.luggageCapacity || 'N/A'} units</p>
            </div>
          </div>
          
          <VehicleServiceInfo 
            lastServiceDate={vehicle.lastService}
            nextServiceDue={vehicle.nextServiceDue}
            lastServiceOdometer={vehicle.lastServiceOdometer}
            nextServiceOdometer={vehicle.nextServiceOdometer}
            currentOdometer={vehicle.currentOdometer || undefined}
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onView(vehicle)}>View</Button>
          <Button onClick={() => onEdit(vehicle)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
