import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SearchAlert } from '@/services/api/searchAlertsAPI';
import {
  aiBookingAPI,
  AI_PAYMENT_MODES,
  AI_VEHICLE_TYPES,
  mapSearchAlertTripType,
  normalizeGuestPhone,
  parseSearchAlertDeparture,
  type ParsedBooking,
  validateBookingClient,
} from '@/services/api/aiBookingAPI';

type ConvertToBookingModalProps = {
  alert: SearchAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (invoiceNo: number) => void;
};

export function ConvertToBookingModal({
  alert,
  open,
  onOpenChange,
  onCreated,
}: ConvertToBookingModalProps) {
  const [customerMobile, setCustomerMobile] = useState('');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [tripType, setTripType] = useState('One Way');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [cost, setCost] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!alert || !open) return;
    const { date, time } = parseSearchAlertDeparture(alert.departure);
    setCustomerMobile(normalizeGuestPhone(alert.guestPhone));
    setPickup(alert.pickup);
    setDrop(alert.drop);
    setTripType(mapSearchAlertTripType(alert.tripType));
    setPickupDate(date);
    setPickupTime(time);
    setVehicleType('');
    setCost('');
    setCustomerName('');
    setPaymentMode('Cash');
  }, [alert, open]);

  const handleCreate = async () => {
    const booking: Partial<ParsedBooking> = {
      customer_name: customerName.trim(),
      customer_mobile: customerMobile.replace(/\D/g, '').slice(-10),
      pickup_location: pickup.trim(),
      drop_location: drop.trim(),
      trip_type: tripType,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      vehicle_type: vehicleType,
      cost: parseInt(cost, 10) || 0,
      advance_received: 0,
      payment_mode: paymentMode,
      manager_name: '',
      manager_mobile: '',
      driver_name: '',
      seating_capacity: 0,
    };

    const errors = validateBookingClient(booking);
    if (errors.length > 0) {
      toast.error(errors.join(', '));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await aiBookingAPI.createBooking(booking as ParsedBooking);
      toast.success(res.message || `Invoice #${res.invoice_no} created`);
      onCreated?.(res.invoice_no ?? 0);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert to Booking</DialogTitle>
          <DialogDescription>
            Pre-filled from search alert — complete the required fields below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="cvt-mobile">Customer Mobile</Label>
            <Input
              id="cvt-mobile"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cvt-pickup">Pickup</Label>
            <Input id="cvt-pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cvt-drop">Drop</Label>
            <Input id="cvt-drop" value={drop} onChange={(e) => setDrop(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cvt-trip">Trip Type</Label>
            <Input id="cvt-trip" value={tripType} onChange={(e) => setTripType(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cvt-date">Pickup Date</Label>
              <Input
                id="cvt-date"
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cvt-time">Pickup Time</Label>
              <Input
                id="cvt-time"
                value={pickupTime}
                placeholder="e.g. 3:15 pm"
                onChange={(e) => setPickupTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Vehicle Type</Label>
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {AI_VEHICLE_TYPES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cvt-cost">Cost (₹)</Label>
            <Input
              id="cvt-cost"
              type="number"
              min={1}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cvt-name">Customer Name</Label>
            <Input
              id="cvt-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Payment Mode</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreate()} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
