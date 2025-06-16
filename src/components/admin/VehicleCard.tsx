import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Eye, EyeOff, MoreHorizontal } from "lucide-react";
import { CabType } from "@/types/cab";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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
import { deleteVehicle } from "@/services/directVehicleService";
import { Badge } from "@/components/ui/badge";
import { FareUpdateError } from "@/components/cab-options/FareUpdateError";

interface VehicleCardProps {
  vehicle: CabType;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

export function VehicleCard({ vehicle, onEdit, onDelete }: VehicleCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const formatAmenities = (amenities: string[] | string): string => {
    if (typeof amenities === 'string') {
      return amenities;
    }
    return amenities?.slice(0, 3)?.join(', ') || '';
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      if (!vehicle.id && !vehicle.vehicleId) {
        throw new Error("Cannot delete vehicle: Missing vehicle ID");
      }

      const vehicleId = String(vehicle.id || vehicle.vehicleId || '');
      console.log(`Deleting vehicle ID: ${vehicleId}`);

      // Try multiple times with increasing delays
      let isSuccess = false;
      let maxAttempts = 3;
      
      for (let attempt = 0; attempt < maxAttempts && !isSuccess; attempt++) {
        try {
          // Add some delay between attempts (except for first attempt)
          if (attempt > 0) {
            const delay = 1000 * attempt;
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log(`Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms delay...`);
          }
          
          const result = await deleteVehicle(vehicleId);
          if (result && result.status === 'success') {
            isSuccess = true;
          }
        } catch (err) {
          console.error(`Delete attempt ${attempt + 1} failed:`, err);
          // Continue to next attempt or throw on final attempt
          if (attempt === maxAttempts - 1) {
            throw err;
          }
        }
      }
      
      if (isSuccess) {
        toast.success(`Vehicle "${vehicle.name}" deleted successfully`);
        onDelete(vehicleId);
      } else {
        // This should not happen if all attempts failed, as an error would be thrown
        toast.error(`Failed to delete vehicle: Unknown error`);
      }
    } catch (err: any) {
      console.error("Error deleting vehicle:", err);
      setError(err);
      toast.error(`Failed to delete vehicle: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const resetError = () => setError(null);

  const { name, capacity, image } = vehicle;

  if (error) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <FareUpdateError
            error={error}
            onRetry={() => {
              resetError();
              handleDelete();
            }}
            title="Delete Error"
            description={`Failed to delete vehicle "${name}".`}
            isAdmin={true}
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" variant="outline" onClick={resetError}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
              <span>{capacity} Seats</span>
              <span className="mx-1">•</span>
              <span>{vehicle.luggageCapacity} Luggage</span>
            </div>
            <p className="text-sm mt-2 text-gray-600 line-clamp-2">
              {formatAmenities(vehicle.amenities || [])}
            </p>
            {vehicle.inclusions && (
              <p className="text-xs mt-1 text-gray-500"><span className="font-medium">Inclusions:</span> {Array.isArray(vehicle.inclusions) ? vehicle.inclusions.join(', ') : vehicle.inclusions}</p>
            )}
            {vehicle.exclusions && (
              <p className="text-xs mt-1 text-gray-500"><span className="font-medium">Exclusions:</span> {Array.isArray(vehicle.exclusions) ? vehicle.exclusions.join(', ') : vehicle.exclusions}</p>
            )}
            {vehicle.cancellationPolicy && (
              <p className="text-xs mt-1 text-gray-500"><span className="font-medium">Cancellation Policy:</span> {vehicle.cancellationPolicy}</p>
            )}
            {vehicle.fuelType && (
              <p className="text-xs mt-1 text-gray-500"><span className="font-medium">Fuel Type:</span> {vehicle.fuelType}</p>
            )}
          </div>
          
          <div className="flex gap-2 items-start">
            {!vehicle.isActive && (
              <Badge variant="outline" className="bg-gray-100">Inactive</Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {vehicle.isActive ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" /> Deactivate
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" /> Activate
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div>
            <span className="text-lg font-bold">₹{vehicle.basePrice || vehicle.price || 0}</span>
            <span className="text-sm text-gray-500 ml-1">base price</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
          </div>
        </div>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
