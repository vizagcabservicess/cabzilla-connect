
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DriverSelectorProps {
  drivers: {
    driverId: string | number;
    driverName: string;
    amount: number;
    status: 'pending' | 'partial' | 'paid';
  }[];
  isLoading?: boolean;
  onSelectDriver: (driverId: string | number) => void;
}

export function DriverSelector({ drivers, isLoading = false, onSelectDriver }: DriverSelectorProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };
  
  // Payment status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-[120px]" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-[150px]" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Select a driver to view detailed payroll</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {drivers.map((driver) => (
            <button
              key={driver.driverId}
              className="flex items-center justify-between px-3 py-2 border rounded-md hover:bg-gray-50 transition-colors"
              onClick={() => onSelectDriver(driver.driverId)}
            >
              <span className="font-medium">{driver.driverName}</span>
              <div className="ml-3 flex items-center gap-2">
                <span className="text-sm text-gray-600">{formatCurrency(driver.amount)}</span>
                <Badge className={getStatusColor(driver.status)}>
                  {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
