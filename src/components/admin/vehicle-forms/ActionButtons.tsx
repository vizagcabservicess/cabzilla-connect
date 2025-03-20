
import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface ActionButtonsProps {
  isLoading: boolean;
  selectedVehicle: string;
  onDelete: () => void;
  onUpdate: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isLoading,
  selectedVehicle,
  onDelete,
  onUpdate
}) => {
  return (
    <div className="flex justify-between mt-4">
      <Button 
        variant="destructive" 
        onClick={onDelete} 
        disabled={!selectedVehicle || isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Vehicle
          </>
        )}
      </Button>
      
      <Button 
        onClick={onUpdate} 
        disabled={!selectedVehicle || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          "Update Vehicle"
        )}
      </Button>
    </div>
  );
};
