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
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(availableVehicles || []);

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
      fetchVehicles();
      setSelectedBooking(booking);
    }
  }, [open, booking, form]);

  // Fetch available vehicles when dialog opens
  const fetchVehicles = async () => {
    try {
      const response = await fleetAPI.getVehicles(true);
      if (response && response.vehicles && Array.isArray(response.vehicles)) {
        setVehicles(response.vehicles);
        console.log("FleetVehicleAssignmentDialog: Fetched vehicles:", response.vehicles.length);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      // Keep the passed availableVehicles as fallback
    }
  };

  // Update selected booking when bookingId changes
  const handleBookingChange = (bookingId: string) => {
    const selected = availableBookings.find(b => b.id.toString() === bookingId);
    setSelectedBooking(selected);
    form.setValue("bookingId", bookingId);
  };

  // Fetch available drivers using fleetAPI
  const fetchDrivers = async () => {
    setIsLoadingDrivers(true);
    try {
      const drivers = await fleetAPI.getDrivers();
      console.log("Fetched drivers:", drivers);
      
      if (Array.isArray(drivers)) {
        // Transform driver data to expected format
        const formattedDrivers = drivers.map(driver => ({
          id: driver.id.toString(),
          name: driver.name || `Driver ${driver.id}`
        }));
        setAvailableDrivers(formattedDrivers);
      } else {
        throw new Error("Invalid drivers data format");
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load available drivers");
      
      // Provide fallback data
      setAvailableDrivers([
        { id: "driver-1", name: "John Driver (Default)" },
        { id: "driver-2", name: "Alice Driver (Default)" }
      ]);
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  // Format vehicle display for better readability
  const formatVehicleDisplay = (vehicle: FleetVehicle) => {
    return `${vehicle.vehicleNumber} - ${vehicle.make} ${vehicle.model} (${vehicle.year || ""})`;
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
        currentBooking.id.toString(),
        data.vehicleId,
        data.driverId
      );
      
      if (success) {
        toast.success(`Vehicle successfully assigned to booking #${currentBooking.bookingNumber || currentBooking.id}`);
        onAssignComplete();
      } else {
        // This shouldn't happen with our fallback mechanism, but just in case
        throw new Error("Assignment failed");
      }
    } catch (error) {
      console.error("Error assigning vehicle:", error);
      toast.error(`Failed to assign vehicle to booking #${currentBooking.bookingNumber || currentBooking.id}`);
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
                            #{booking.bookingNumber || booking.id} - {booking.passengerName} - {booking.cabType}
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
                    <span className="font-medium">Booking #:</span> {selectedBooking.bookingNumber || selectedBooking.id}
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
                      {vehicles.length > 0 ? (
                        vehicles.map(vehicle => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {formatVehicleDisplay(vehicle)}
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
                        <SelectValue placeholder={isLoadingDrivers ? "Loading drivers..." : "Select a driver"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingDrivers ? (
                        <SelectItem value="loading" disabled>Loading drivers...</SelectItem>
                      ) : (
                        availableDrivers.map(driver => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))
                      )}
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
