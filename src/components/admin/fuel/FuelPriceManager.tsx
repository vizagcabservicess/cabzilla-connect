
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
    fetchFuelPrices();
  }, []);

  const fetchFuelPrices = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call to fetch fuel prices
      // For now, we'll use mock data
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      // In a real app, this would be an API call to update the fuel price
      const payload = {
        fuelType,
        price: parseFloat(price),
        location,
        effectiveDate: new Date().toISOString()
      };

      const updatedPrice = editingPrice
        ? { ...editingPrice, ...payload, updatedAt: new Date().toISOString() }
        : {
            id: `temp-${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

      // Update local state first for immediate feedback
      if (editingPrice) {
        setFuelPrices(prev => 
          prev.map(p => p.id === editingPrice.id ? updatedPrice : p)
        );
      } else {
        setFuelPrices(prev => [...prev.filter(p => p.fuelType !== fuelType), updatedPrice]);
      }

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success(`${fuelType} price updated successfully`);
      if (onPriceUpdate) onPriceUpdate();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error updating fuel price:", error);
      toast.error('Failed to update fuel price');
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Current Fuel Prices</CardTitle>
          <Button onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}>
            Update Prices
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {fuelPrices.map((price) => (
                <div 
                  key={price.id} 
                  className="bg-white p-6 rounded-lg shadow border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleEditPrice(price)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{price.fuelType}</h3>
                      <p className="text-gray-500 text-sm">Last updated: {formatDate(price.updatedAt)}</p>
                    </div>
                    <div className="text-2xl font-bold">₹{price.price.toFixed(2)}</div>
                  </div>
                  {price.location && (
                    <p className="text-sm text-gray-500 mt-2">Location: {price.location}</p>
                  )}
                </div>
              ))}

              {fuelPrices.length === 0 && (
                <div className="col-span-3 text-center p-6">
                  <p className="text-gray-500">No fuel prices found. Click "Update Prices" to add prices.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
            <Button onClick={handleUpdatePrice}>
              {editingPrice ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
