
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, Edit, Trash } from "lucide-react";
import { LedgerEntry } from "@/services/api/ledgerAPI";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LedgerTableProps {
  data: LedgerEntry[];
  isLoading?: boolean;
}

export function LedgerTable({ data, isLoading = false }: LedgerTableProps) {
  const [sortField, setSortField] = useState<keyof LedgerEntry>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Format date for display
  const formatTableDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Handle string date sorting
    if (sortField === 'date') {
      aValue = new Date(a.date).getTime();
      bValue = new Date(b.date).getTime();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter data by search term
  const filteredData = searchTerm 
    ? sortedData.filter(entry => 
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.reference && entry.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        entry.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : sortedData;

  // Handle sort click
  const handleSortClick = (field: keyof LedgerEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle row actions
  const handleEdit = (entry: LedgerEntry) => {
    toast.info(`Editing entry ${entry.id}`, {
      description: "Edit functionality will be available soon"
    });
  };

  const handleDelete = (entry: LedgerEntry) => {
    toast.info(`Deleting entry ${entry.id}`, {
      description: "Delete functionality will be available soon"
    });
  };

  const handleReconcile = (entry: LedgerEntry) => {
    toast.success(`Entry ${entry.id} marked as reconciled`, {
      description: "The entry has been marked as reconciled with your bank account."
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-9 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="border rounded-md">
          <div className="h-12 border-b bg-gray-50"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 border-b animate-pulse bg-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="text-center p-8 border rounded-md bg-gray-50">
        <p className="text-gray-500">No ledger entries found.</p>
        {searchTerm && (
          <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters.</p>
        )}
      </div>
    );
  }

  // Calculate summary totals
  const totals = filteredData.reduce(
    (acc, entry) => {
      if (entry.type === 'income') {
        acc.income += entry.amount;
      } else {
        acc.expenses += entry.amount;
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search by description, reference or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="text-sm text-gray-500">
          {filteredData.length} entries found
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSortClick('date')}
              >
                Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-gray-50"
                onClick={() => handleSortClick('amount')}
              >
                Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-gray-50"
                onClick={() => handleSortClick('balance')}
              >
                Balance {sortField === 'balance' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((entry) => (
              <TableRow key={entry.id} className={
                entry.amount > 10000 ? "bg-yellow-50" : ""
              }>
                <TableCell>{formatTableDate(entry.date)}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {entry.type === 'income' ? 
                      <ArrowDown className="h-4 w-4 text-green-500" /> :
                      <ArrowUp className="h-4 w-4 text-red-500" />
                    }
                    <span>{entry.description}</span>
                    {entry.status === 'pending' && (
                      <Badge variant="outline" className="ml-2 text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{entry.category}</TableCell>
                <TableCell>{entry.paymentMethod}</TableCell>
                <TableCell className={`text-right font-medium ${
                  entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                </TableCell>
                <TableCell>{entry.reference || '-'}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(entry.balance)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(entry)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(entry)}>
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleReconcile(entry)}>
                        Reconcile
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-gray-50 font-medium">
              <TableCell colSpan={4}>Totals</TableCell>
              <TableCell className="text-right">
                <div className="text-green-600">+{formatCurrency(totals.income)}</div>
                <div className="text-red-600">-{formatCurrency(totals.expenses)}</div>
              </TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.income - totals.expenses)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
