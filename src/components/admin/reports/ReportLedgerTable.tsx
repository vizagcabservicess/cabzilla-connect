
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
import { BookOpen, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  paymentMethod?: string;
  reference?: string;
  balance: number;
}

interface ReportLedgerTableProps {
  data: LedgerEntry[] | any;
}

export function ReportLedgerTable({ data }: ReportLedgerTableProps) {
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
  let reportData: LedgerEntry[] = [];
  
  if (Array.isArray(data)) {
    reportData = data;
  } else if (data && typeof data === 'object' && data.entries && Array.isArray(data.entries)) {
    reportData = data.entries;
  } else {
    console.log('Received non-array ledger data:', data);
    reportData = [];
  }

  // If we have no data after processing, show an empty message
  if (reportData.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">No ledger data available for the selected period.</p>
      </div>
    );
  }

  // Sort entries by date
  const sortedEntries = [...reportData].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Calculate summary
  const summary = reportData.reduce(
    (acc, entry) => {
      if (entry.type === 'income') {
        acc.totalIncome += Number(entry.amount || 0);
      } else {
        acc.totalExpenses += Number(entry.amount || 0);
      }
      return acc;
    },
    { totalIncome: 0, totalExpenses: 0 }
  );

  const netCashflow = summary.totalIncome - summary.totalExpenses;

  // Group by payment method
  const byPaymentMethod: Record<string, { income: number; expense: number }> = {};
  reportData.forEach(entry => {
    const method = entry.paymentMethod || 'Unknown';
    if (!byPaymentMethod[method]) {
      byPaymentMethod[method] = { income: 0, expense: 0 };
    }
    
    if (entry.type === 'income') {
      byPaymentMethod[method].income += Number(entry.amount || 0);
    } else {
      byPaymentMethod[method].expense += Number(entry.amount || 0);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Ledger Entries</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>{formatReportDate(entry.date)}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {entry.type === 'income' 
                        ? <ArrowDownLeft className="h-4 w-4 text-green-500 mr-2" />
                        : <ArrowUpRight className="h-4 w-4 text-red-500 mr-2" />
                      }
                      {entry.description}
                    </div>
                  </TableCell>
                  <TableCell>{entry.category}</TableCell>
                  <TableCell>{entry.reference || '-'}</TableCell>
                  <TableCell className="text-right">
                    {entry.type === 'income' ? formatCurrency(entry.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.type === 'expense' ? formatCurrency(entry.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(entry.balance)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={4}>Totals</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.totalIncome)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.totalExpenses)}</TableCell>
                <TableCell className="text-right">{formatCurrency(netCashflow)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Financial Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Income</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Expenses</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Net Cash Flow</div>
            <div className={`text-2xl font-bold ${
              netCashflow >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(netCashflow)}
            </div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Current Balance</div>
            <div className="text-2xl font-bold">
              {sortedEntries.length > 0 ? 
                formatCurrency(sortedEntries[sortedEntries.length - 1].balance) : 
                formatCurrency(0)
              }
            </div>
          </div>
        </div>
      </div>
      
      {Object.keys(byPaymentMethod).length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2">By Payment Method</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expense</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byPaymentMethod).map(([method, amounts], index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{method}</TableCell>
                    <TableCell className="text-right">{formatCurrency(amounts.income)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(amounts.expense)}</TableCell>
                    <TableCell className="text-right">
                      <span className={amounts.income - amounts.expense >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(amounts.income - amounts.expense)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
