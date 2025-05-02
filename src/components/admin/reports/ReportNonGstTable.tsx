
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { Receipt } from 'lucide-react';

interface NonGstBillData {
  id: string;
  billNumber: string;
  date: string;
  customerName: string;
  amount: number;
  description: string;
  paymentStatus: 'paid' | 'pending' | 'partial';
  paymentMethod?: string;
}

interface ReportNonGstTableProps {
  data: NonGstBillData[] | any;
}

export function ReportNonGstTable({ data }: ReportNonGstTableProps) {
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
  let reportData: NonGstBillData[] = [];
  
  if (Array.isArray(data)) {
    reportData = data;
  } else if (data && typeof data === 'object' && data.bills && Array.isArray(data.bills)) {
    reportData = data.bills;
  } else {
    console.log('Received non-array non-GST bills data:', data);
    reportData = [];
  }

  // If we have no data after processing, show an empty message
  if (reportData.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">No non-GST billing data available for the selected period.</p>
      </div>
    );
  }

  // Calculate totals
  const totals = reportData.reduce(
    (acc, row) => {
      acc.totalAmount += Number(row.amount || 0);
      if (row.paymentStatus === 'paid') acc.paid += Number(row.amount || 0);
      if (row.paymentStatus === 'pending') acc.pending += Number(row.amount || 0);
      if (row.paymentStatus === 'partial') acc.partial += Number(row.amount || 0);
      
      // Count by payment method
      if (row.paymentMethod) {
        acc.byMethod[row.paymentMethod] = (acc.byMethod[row.paymentMethod] || 0) + Number(row.amount || 0);
      }
      
      return acc;
    },
    {
      totalAmount: 0,
      paid: 0,
      pending: 0,
      partial: 0,
      byMethod: {} as Record<string, number>
    }
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Non-GST Bills</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.billNumber}</TableCell>
                  <TableCell>{formatReportDate(row.date)}</TableCell>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 
                      row.paymentStatus === 'pending' ? 'bg-red-100 text-red-800' : 
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {row.paymentStatus}
                    </span>
                  </TableCell>
                  <TableCell>{row.paymentMethod || '-'}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Totals</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.totalAmount)}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Payment Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Amount</div>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalAmount)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Paid</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.paid)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.pending)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Partial Payments</div>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totals.partial)}</div>
          </div>
        </div>
      </div>
      
      {Object.keys(totals.byMethod).length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2">Payment Methods</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(totals.byMethod).map(([method, amount], index) => (
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
