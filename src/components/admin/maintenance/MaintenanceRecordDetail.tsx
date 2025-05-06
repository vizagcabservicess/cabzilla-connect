
import React from 'react';
import { MaintenanceRecord } from '@/types/maintenance';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from 'lucide-react';

interface MaintenanceRecordDetailProps {
  isOpen: boolean;
  onClose: () => void;
  record: MaintenanceRecord | null;
  onEdit: (record: MaintenanceRecord) => void;
  onDelete: (recordId: string | number) => void;
}

export function MaintenanceRecordDetail({ 
  isOpen, 
  onClose, 
  record, 
  onEdit, 
  onDelete 
}: MaintenanceRecordDetailProps) {
  if (!record) return null;
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  const getVehicleDisplayName = () => {
    if (!record) return 'N/A';
    const vehicleNumber = record.vehicleNumber || '';
    const make = record.make || record.vehicleMake || '';
    const model = record.model || record.vehicleModel || '';
    return `${vehicleNumber} ${make} ${model}`.trim() || record.vehicleId;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Maintenance Record Details</DialogTitle>
          <DialogDescription>
            Service details for {getVehicleDisplayName()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <p className="text-sm text-gray-500">Vehicle</p>
              <p className="font-medium">{getVehicleDisplayName()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service Type</p>
              <p className="font-medium">{record.serviceType}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <p className="text-sm text-gray-500">Service Date</p>
              <p className="font-medium">{formatDate(record.date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Service Date</p>
              <p className="font-medium">{formatDate(record.nextServiceDate)}</p>
            </div>
          </div>
          
          <div className="border-b pb-4">
            <p className="text-sm text-gray-500">Description</p>
            <p className="font-medium">{record.description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <p className="text-sm text-gray-500">Cost</p>
              <p className="font-medium text-xl">₹{record.cost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service Center/Vendor</p>
              <p className="font-medium">{record.vendor}</p>
            </div>
          </div>
          
          {record.notes && (
            <div className="border-b pb-4">
              <p className="text-sm text-gray-500">Additional Notes</p>
              <p className="text-sm">{record.notes}</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onEdit(record)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1"
            onClick={() => {
              if (record && record.id) {
                onDelete(record.id);
              }
            }}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
