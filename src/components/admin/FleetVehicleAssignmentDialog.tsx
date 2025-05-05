
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fleetAPI } from '@/services/api/fleetAPI';
import { FleetVehicle } from '@/types/cab';
import { Booking } from '@/types/api';

interface FleetVehicleAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  booking?: Booking;
  availableVehicles: FleetVehicle[];
  onAssignComplete: () => void;
  availableBookings?: Booking[];
}

interface AssignmentFormData {
  vehicleId: string;
  driverId?: string;
  bookingId?: string;
}

export function FleetVehicleAssignmentDialog({
  open,
  onClose,
  booking,
  availableVehicles,
  onAssignComplete,
  availableBookings = []
}: FleetVehicleAssignmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<{id: string, name: string}[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>(booking);

  const form = useForm<AssignmentFormData>({
    defaultValues: {
      vehicleId: "",
      driverId: "",
      bookingId: booking?.id.toString() || ""
    }
  });

  // Reset form when dialog opens or booking changes
  useEffect(() => {
    if (open) {
      form.reset({ 
        vehicleId: "", 
        driverId: "", 
        bookingId: booking?.id.toString() || "" 
      });
      fetchDrivers();
      setSelectedBooking(booking);
    }
  }, [open, booking, form]);

  // Update selected booking when bookingId changes
  const handleBookingChange = (bookingId: string) => {
    const selected = availableBookings.find(b => b.id.toString() === bookingId);
    setSelectedBooking(selected);
    form.setValue("bookingId", bookingId);
  };

  // Fetch available drivers
  const fetchDrivers = async () => {
    try {
      // This is a placeholder. In a real implementation, you would fetch drivers from your API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/admin/drivers`);
      if (response.ok) {
        const data = await response.json();
        setAvailableDrivers(data.drivers || []);
      } else {
        throw new Error("Failed to fetch drivers");
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load available drivers");
      
      // Provide fallback data
      setAvailableDrivers([
        { id: "driver-1", name: "John Driver (Default)" },
        { id: "driver-2", name: "Alice Driver (Default)" }
      ]);
    }
  };

  // Handle assignment submission
  const handleSubmit = async (data: AssignmentFormData) => {
    const currentBooking = selectedBooking || (data.bookingId ? availableBookings.find(b => b.id.toString() === data.bookingId) : null);
    
    if (!currentBooking) {
      toast.error("No booking selected for assignment");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Call the API to assign vehicle to booking
      const success = await fleetAPI.assignVehicleToBooking(
        data.vehicleId,
        currentBooking.id.toString(),
        data.driverId
      );
      
      if (success) {
        toast.success(`Vehicle successfully assigned to booking #${currentBooking.bookingNumber}`);
        onAssignComplete();
      } else {
        // This shouldn't happen with our fallback mechanism, but just in case
        throw new Error("Assignment failed");
      }
    } catch (error) {
      console.error("Error assigning vehicle:", error);
      toast.error(`Failed to assign vehicle to booking #${currentBooking.bookingNumber}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Vehicle to Booking</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!booking && availableBookings.length > 0 && (
              <FormField
                control={form.control}
                name="bookingId"
                rules={{ required: "Booking selection is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Booking</FormLabel>
                    <Select 
                      onValueChange={(value) => handleBookingChange(value)} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a booking" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableBookings.map(booking => (
                          <SelectItem key={booking.id} value={booking.id.toString()}>
                            #{booking.bookingNumber} - {booking.passengerName} - {booking.cabType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedBooking ? (
              <div className="bg-muted/50 p-3 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Booking #:</span> {selectedBooking.bookingNumber}
                  </div>
                  <div>
                    <span className="font-medium">Customer:</span> {selectedBooking.passengerName}
                  </div>
                  <div>
                    <span className="font-medium">Pickup:</span> {new Date(selectedBooking.pickupDate).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Vehicle Type:</span> {selectedBooking.cabType}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No booking selected
              </div>
            )}

            <FormField
              control={form.control}
              name="vehicleId"
              rules={{ required: "Vehicle selection is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Vehicle</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableVehicles.length > 0 ? (
                        availableVehicles.map(vehicle => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No vehicles available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Driver (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableDrivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting || (!selectedBooking && !form.watch("bookingId"))}
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                    Assigning...
                  </>
                ) : "Assign Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
