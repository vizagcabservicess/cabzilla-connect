
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FleetVehicle } from '@/types/cab';

interface ViewFleetVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  vehicle: FleetVehicle;
}

export function ViewFleetVehicleDialog({
  open,
  onClose,
  vehicle
}: ViewFleetVehicleDialogProps) {
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Vehicle Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Vehicle Number</p>
              <p className="font-medium">{vehicle.vehicleNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Make</p>
              <p>{vehicle.make}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Model</p>
              <p>{vehicle.model}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Year</p>
              <p>{vehicle.year}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p>{vehicle.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Last Service</p>
              <p>{vehicle.lastService}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Next Service Due</p>
              <p>{vehicle.nextServiceDue}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Fuel Type</p>
              <p>{vehicle.fuelType}</p>
            </div>
          </div>
        </div>
        
        {/* Add odometer readings section */}
        <div className="border-t border-gray-200 pt-4 mt-2">
          <h3 className="font-medium mb-2">Service Information</h3>
          <div className="grid grid-cols-2 gap-4">
            {vehicle.lastServiceOdometer && (
              <div>
                <p className="text-sm font-medium text-gray-500">Last Service Odometer</p>
                <p>{vehicle.lastServiceOdometer} km</p>
              </div>
            )}
            {vehicle.nextServiceOdometer && (
              <div>
                <p className="text-sm font-medium text-gray-500">Next Service Due At</p>
                <p>{vehicle.nextServiceOdometer} km</p>
              </div>
            )}
            {vehicle.currentOdometer && (
              <div>
                <p className="text-sm font-medium text-gray-500">Current Odometer</p>
                <p>{vehicle.currentOdometer} km</p>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">Vehicle Type</p>
          <p>{vehicle.vehicleType}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Capacity</p>
            <p>{vehicle.capacity} passengers</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Luggage Capacity</p>
            <p>{vehicle.luggageCapacity} pieces</p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
