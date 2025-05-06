
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Fuel, Mileage, CreditCard, Cash, CircleDollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FuelRecord {
  id: string;
  date: string;
  vehicleId: string;
  vehicleName: string;
  vehicleNumber: string;
  liters: number;
  pricePerLiter: number;
  cost: number;
  odometer?: number;
  fuelStation?: string;
  paymentMethod: 'Cash' | 'Card' | 'Company' | 'Customer';
  paymentDetails?: {
    bankName?: string;
    lastFourDigits?: string;
  };
  fuelType?: 'Petrol' | 'Diesel' | 'CNG' | 'Electric';
  mileage?: number;
}

interface ReportFuelsTableProps {
  data: FuelRecord[] | any;
}

export function ReportFuelsTable({ data }: ReportFuelsTableProps) {
  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Format date for display
  const formatReportDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  // Ensure data is an array
  let reportData: FuelRecord[] = [];
  
  if (Array.isArray(data)) {
    reportData = data;
  } else if (data && typeof data === 'object' && data.fuels && Array.isArray(data.fuels)) {
    reportData = data.fuels;
  } else {
    console.log('Received non-array fuel data:', data);
    reportData = [];
  }

  // If we have no data after processing, show an empty message
  if (reportData.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">No fuel data available for the selected period.</p>
      </div>
    );
  }

  // Calculate totals
  const totals = reportData.reduce(
    (acc, row) => {
      acc.totalLiters += Number(row.liters || 0);
      acc.totalCost += Number(row.cost || 0);
      
      // Track by vehicle
      const vehicleKey = row.vehicleName || row.vehicleNumber || row.vehicleId;
      if (!acc.byVehicle[vehicleKey]) {
        acc.byVehicle[vehicleKey] = {
          liters: 0,
          cost: 0,
          count: 0
        };
      }
      
      acc.byVehicle[vehicleKey].liters += Number(row.liters || 0);
      acc.byVehicle[vehicleKey].cost += Number(row.cost || 0);
      acc.byVehicle[vehicleKey].count += 1;
      
      // Track by payment method
      if (row.paymentMethod) {
        if (!acc.byPaymentMethod[row.paymentMethod]) {
          acc.byPaymentMethod[row.paymentMethod] = 0;
        }
        acc.byPaymentMethod[row.paymentMethod] += Number(row.cost || 0);
      }
      
      // Track by fuel type
      if (row.fuelType) {
        if (!acc.byFuelType[row.fuelType]) {
          acc.byFuelType[row.fuelType] = {
            liters: 0,
            cost: 0,
            count: 0
          };
        }
        acc.byFuelType[row.fuelType].liters += Number(row.liters || 0);
        acc.byFuelType[row.fuelType].cost += Number(row.cost || 0);
        acc.byFuelType[row.fuelType].count += 1;
      }
      
      // Track mileage data
      if (row.mileage) {
        acc.mileageSum += Number(row.mileage);
        acc.mileageCount += 1;
      }
      
      return acc;
    },
    {
      totalLiters: 0,
      totalCost: 0,
      mileageSum: 0,
      mileageCount: 0,
      byVehicle: {} as Record<string, { liters: number; cost: number; count: number }>,
      byPaymentMethod: {} as Record<string, number>,
      byFuelType: {} as Record<string, { liters: number; cost: number; count: number }>
    }
  );

  // Average price per liter and average mileage
  const avgPricePerLiter = totals.totalLiters > 0 ? totals.totalCost / totals.totalLiters : 0;
  const avgMileage = totals.mileageCount > 0 ? totals.mileageSum / totals.mileageCount : 0;

  // Get payment method display with icon
  const getPaymentMethodDisplay = (method: string, details?: { bankName?: string, lastFourDigits?: string }) => {
    switch (method) {
      case 'Cash':
        return (
          <div className="flex items-center">
            <Cash className="h-4 w-4 mr-1 text-green-600" />
            <span>Cash</span>
          </div>
        );
      case 'Card':
        return (
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 mr-1 text-blue-600" />
            <span>
              {details?.bankName ? `${details.bankName}${details.lastFourDigits ? ` - ${details.lastFourDigits}` : ''}` : 'Card'}
            </span>
          </div>
        );
      case 'Company':
        return (
          <div className="flex items-center">
            <CircleDollarSign className="h-4 w-4 mr-1 text-purple-600" />
            <span>Company</span>
          </div>
        );
      case 'Customer':
        return (
          <div className="flex items-center">
            <CircleDollarSign className="h-4 w-4 mr-1 text-orange-600" />
            <span>Customer</span>
          </div>
        );
      default:
        return method;
    }
  };

  // Get fuel type badge
  const getFuelTypeBadge = (fuelType?: string) => {
    if (!fuelType) return null;
    
    const colors: Record<string, string> = {
      'Petrol': 'bg-green-100 text-green-800',
      'Diesel': 'bg-blue-100 text-blue-800',
      'CNG': 'bg-yellow-100 text-yellow-800',
      'Electric': 'bg-purple-100 text-purple-800'
    };
    
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[fuelType] || 'bg-gray-100 text-gray-800'}`}>
        {fuelType}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Fuel Records</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Liters</TableHead>
                <TableHead className="text-right">₹/L</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Odometer</TableHead>
                <TableHead className="text-right">Mileage</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Fuel Station</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{formatReportDate(row.date)}</TableCell>
                  <TableCell className="font-medium">
                    {row.vehicleName} ({row.vehicleNumber || row.vehicleId})
                  </TableCell>
                  <TableCell>{getFuelTypeBadge(row.fuelType) || '-'}</TableCell>
                  <TableCell className="text-right">{row.liters?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell className="text-right">₹{row.pricePerLiter?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.cost)}</TableCell>
                  <TableCell className="text-right">{row.odometer?.toLocaleString() || '-'}</TableCell>
                  <TableCell className="text-right">
                    {row.mileage ? (
                      <span className="inline-flex items-center">
                        <Mileage className="h-3 w-3 mr-1 text-green-600" />
                        {row.mileage.toFixed(1)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{getPaymentMethodDisplay(row.paymentMethod, row.paymentDetails) || '-'}</TableCell>
                  <TableCell>{row.fuelStation || '-'}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Totals</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{totals.totalLiters.toFixed(2)}</TableCell>
                <TableCell className="text-right">₹{avgPricePerLiter.toFixed(2)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.totalCost)}</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{avgMileage ? avgMileage.toFixed(1) : '-'}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Fuel Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Fuel (Liters)</div>
            <div className="text-2xl font-bold">{totals.totalLiters.toFixed(2)} L</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Cost</div>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalCost)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Average Price</div>
            <div className="text-2xl font-bold">₹{avgPricePerLiter.toFixed(2)}/L</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Average Mileage</div>
            <div className="text-2xl font-bold">{avgMileage ? avgMileage.toFixed(1) : '-'} km/L</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.keys(totals.byVehicle).length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Fuel by Vehicle</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Liters</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Refills</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(totals.byVehicle).map(([vehicle, stats], index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{vehicle}</TableCell>
                      <TableCell className="text-right">{stats.liters.toFixed(2)} L</TableCell>
                      <TableCell className="text-right">{formatCurrency(stats.cost)}</TableCell>
                      <TableCell className="text-right">{stats.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        {Object.keys(totals.byPaymentMethod).length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Fuel by Payment Method</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(totals.byPaymentMethod).map(([method, cost], index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{method}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        {Object.keys(totals.byFuelType).length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Fuel by Type</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead className="text-right">Liters</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Refills</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(totals.byFuelType).map(([fuelType, stats], index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{getFuelTypeBadge(fuelType)}</TableCell>
                      <TableCell className="text-right">{stats.liters.toFixed(2)} L</TableCell>
                      <TableCell className="text-right">{formatCurrency(stats.cost)}</TableCell>
                      <TableCell className="text-right">{stats.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
