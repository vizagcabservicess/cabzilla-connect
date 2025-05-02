
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
import { Wrench } from 'lucide-react';

interface MaintenanceData {
  id: string;
  date: string;
  vehicleId: string;
  vehicleName: string;
  vehicleNumber: string;
  serviceType: string;
  description: string;
  cost: number;
  vendor: string;
  nextServiceDate?: string;
}

interface ReportMaintenanceTableProps {
  data: MaintenanceData[] | any;
}

export function ReportMaintenanceTable({ data }: ReportMaintenanceTableProps) {
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
  let reportData: MaintenanceData[] = [];
  
  if (Array.isArray(data)) {
    reportData = data;
  } else if (data && typeof data === 'object' && data.maintenance && Array.isArray(data.maintenance)) {
    reportData = data.maintenance;
  } else {
    console.log('Received non-array maintenance data:', data);
    reportData = [];
  }

  // If we have no data after processing, show an empty message
  if (reportData.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">No maintenance data available for the selected period.</p>
      </div>
    );
  }

  // Calculate totals
  const totalCost = reportData.reduce((acc, row) => acc + Number(row.cost || 0), 0);
  
  // Calculate cost by vehicle and maintenance type
  const costByVehicle: Record<string, number> = {};
  const costByType: Record<string, number> = {};
  
  reportData.forEach(row => {
    const vehicleKey = row.vehicleNumber || row.vehicleId;
    const serviceType = row.serviceType || 'Unknown';
    
    costByVehicle[vehicleKey] = (costByVehicle[vehicleKey] || 0) + Number(row.cost || 0);
    costByType[serviceType] = (costByType[serviceType] || 0) + Number(row.cost || 0);
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Maintenance Records</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Next Service</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{formatReportDate(row.date)}</TableCell>
                  <TableCell className="font-medium">
                    {row.vehicleName} ({row.vehicleNumber || row.vehicleId})
                  </TableCell>
                  <TableCell>{row.serviceType}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.vendor}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.cost)}</TableCell>
                  <TableCell>{row.nextServiceDate ? formatReportDate(row.nextServiceDate) : '-'}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Totals</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{formatCurrency(totalCost)}</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Maintenance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Maintenance Cost</div>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Maintenance Records</div>
            <div className="text-2xl font-bold">{reportData.length}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Average Cost per Service</div>
            <div className="text-2xl font-bold">
              {formatCurrency(reportData.length > 0 ? totalCost / reportData.length : 0)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(costByVehicle).length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Cost by Vehicle</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(costByVehicle).map(([vehicle, cost], index) => (
                    <TableRow key={index}>
                      <TableCell>{vehicle}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        {Object.keys(costByType).length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Cost by Service Type</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Type</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(costByType).map(([type, cost], index) => (
                    <TableRow key={index}>
                      <TableCell>{type}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cost)}</TableCell>
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
