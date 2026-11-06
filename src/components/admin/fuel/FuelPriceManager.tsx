
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { FuelPrice } from '@/types/cab';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';

interface FuelPriceManagerProps {
  onPriceUpdate?: () => void;
}

export function FuelPriceManager({ onPriceUpdate }: FuelPriceManagerProps) {
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<FuelPrice | null>(null);
  
  // Form state
  const [fuelType, setFuelType] = useState<'Petrol' | 'Diesel' | 'CNG'>('Petrol');
  const [price, setPrice] = useState<string>('');
  const [location, setLocation] = useState<string>('Visakhapatnam');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchFuelPrices();
  }, []);

  const fetchFuelPrices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/fuel_prices.php');
      if (!response.ok) throw new Error('Failed to fetch fuel prices');
      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.data?.fuelPrices)) {
        setFuelPrices(data.data.fuelPrices);
      } else {
        throw new Error(data.message || 'Failed to fetch fuel prices');
      }
    } catch (error) {
      console.error("Error fetching fuel prices:", error);
      toast.error('Could not load fuel prices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/fuel_prices.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPrice?.id,
          fuelType,
          price: parseFloat(price),
          location: location.trim() || 'Visakhapatnam',
          effectiveDate: format(new Date(), 'yyyy-MM-dd'),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to update fuel price');
      }

      toast.success(`${fuelType} price updated successfully`);
      setIsDialogOpen(false);
      resetForm();
      await fetchFuelPrices();
      onPriceUpdate?.();
    } catch (error) {
      console.error("Error updating fuel price:", error);
      toast.error(error instanceof Error ? error.message : 'Failed to update fuel price');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPrice = (price: FuelPrice) => {
    setEditingPrice(price);
    setFuelType(price.fuelType);
    setPrice(price.price.toString());
    setLocation(price.location || 'Visakhapatnam');
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPrice(null);
    setFuelType('Petrol');
    setPrice('');
    setLocation('Visakhapatnam');
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Current prices</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            Update prices
          </Button>
        </div>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading prices…</p>
        ) : (
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border">
            {fuelPrices.map((price) => (
              <button
                key={price.id}
                type="button"
                className="bg-card px-2 py-1.5 text-left hover:bg-muted"
                onClick={() => handleEditPrice(price)}
              >
                <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{price.fuelType}</div>
                <div className="text-sm font-semibold tabular-nums">₹{price.price.toFixed(2)}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {formatDate(price.updatedAt)}{price.location ? ` · ${price.location}` : ''}
                </div>
              </button>
            ))}
            {fuelPrices.length === 0 ? (
              <p className="col-span-3 bg-card px-2 py-3 text-xs text-muted-foreground">No fuel prices yet. Use Update prices to add them.</p>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrice ? 'Edit Fuel Price' : 'Update Fuel Price'}</DialogTitle>
            <DialogDescription>
              Enter the current price for the selected fuel type.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid w-full items-center gap-2">
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Select 
                value={fuelType} 
                onValueChange={(value: 'Petrol' | 'Diesel' | 'CNG') => setFuelType(value)}
                disabled={!!editingPrice}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="CNG">CNG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full items-center gap-2">
              <Label htmlFor="price">Price per Liter/Kg (₹)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 102.50"
              />
            </div>

            <div className="grid w-full items-center gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Visakhapatnam"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePrice} disabled={isSaving}>
              {isSaving ? 'Saving…' : editingPrice ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
