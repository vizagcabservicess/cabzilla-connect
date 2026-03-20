
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';
import { Download } from 'lucide-react';

interface NonGstBillData {
  id: string;
  billNumber: string;
  date: string;
  journeyDate?: string | null;
  customerName: string;
  amount: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  paymentMethod?: string;
  bookingId?: number;
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

  // Download invoice (for generated invoices with bookingId)
  const handleDownloadInvoice = (row: NonGstBillData) => {
    if (!row.bookingId) return;
    const apiBaseUrl = 'https://www.vizagtaxihub.com';
    const urlParams = new URLSearchParams({
      id: row.bookingId.toString(),
      gstEnabled: '0',
      format: 'pdf',
      direct_download: '1'
    });
    window.open(`${apiBaseUrl}/api/download-invoice.php?${urlParams.toString()}`, '_blank');
  };

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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Non-GST Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Total Invoices</div>
              <div className="text-2xl font-bold mt-1">{reportData.length}</div>
            </div>
            <div className="bg-green-100 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(totals.totalAmount)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-medium mb-3">Non-GST Bills &amp; Invoices</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead>Journey Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-center w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, index) => (
                <TableRow key={row.id || index}>
                  <TableCell className="font-medium">{row.billNumber}</TableCell>
                  <TableCell>{formatReportDate(row.date)}</TableCell>
                  <TableCell>{row.journeyDate ? formatReportDate(row.journeyDate) : '-'}</TableCell>
                  <TableCell>{row.customerName}</TableCell>
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
                  <TableCell className="text-center">
                    {row.bookingId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownloadInvoice(row)}
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
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
