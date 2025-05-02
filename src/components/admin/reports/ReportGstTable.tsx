
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';
import { GstReportData, GstInvoice } from '@/types/api';

interface ReportGstTableProps {
  data: GstReportData | any;
}

export const ReportGstTable: React.FC<ReportGstTableProps> = ({ data }) => {
  // Extract GST invoices and summary from the data
  const { gstInvoices = [], summary = {} } = data || {};

  if (!gstInvoices || gstInvoices.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">No GST invoice data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* GST Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">GST Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Total Invoices</div>
              <div className="text-2xl font-bold mt-1">{summary.totalInvoices || 0}</div>
            </div>
            <div className="bg-green-100 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Taxable Value</div>
              <div className="text-2xl font-bold mt-1">₹{(summary.totalTaxableValue || 0).toLocaleString()}</div>
            </div>
            <div className="bg-blue-100 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">GST Amount</div>
              <div className="text-2xl font-bold mt-1">₹{(summary.totalGstAmount || 0).toLocaleString()}</div>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Total with GST</div>
              <div className="text-2xl font-bold mt-1">₹{(summary.totalWithGst || 0).toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GST Invoices Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>GST Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Taxable Value</TableHead>
              <TableHead className="text-center">GST Rate</TableHead>
              <TableHead className="text-right">GST Amount</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gstInvoices.map((invoice: GstInvoice, index: number) => (
              <TableRow key={invoice.id || `invoice-${index}`}>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.customerName || 'N/A'}</TableCell>
                <TableCell>{invoice.gstNumber || 'N/A'}</TableCell>
                <TableCell>
                  {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'dd MMM yyyy') : 'N/A'}
                </TableCell>
                <TableCell className="text-right">₹{invoice.taxableValue.toLocaleString()}</TableCell>
                <TableCell className="text-center">{invoice.gstRate}</TableCell>
                <TableCell className="text-right">₹{invoice.gstAmount.toLocaleString()}</TableCell>
                <TableCell className="text-right">₹{invoice.totalAmount.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
