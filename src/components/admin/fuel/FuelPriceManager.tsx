import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, PlusCircle, TrashIcon } from "lucide-react";
import { format } from 'date-fns';

// Update the fuel type to include 'Electric'
type FuelType = 'Diesel' | 'Petrol' | 'CNG' | 'Electric';

export function FuelPriceManager() {
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("");
  const [selectedFuelTypeFilter, setSelectedFuelTypeFilter] = useState<FuelType | "">("");
  
  const [newLocation, setNewLocation] = useState("");
  const [newFuelPrice, setNewFuelPrice] = useState("");
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('Diesel');
  
  const handleAddFuelPrice = () => {
    if (!newLocation || !newFuelPrice || parseFloat(newFuelPrice) <= 0) return;
    
    const newPrice: FuelPrice = {
      location: newLocation,
      fuelType: selectedFuelType,
      price: parseFloat(newFuelPrice),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setFuelPrices([...fuelPrices, newPrice]);
    setNewLocation("");
    setNewFuelPrice("");
  };
  
  const handleRemoveFuelPrice = (index: number) => {
    const updatedPrices = [...fuelPrices];
    updatedPrices.splice(index, 1);
    setFuelPrices(updatedPrices);
  };
  
  const filteredFuelPrices = fuelPrices.filter(price => {
    const locationMatch = !selectedLocationFilter || price.location.toLowerCase().includes(selectedLocationFilter.toLowerCase());
    const fuelTypeMatch = !selectedFuelTypeFilter || price.fuelType === selectedFuelTypeFilter;
    return locationMatch && fuelTypeMatch;
  });
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fuel Price Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="locationFilter">Location Filter</Label>
              <Input 
                id="locationFilter" 
                placeholder="Filter by location" 
                value={selectedLocationFilter}
                onChange={(e) => setSelectedLocationFilter(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fuelTypeFilter">Fuel Type Filter</Label>
              <Select value={selectedFuelTypeFilter} onValueChange={(value) => setSelectedFuelTypeFilter(value as FuelType | "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="CNG">CNG</SelectItem>
                  <SelectItem value="Electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Existing fuel prices */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFuelPrices.map((price, index) => (
                  <tr key={`fuel-price-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{price.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{price.fuelType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{price.price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRemoveFuelPrice(index)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Add new fuel price */}
          <div className="flex flex-wrap gap-2 items-end mt-4">
            <div className="flex-1">
              <Label htmlFor="newLocation">Location</Label>
              <Input 
                id="newLocation" 
                placeholder="e.g., Chennai" 
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
            </div>
            <div className="w-32">
              <Label htmlFor="newFuelPrice">Price</Label>
              <Input 
                id="newFuelPrice" 
                placeholder="Price" 
                value={newFuelPrice}
                onChange={(e) => setNewFuelPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Select value={selectedFuelType} onValueChange={(value) => setSelectedFuelType(value as FuelType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="CNG">CNG</SelectItem>
                  <SelectItem value="Electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              type="button" 
              onClick={handleAddFuelPrice}
              disabled={!newLocation || !newFuelPrice || parseFloat(newFuelPrice) <= 0}
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface FuelPrice {
  location: string;
  fuelType: FuelType;
  price: number;
  createdAt: string;
  updatedAt: string;
}
