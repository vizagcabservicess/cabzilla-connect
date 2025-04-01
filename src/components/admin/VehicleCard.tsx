
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Users, Briefcase, Car, Clock, Info } from "lucide-react";
import { CabType } from "@/types/cab";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteVehicle } from "@/services/directVehicleService";
import { toast } from "sonner";

interface VehicleCardProps {
  vehicle: CabType;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

export function VehicleCard({ vehicle, onEdit, onDelete }: VehicleCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Make sure we use the most reliable ID form for this vehicle
  const vehicleId = vehicle.id || vehicle.vehicleId || '';
  
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      console.log(`Deleting vehicle with ID: ${vehicleId}`);
      
      if (!vehicleId) {
        throw new Error("Vehicle ID is missing");
      }
      
      await deleteVehicle(vehicleId);
      toast.success(`Vehicle ${vehicle.name} deleted successfully`);
      onDelete(vehicleId);
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error(`Failed to delete vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className={`overflow-hidden ${!vehicle.isActive ? 'border-dashed border-gray-300 bg-gray-50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg leading-tight">{vehicle.name}</CardTitle>
          <div className="flex items-center space-x-1">
            {!vehicle.isActive && (
              <Badge variant="outline" className="text-gray-500 border-gray-300">
                Inactive
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{vehicle.capacity} seats</span>
          </div>
          <div className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            <span>{vehicle.luggageCapacity} luggage</span>
          </div>
          <div className="flex items-center gap-1 truncate">
            <Car className="h-4 w-4 flex-shrink-0" />
            <span>ID: {vehicleId}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>₹{vehicle.pricePerKm || 0}/km</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mb-3 line-clamp-2">
          {vehicle.description || 'No description available'}
        </div>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {Array.isArray(vehicle.amenities) ? (
            vehicle.amenities.map((amenity, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {amenity}
              </Badge>
            ))
          ) : vehicle.amenities ? (
            <Badge variant="secondary" className="text-xs">
              {String(vehicle.amenities)}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">AC</Badge>
          )}
        </div>
        
        <div className="flex justify-between mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex gap-1 items-center"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
          
          <TooltipProvider>
            <AlertDialog>
              <Tooltip>
                <AlertDialogTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 flex gap-1 items-center"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </TooltipTrigger>
                </AlertDialogTrigger>
                <TooltipContent>
                  <p>Delete this vehicle</p>
                </TooltipContent>
              </Tooltip>
              
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the {vehicle.name} (ID: {vehicleId}). This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete();
                    }} 
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
