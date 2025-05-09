
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
import { CalendarIcon, Edit, Trash, Filter, Plus } from "lucide-react";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExpenseCategory, ExpenseEntry } from '@/types/ledger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExpenseTableProps {
  data: ExpenseEntry[];
  isLoading?: boolean;
  categories: ExpenseCategory[];
  onEdit: (expense: ExpenseEntry) => void;
  onDelete: (id: string | number) => void;
  onAddNew: () => void;
}

export function ExpenseTable({ 
  data, 
  isLoading = false, 
  categories,
  onEdit,
  onDelete,
  onAddNew
}: ExpenseTableProps) {
  const [sortField, setSortField] = useState<keyof ExpenseEntry>('date');
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

  // Get category name from id
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  // Get category color from id
  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6B7280';
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
        (entry.vendor && entry.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
        getCategoryName(entry.category).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : sortedData;

  // Handle sort click
  const handleSortClick = (field: keyof ExpenseEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Calculate monthly totals
  const getMonthlyTotals = () => {
    const months: Record<string, { total: number, count: number }> = {};
    
    data.forEach(expense => {
      const monthYear = format(new Date(expense.date), 'MMM yyyy');
      
      if (!months[monthYear]) {
        months[monthYear] = { total: 0, count: 0 };
      }
      
      months[monthYear].total += expense.amount;
      months[monthYear].count += 1;
    });
    
    return Object.entries(months)
      .sort((a, b) => {
        // Sort by month-year in descending order
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3); // Get only the latest 3 months
  };

  const monthlyTotals = getMonthlyTotals();

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {monthlyTotals.map(([month, data]) => (
            <Badge key={month} variant="outline" className="px-3 py-1">
              {month}: {formatCurrency(data.total)} ({data.count} expenses)
            </Badge>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Button onClick={onAddNew} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>
      
      {filteredData.length === 0 ? (
        <div className="text-center p-8 border rounded-md bg-gray-50">
          <p className="text-gray-500">No expenses found.</p>
          {searchTerm && (
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search.</p>
          )}
          <Button onClick={onAddNew} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" /> Add Your First Expense
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 w-[120px]"
                  onClick={() => handleSortClick('date')}
                >
                  Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSortClick('amount')}
                >
                  Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatTableDate(expense.date)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{expense.description}</span>
                      {expense.notes && (
                        <span className="text-xs text-gray-500 truncate max-w-[200px]">{expense.notes}</span>
                      )}
                      {expense.status === 'pending' && (
                        <Badge variant="outline" className="mt-1 text-amber-600 border-amber-200 bg-amber-50 w-fit">
                          Pending
                        </Badge>
                      )}
                      {expense.isRecurring && (
                        <Badge variant="outline" className="mt-1 text-blue-600 border-blue-200 bg-blue-50 w-fit">
                          Recurring
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className="font-normal" 
                      style={{
                        backgroundColor: `${getCategoryColor(expense.category)}20`,
                        color: getCategoryColor(expense.category),
                        borderColor: `${getCategoryColor(expense.category)}40`,
                      }}
                    >
                      {getCategoryName(expense.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>{expense.vendor || '-'}</TableCell>
                  <TableCell>{expense.paymentMethod}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(expense)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(expense.id)}>
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Total row */}
              <TableRow className="bg-gray-50 font-medium">
                <TableCell colSpan={5}>Total</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(filteredData.reduce((sum, expense) => sum + expense.amount, 0))}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
