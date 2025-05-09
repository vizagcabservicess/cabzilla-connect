
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Edit } from "lucide-react";
import { format, parseISO } from "date-fns";
import { PayrollEntry } from "@/types/ledger";

interface PayrollTableProps {
  data: PayrollEntry[];
  isLoading?: boolean;
  showDriverColumn?: boolean;
  onViewDetails: (payroll: PayrollEntry) => void;
  onGeneratePayslip: (id: string | number) => void;
}

export function PayrollTable({
  data,
  isLoading = false,
  showDriverColumn = true,
  onViewDetails,
  onGeneratePayslip
}: PayrollTableProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };
  
  // Get driver name from the description
  const getDriverName = (description: string) => {
    const match = description.match(/- ([^-]+)$/);
    return match ? match[1] : "Unknown";
  };
  
  // Get month from date
  const getPayPeriod = (payPeriod: { startDate: string; endDate: string }) => {
    return format(parseISO(payPeriod.startDate), 'MMM yyyy');
  };
  
  // Payment status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'partial':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pay Period</TableHead>
              {showDriverColumn && <TableHead>Driver</TableHead>}
              <TableHead>Basic Salary</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                {showDriverColumn && <TableCell><Skeleton className="h-6 w-32" /></TableCell>}
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-9 w-20 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // No data state
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No payroll entries found for the selected period.
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pay Period</TableHead>
            {showDriverColumn && <TableHead>Driver</TableHead>}
            <TableHead>Basic Salary</TableHead>
            <TableHead>Net Salary</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{getPayPeriod(entry.payPeriod)}</TableCell>
              {showDriverColumn && <TableCell>{getDriverName(entry.description)}</TableCell>}
              <TableCell>{formatCurrency(entry.basicSalary)}</TableCell>
              <TableCell>{formatCurrency(entry.netSalary)}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(entry.paymentStatus)}>
                  {entry.paymentStatus.charAt(0).toUpperCase() + entry.paymentStatus.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                {entry.paymentDate ? format(parseISO(entry.paymentDate), 'dd MMM yyyy') : 'Pending'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onViewDetails(entry)}>
                    <Edit className="h-4 w-4 mr-1" /> View
                  </Button>
                  {entry.payslipIssued && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onGeneratePayslip(entry.id)}
                    >
                      <FileText className="h-4 w-4 mr-1" /> Payslip
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
