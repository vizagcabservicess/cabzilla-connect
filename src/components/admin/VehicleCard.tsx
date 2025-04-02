
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Users, Briefcase, Check, X } from "lucide-react";
import { CabType } from "@/types/cab";
import { deleteVehicle } from "@/services/directVehicleService";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VehicleCardProps {
  vehicle: CabType;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

export function VehicleCard({ vehicle, onEdit, onDelete }: VehicleCardProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Ensure capacity and luggageCapacity are always parsed as numbers
  const capacity = typeof vehicle.capacity === 'string' 
    ? parseInt(vehicle.capacity, 10) 
    : Number(vehicle.capacity || 4);
  
  const luggageCapacity = typeof vehicle.luggageCapacity === 'string' 
    ? parseInt(vehicle.luggageCapacity, 10) 
    : Number(vehicle.luggageCapacity || 2);
  
  // Clean up and display amenities with proper type checking
  let amenities: string[] = ['AC'];
  
  if (Array.isArray(vehicle.amenities)) {
    // If amenities is already an array, use it directly
    amenities = vehicle.amenities.filter(Boolean);
  } else if (typeof vehicle.amenities === 'string' && vehicle.amenities) {
    // If amenities is a string, split it only if it's not empty
    const amenitiesString = vehicle.amenities;
    if (amenitiesString && amenitiesString.trim && amenitiesString.trim() !== '') {
      amenities = amenitiesString.split(',').map(a => a.trim()).filter(Boolean);
    }
  } else {
    // If amenities is undefined, null, or some other type, keep the default ['AC']
    console.log('Unexpected amenities format:', vehicle.amenities);
  }
  
  // Ensure all price values are presented as numbers
  const basePrice = typeof vehicle.price === 'string' 
    ? parseFloat(vehicle.price) 
    : Number(vehicle.price || vehicle.basePrice || 0);
    
  const pricePerKm = typeof vehicle.pricePerKm === 'string' 
    ? parseFloat(vehicle.pricePerKm) 
    : Number(vehicle.pricePerKm || 0);
  
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteVehicle(vehicle.id || '');
      toast.success(`Vehicle ${vehicle.name} deleted`);
      onDelete(vehicle.id || '');
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast.error(`Failed to delete vehicle: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };
  
  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative pt-4">
            {!vehicle.isActive && (
              <div className="absolute top-2 right-2">
                <Badge variant="destructive">Inactive</Badge>
              </div>
            )}
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{vehicle.name}</h3>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded">ID: {vehicle.id}</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-4 w-4" />
                  <span>{capacity} seats</span>
                </div>
                
                <div className="flex items-center gap-1 text-sm">
                  <Briefcase className="h-4 w-4" />
                  <span>{luggageCapacity} luggage</span>
                </div>
                
                {vehicle.ac !== false ? (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    <span>AC</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <X className="h-4 w-4" />
                    <span>Non-AC</span>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700">Base Price: ₹{basePrice.toFixed(0)}</p>
                <p className="text-sm text-gray-700">Per KM: ₹{pricePerKm.toFixed(0)}</p>
              </div>
              
              {vehicle.description && (
                <p className="text-sm text-gray-600 mb-4">{vehicle.description}</p>
              )}
              
              {amenities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {amenities.map((amenity, index) => (
                    <Badge key={index} variant="outline" className="text-xs">{amenity}</Badge>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the vehicle "{vehicle.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
