
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
import { Fuel } from 'lucide-react';

interface FuelData {
  id: string;
  date: string;
  vehicleId: string;
  vehicleName: string;
  vehicleNumber: string;
  fuelType: string;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  odometerReading: number;
  fillingStation: string;
  paidBy: string;
  paymentMethod: string;
}

interface ReportFuelsTableProps {
  data: FuelData[] | any;
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
  let reportData: FuelData[] = [];
  
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

  // Calculate totals and stats
  const totals = reportData.reduce(
    (acc, row) => {
      acc.totalQuantity += Number(row.quantity || 0);
      acc.totalCost += Number(row.totalCost || 0);
      
      // Group by vehicle
      const vehicleKey = row.vehicleNumber || row.vehicleId;
      if (!acc.byVehicle[vehicleKey]) {
        acc.byVehicle[vehicleKey] = {
          quantity: 0,
          cost: 0,
          name: row.vehicleName || vehicleKey
        };
      }
      acc.byVehicle[vehicleKey].quantity += Number(row.quantity || 0);
      acc.byVehicle[vehicleKey].cost += Number(row.totalCost || 0);
      
      // Group by fuel type
      const fuelType = row.fuelType || 'Unknown';
      if (!acc.byFuelType[fuelType]) {
        acc.byFuelType[fuelType] = {
          quantity: 0,
          cost: 0
        };
      }
      acc.byFuelType[fuelType].quantity += Number(row.quantity || 0);
      acc.byFuelType[fuelType].cost += Number(row.totalCost || 0);
      
      // Group by payment method
      const paymentMethod = row.paymentMethod || 'Unknown';
      if (!acc.byPaymentMethod[paymentMethod]) {
        acc.byPaymentMethod[paymentMethod] = 0;
      }
      acc.byPaymentMethod[paymentMethod] += Number(row.totalCost || 0);
      
      return acc;
    },
    {
      totalQuantity: 0,
      totalCost: 0,
      byVehicle: {} as Record<string, { quantity: number; cost: number; name: string }>,
      byFuelType: {} as Record<string, { quantity: number; cost: number }>,
      byPaymentMethod: {} as Record<string, number>
    }
  );

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
                <TableHead>Fuel Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price/Unit</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead>Filling Station</TableHead>
                <TableHead>Payment Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{formatReportDate(row.date)}</TableCell>
                  <TableCell className="font-medium">
                    {row.vehicleName || ''} {row.vehicleNumber ? `(${row.vehicleNumber})` : row.vehicleId}
                  </TableCell>
                  <TableCell>{row.fuelType}</TableCell>
                  <TableCell className="text-right">{row.quantity.toFixed(2)} L</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.pricePerUnit)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalCost)}</TableCell>
                  <TableCell>{row.fillingStation}</TableCell>
                  <TableCell>{row.paymentMethod}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Totals</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{totals.totalQuantity.toFixed(2)} L</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.totalCost)}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Fuel Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Fuel Cost</div>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalCost)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Quantity</div>
            <div className="text-2xl font-bold">{totals.totalQuantity.toFixed(2)} L</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Average Cost per Liter</div>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.totalQuantity > 0 ? totals.totalCost / totals.totalQuantity : 0)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(totals.byVehicle).length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Fuel Usage by Vehicle</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Quantity (L)</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(totals.byVehicle).map(([vehicleKey, data], index) => (
                    <TableRow key={index}>
                      <TableCell>{data.name}</TableCell>
                      <TableCell className="text-right">{data.quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        {Object.keys(totals.byFuelType).length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Fuel Usage by Type</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead className="text-right">Quantity (L)</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(totals.byFuelType).map(([fuelType, data], index) => (
                    <TableRow key={index}>
                      <TableCell>{fuelType}</TableCell>
                      <TableCell className="text-right">{data.quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
      
      {Object.keys(totals.byPaymentMethod).length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2">Payment Methods</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(totals.byPaymentMethod).map(([method, amount], index) => (
              <div key={index} className="rounded-md border p-4">
                <div className="text-sm text-muted-foreground">{method}</div>
                <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
