import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Car, AlertCircle } from 'lucide-react';

interface VehiclesReportData {
  vehicle_id: string;
  vehicle_name: string;
  vehicle_number: string;
  total_trips: number;
  total_revenue: number;
  fuel_cost?: number;
  maintenance_cost?: number;
  net_profit?: number;
  utilization_rate?: number;
  downtime_days?: number;
  commission?: number;
  avg_driver_salary?: number;
  emi?: number;
  expenses?: number;
  total_expenses?: number;
}

interface ReportVehiclesTableProps {
  data: VehiclesReportData[] | any;
}

export function ReportVehiclesTable({ data }: ReportVehiclesTableProps) {
  // Format currency with null/undefined check
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Format percentage with null/undefined check
  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '0%';
    return `${Math.round(value)}%`;
  };

  // Ensure data is an array
  let reportData: VehiclesReportData[] = [];
  
  if (Array.isArray(data)) {
    reportData = data;
  } else if (data && typeof data === 'object' && data.vehicles && Array.isArray(data.vehicles)) {
    reportData = data.vehicles;
  } else if (data && typeof data === 'object') {
    console.log('Received non-array vehicle data:', data);
    // Try to extract any vehicle information from the data object
    if (data.topVehicles && Array.isArray(data.topVehicles)) {
      reportData = data.topVehicles;
    } else {
      // Empty array as fallback
      reportData = [];
    }
  }

  // Safety check - if still no valid data, show empty state
  if (reportData.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">No vehicle data available for the selected period.</p>
      </div>
    );
  }

  // Calculate totals
  const totals = reportData.reduce(
    (acc, row) => {
      acc.total_trips += Number(row.total_trips || 0);
      acc.total_revenue += Number(row.total_revenue || 0);
      acc.fuel_cost += Number(row.fuel_cost || 0);
      acc.maintenance_cost += Number(row.maintenance_cost || 0);
      acc.commission += Number(row.commission || 0);
      acc.avg_driver_salary += Number(row.avg_driver_salary || 0);
      acc.emi += Number(row.emi || 0);
      // For total expenses, just take the first non-undefined value (since it's the same for all vehicles)
      if (acc.total_expenses === undefined && row.total_expenses !== undefined) {
        acc.total_expenses = row.total_expenses;
      }
      return acc;
    },
    {
      total_trips: 0,
      total_revenue: 0,
      fuel_cost: 0,
      maintenance_cost: 0,
      commission: 0,
      avg_driver_salary: 0,
      emi: 0,
      total_expenses: undefined,
    } as any
  );

  // Calculate net profit (updated formula)
  const netProfit = totals.total_revenue - totals.fuel_cost - totals.maintenance_cost - totals.commission - totals.emi - totals.avg_driver_salary - totals.total_expenses;

  // Find top performers
  const topRevenue = [...reportData].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))[0];
  const topUtilized = [...reportData].sort((a, b) => (b.utilization_rate || 0) - (a.utilization_rate || 0))[0];

  // Get total and average expenses from the first row (same for all vehicles)
  const totalExpenses = reportData[0]?.total_expenses || 0;
  const avgExpense = reportData[0]?.expenses || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Vehicle Performance</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Vehicle Number</TableHead>
                <TableHead className="text-right">Trips</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Fuel Cost</TableHead>
                <TableHead className="text-right">Maintenance</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">EMI</TableHead>
                <TableHead className="text-right">Avg Driver Salary</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, index) => {
                const profit = (row.total_revenue || 0)
                  - (row.fuel_cost || 0)
                  - (row.maintenance_cost || 0)
                  - (row.commission || 0)
                  - (row.emi || 0)
                  - (row.avg_driver_salary || 0)
                  - (row.expenses || 0);
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.vehicle_name}</TableCell>
                    <TableCell>{row.vehicle_number}</TableCell>
                    <TableCell className="text-right">{row.total_trips || 0}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.fuel_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.maintenance_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.commission)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.emi)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.avg_driver_salary)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.expenses)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(profit)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Totals</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{totals.total_trips}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.total_revenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.fuel_cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.maintenance_cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.commission)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.emi)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.avg_driver_salary)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
                <TableCell className="text-right">{formatCurrency(netProfit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Top Performing Vehicles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topRevenue && (
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">Highest Revenue</div>
              <div className="font-semibold mt-1">{topRevenue.vehicle_name} ({topRevenue.vehicle_number})</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(topRevenue.total_revenue)}</div>
            </div>
          )}
          
          {topUtilized && (
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">Most Utilized</div>
              <div className="font-semibold mt-1">{topUtilized.vehicle_name} ({topUtilized.vehicle_number})</div>
              <div className="text-2xl font-bold mt-1">
                {formatPercentage(topUtilized.utilization_rate)} utilization
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Fleet Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Vehicles</div>
            <div className="text-2xl font-bold">{reportData.length}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold">{formatCurrency(totals.total_revenue)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Expenses</div>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Net Profit</div>
            <div className="text-2xl font-bold">{formatCurrency(netProfit)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
