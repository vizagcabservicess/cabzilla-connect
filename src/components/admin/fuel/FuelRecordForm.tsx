import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { FuelPrice, FuelRecord, FleetVehicle } from '@/types/cab';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { Fuel } from 'lucide-react';

interface FuelRecordFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Partial<FuelRecord>) => Promise<void>;
  editingRecord?: FuelRecord | null;
}

const BANK_OPTIONS = [
  'HDFC Bank',
  'ICICI Bank',
  'SBI',
  'Axis Bank',
  'Kotak Bank',
  'Yes Bank',
  'IndusInd Bank',
  'IDFC First Bank',
  'Federal Bank',
  'Other'
];

export function FuelRecordForm({ isOpen, onClose, onSave, editingRecord }: FuelRecordFormProps) {
  // Form state
  const [vehicleId, setVehicleId] = useState<string>('');
  const [fillDate, setFillDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [quantity, setQuantity] = useState<string>('');
  const [pricePerUnit, setPricePerUnit] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [odometer, setOdometer] = useState<string>('');
  const [fuelStation, setFuelStation] = useState<string>('');
  const [fuelType, setFuelType] = useState<'Petrol' | 'Diesel' | 'CNG' | 'Electric'>('Petrol');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Company' | 'Customer'>('Cash');
  const [bankName, setBankName] = useState<string>('');
  const [lastFourDigits, setLastFourDigits] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Data state
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previousOdometer, setPreviousOdometer] = useState<number | null>(null);
  const [mileage, setMileage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVehicles();
      fetchFuelPrices();
      
      if (editingRecord) {
        // Populate form with editing record data
        setVehicleId(editingRecord.vehicleId);
        setFillDate(editingRecord.fillDate ? format(new Date(editingRecord.fillDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setQuantity(editingRecord.quantity?.toString() || '');
        setPricePerUnit(editingRecord.pricePerUnit?.toString() || '');
        setTotalCost(editingRecord.totalCost?.toString() || '');
        setOdometer(editingRecord.odometer?.toString() || '');
        setFuelStation(editingRecord.fuelStation || '');
        // Cast the string to the specific type to avoid TypeScript errors
        setFuelType(editingRecord.fuelType as 'Petrol' | 'Diesel' | 'CNG' | 'Electric');
        setPaymentMethod(editingRecord.paymentMethod as 'Cash' | 'Card' | 'Company' | 'Customer');
        if (editingRecord.paymentDetails) {
          setBankName(editingRecord.paymentDetails.bankName || '');
          setLastFourDigits(editingRecord.paymentDetails.lastFourDigits || '');
        }
        setNotes(editingRecord.notes || '');
        setMileage(editingRecord.mileage?.toString() || null);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingRecord]);

  // Update total cost when quantity or price changes
  useEffect(() => {
    if (quantity && pricePerUnit) {
      const total = parseFloat(quantity) * parseFloat(pricePerUnit);
      if (!isNaN(total)) {
        setTotalCost(total.toFixed(2));
      }
    }
  }, [quantity, pricePerUnit]);

  // Update price per unit when fuel type changes
  useEffect(() => {
    const selectedPrice = fuelPrices.find(p => p.fuelType === fuelType);
    if (selectedPrice) {
      setPricePerUnit((selectedPrice.price || selectedPrice.pricePerLiter).toString());
    }
  }, [fuelType, fuelPrices]);

  const fetchVehicles = async () => {
    try {
      // In a real app, this would be an API call to fetch vehicles
      const response = await fetch('/api/admin/fleet_vehicles.php/vehicles')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch vehicles');
          return res.json();
        })
        .catch(err => {
          console.error("Error fetching vehicles:", err);
          // If API fails, use sample data
          return {
            vehicles: [
              { id: 'VEH-001', vehicleNumber: 'AP31AA1234', name: 'Swift', model: 'Dzire', make: 'Suzuki', year: 2022 },
              { id: 'VEH-002', vehicleNumber: 'AP31BB5678', name: 'Innova', model: 'Crysta', make: 'Toyota', year: 2023 },
              { id: 'VEH-003', vehicleNumber: 'AP31CC9012', name: 'Alto', model: 'K10', make: 'Suzuki', year: 2021 }
            ]
          };
        });
      
      if (response.vehicles) {
        setVehicles(response.vehicles);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error('Failed to load vehicles');
    }
  };

  const fetchFuelPrices = async () => {
    try {
      // In a real app, this would be an API call to fetch fuel prices
      const response = await fetch('/api/admin/fuel_prices.php')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch fuel prices');
          return res.json();
        })
        .catch(err => {
          console.error("Error fetching fuel prices:", err);
          // If API fails, use sample data
          return {
            status: 'success',
            data: {
              fuelPrices: [
                { id: '1', fuelType: 'Petrol', price: 102.50, effectiveDate: '2025-05-01', location: 'Visakhapatnam', createdAt: '2025-05-01', updatedAt: '2025-05-01' },
                { id: '2', fuelType: 'Diesel', price: 88.75, effectiveDate: '2025-05-01', location: 'Visakhapatnam', createdAt: '2025-05-01', updatedAt: '2025-05-01' },
                { id: '3', fuelType: 'CNG', price: 65.30, effectiveDate: '2025-05-01', location: 'Visakhapatnam', createdAt: '2025-05-01', updatedAt: '2025-05-01' }
              ]
            }
          };
        });
      
      if (response.status === 'success' && response.data?.fuelPrices) {
        setFuelPrices(response.data.fuelPrices);
      }
    } catch (error) {
      console.error("Error fetching fuel prices:", error);
      toast.error('Failed to load fuel prices');
    }
  };

  // Fetch previous odometer reading when vehicle is selected
  useEffect(() => {
    if (vehicleId) {
      fetchPreviousOdometer(vehicleId);
    }
  }, [vehicleId]);

  const fetchPreviousOdometer = async (vehicleId: string) => {
    try {
      // In a real app, this would be an API call to fetch the last fuel record for this vehicle
      // For now, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 300));
      const mockPrevOdometer = Math.floor(Math.random() * 10000) + 10000; // Random value between 10000-20000
      setPreviousOdometer(mockPrevOdometer);
    } catch (error) {
      console.error("Error fetching previous odometer:", error);
      setPreviousOdometer(null);
    }
  };

  // Calculate mileage when odometer is updated
  useEffect(() => {
    if (previousOdometer && odometer && quantity && vehicleId) {
      const currentOdometerValue = parseFloat(odometer);
      if (currentOdometerValue > previousOdometer) {
        const distance = currentOdometerValue - previousOdometer;
        const quantityValue = parseFloat(quantity);
        if (quantityValue > 0) {
          const calculatedMileage = distance / quantityValue;
          setMileage(calculatedMileage.toFixed(2));
        }
      }
    }
  }, [odometer, previousOdometer, quantity, vehicleId]);

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      
      const fuelRecord: Partial<FuelRecord> = {
        vehicleId,
        fillDate,
        quantity: parseFloat(quantity),
        pricePerUnit: parseFloat(pricePerUnit),
        totalCost: parseFloat(totalCost),
        odometer: parseInt(odometer),
        fuelStation,
        fuelType,
        paymentMethod,
        notes: notes.trim() || undefined,
      };

      // Add mileage if calculated
      if (mileage) {
        fuelRecord.mileage = parseFloat(mileage);
      }

      // Add payment details if using card
      if (paymentMethod === 'Card' && bankName) {
        fuelRecord.paymentDetails = {
          bankName,
          lastFourDigits: lastFourDigits.substring(0, 4)
        };
      }

      // If editing, include the ID
      if (editingRecord) {
        fuelRecord.id = editingRecord.id;
      }

      await onSave(fuelRecord);
      onClose();
    } catch (error) {
      console.error("Error saving fuel record:", error);
      toast.error('Failed to save fuel record');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!vehicleId) {
      toast.error('Please select a vehicle');
      return false;
    }
    
    if (!fillDate) {
      toast.error('Please select a date');
      return false;
    }
    
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return false;
    }
    
    if (!pricePerUnit || parseFloat(pricePerUnit) <= 0) {
      toast.error('Please enter a valid price per unit');
      return false;
    }
    
    if (!odometer) {
      toast.error('Please enter the odometer reading');
      return false;
    }
    
    if (paymentMethod === 'Card' && (!bankName || !lastFourDigits)) {
      toast.error('Please enter bank name and last 4 digits for card payment');
      return false;
    }
    
    if (paymentMethod === 'Card' && lastFourDigits.length !== 4) {
      toast.error('Last 4 digits should be exactly 4 numbers');
      return false;
    }
    
    return true;
  };

  const resetForm = () => {
    setVehicleId('');
    setFillDate(format(new Date(), 'yyyy-MM-dd'));
    setQuantity('');
    setPricePerUnit('');
    setTotalCost('');
    setOdometer('');
    setFuelStation('');
    setFuelType('Petrol');
    setPaymentMethod('Cash');
    setBankName('');
    setLastFourDigits('');
    setNotes('');
    setMileage(null);
    setPreviousOdometer(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Fuel className="mr-2 h-5 w-5" />
            {editingRecord ? 'Edit Fuel Record' : 'Add Fuel Record'}
          </DialogTitle>
          <DialogDescription>
            {editingRecord 
              ? 'Update the details of this fuel record.' 
              : 'Enter details about the fuel refill.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="vehicleId">Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleNumber} - {vehicle.name} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {previousOdometer && (
              <p className="text-xs text-gray-500">Last odometer reading: {previousOdometer}</p>
            )}
          </div>

          <div className="grid w-full items-center gap-2">
            <Label htmlFor="fillDate">Fill Date</Label>
            <Input
              id="fillDate"
              type="date"
              value={fillDate}
              onChange={(e) => setFillDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <div className="grid w-full items-center gap-2">
            <Label htmlFor="fuelType">Fuel Type</Label>
            <Select 
              value={fuelType} 
              onValueChange={(value: 'Petrol' | 'Diesel' | 'CNG' | 'Electric') => setFuelType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Petrol">Petrol</SelectItem>
                <SelectItem value="Diesel">Diesel</SelectItem>
                <SelectItem value="CNG">CNG</SelectItem>
                <SelectItem value="Electric">Electric</SelectItem>
              </SelectContent>
            </Select>
            {fuelPrices.find(p => p.fuelType === fuelType) && (
              <p className="text-xs text-gray-500">
                Current price: ₹{fuelPrices.find(p => p.fuelType === fuelType)?.price.toFixed(2)}/unit
              </p>
            )}
          </div>

          <div className="grid w-full items-center gap-2">
            <Label htmlFor="quantity">Quantity (Liters/Kg)</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 45.5"
            />
          </div>

          <div className="grid w-full items-center gap-2">
            <Label htmlFor="pricePerUnit">Price per Unit (₹)</Label>
            <Input
              id="pricePerUnit"
              type="number"
              step="0.01"
              min="0"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              placeholder="e.g., 102.50"
            />
          </div>

          <div className="grid w-full items-center gap-2">
            <Label htmlFor="totalCost">Total Cost (₹)</Label>
            <Input
              id="totalCost"
              type="number"
              step="0.01"
              min="0"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              placeholder="e.g., 4612.50"
            />
          </div>

          <div className="grid w-full items-center gap-2">
            <Label htmlFor="odometer">Odometer Reading (km)</Label>
            <Input
              id="odometer"
              type="number"
              min="0"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="e.g., 15420"
            />
            {mileage && (
              <p className="text-xs text-green-600">Estimated mileage: {mileage} km/L</p>
            )}
          </div>

          <div className="grid w-full items-center gap-2">
            <Label htmlFor="fuelStation">Fuel Station</Label>
            <Input
              id="fuelStation"
              value={fuelStation}
              onChange={(e) => setFuelStation(e.target.value)}
              placeholder="e.g., HPCL, Gajuwaka"
            />
          </div>

          <div className="grid w-full items-center gap-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select 
              value={paymentMethod} 
              onValueChange={(value: 'Cash' | 'Card' | 'Company' | 'Customer') => setPaymentMethod(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Company">Company Account</SelectItem>
                <SelectItem value="Customer">Customer Account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'Card' && (
            <>
              <div className="grid w-full items-center gap-2">
                <Label htmlFor="bankName">Bank</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_OPTIONS.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid w-full items-center gap-2">
                <Label htmlFor="lastFourDigits">Last 4 Digits</Label>
                <Input
                  id="lastFourDigits"
                  value={lastFourDigits}
                  onChange={(e) => setLastFourDigits(e.target.value.replace(/[^0-9]/g, '').substring(0, 4))}
                  placeholder="e.g., 1234"
                  maxLength={4}
                />
              </div>
            </>
          )}

          <div className="col-span-1 md:col-span-2 grid w-full items-center gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : editingRecord ? 'Update' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
