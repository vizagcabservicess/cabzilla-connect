
import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { format, parse, addDays } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Filter, 
  Plus, 
  FileDown, 
  Calendar, 
  MoreVertical, 
  CreditCard, 
  Receipt, 
  Fuel,
  Wallet 
} from "lucide-react";
import axios from 'axios';
import { getApiUrl } from '@/config/api';

// Define the transaction interface
interface Transaction {
  id: number;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  paymentMethod: string;
  reference: string;
  bookingId?: number | null;
  vehicleId?: string | null;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

interface LedgerSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState<string>("ledger");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    type: 'income',
    amount: '',
    category: '',
    paymentMethod: 'Cash',
    reference: '',
    vehicleId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    vehicleId: ''
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchTransactions();
  }, [dateRange, filters]);
  
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      
      const params: Record<string, string> = {};
      
      if (dateRange?.from) {
        params.start_date = format(dateRange.from, 'yyyy-MM-dd');
      }
      
      if (dateRange?.to) {
        params.end_date = format(dateRange.to, 'yyyy-MM-dd');
      }
      
      if (filters.category) {
        params.category = filters.category;
      }
      
      if (filters.type) {
        params.type = filters.type;
      }
      
      if (filters.vehicleId) {
        params.vehicle_id = filters.vehicleId;
      }
      
      const response = await axios.get(`${getApiUrl()}/admin/ledger.php`, { params });
      
      if (response.data.status === 'success') {
        setTransactions(response.data.transactions);
        setSummary(response.data.summary);
        setAvailableCategories(response.data.categories || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load ledger data: " + (response.data.message || "Unknown error"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load ledger data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    try {
      if (!newTransaction.description || !newTransaction.amount) {
        toast({
          title: "Validation Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);
      
      const response = await axios.post(`${getApiUrl()}/admin/ledger.php`, {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      });
      
      if (response.data.status === 'success') {
        toast({
          title: "Success",
          description: "Transaction added successfully",
        });
        
        setShowAddDialog(false);
        // Reset form
        setNewTransaction({
          date: format(new Date(), 'yyyy-MM-dd'),
          description: '',
          type: 'income',
          amount: '',
          category: '',
          paymentMethod: 'Cash',
          reference: '',
          vehicleId: ''
        });
        
        // Refresh transactions
        fetchTransactions();
      } else {
        toast({
          title: "Error",
          description: "Failed to add transaction: " + (response.data.message || "Unknown error"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to get styling for income/expense
  const getAmountStyle = (type: string): string => {
    return type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
  };
  
  // Function to get category icon
  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('fuel')) {
      return <Fuel className="h-4 w-4 mr-2" />;
    } else if (categoryLower.includes('trip') || categoryLower.includes('fare') || categoryLower.includes('revenue')) {
      return <Receipt className="h-4 w-4 mr-2" />;
    } else if (categoryLower.includes('card') || categoryLower.includes('payment')) {
      return <CreditCard className="h-4 w-4 mr-2" />;
    } else {
      return <Wallet className="h-4 w-4 mr-2" />;
    }
  };
  
  // Function to handle adding specific transaction types
  const handleAddSpecificTransaction = (type: 'income' | 'expense', category: string = '') => {
    setNewTransaction({
      ...newTransaction,
      type,
      category
    });
    setShowAddDialog(true);
  };
  
  // Function to reset filters
  const resetFilters = () => {
    setFilters({
      category: '',
      type: '',
      vehicleId: ''
    });
  };
  
  // Function to handle exporting data
  const handleExport = () => {
    // Create CSV content
    let csvContent = "Date,Description,Type,Amount,Category,Payment Method,Reference,Balance\n";
    
    transactions.forEach(transaction => {
      const row = [
        transaction.date,
        `"${transaction.description.replace(/"/g, '""')}"`,
        transaction.type,
        transaction.amount,
        transaction.category,
        transaction.paymentMethod,
        transaction.reference,
        transaction.balance
      ].join(',');
      
      csvContent += row + "\n";
    });
    
    // Create a blob and download it
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `ledger-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Export Complete",
      description: "Your ledger data has been exported to CSV.",
    });
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Ledger</h1>
            <p className="text-gray-500">Track income, expenses and financial transactions</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAddSpecificTransaction('income', 'Trip Revenue')}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Add Trip Income
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddSpecificTransaction('expense', 'Fuel')}>
                  <Fuel className="mr-2 h-4 w-4" />
                  Add Fuel Expense
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddSpecificTransaction('expense')}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Add Other Expense
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddSpecificTransaction('income')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Add Other Income
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Income</p>
                <h3 className="text-2xl font-bold text-green-600">₹{summary.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Expenses</p>
                <h3 className="text-2xl font-bold text-red-600">₹{summary.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Net Balance</p>
                <h3 className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{summary.netBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h3 className="text-lg font-semibold">Transaction History</h3>
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <DatePickerWithRange 
                  className="w-full md:w-auto" 
                  date={dateRange} 
                  setDate={setDateRange} 
                />
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="whitespace-nowrap"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExport}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>
            
            {showFilters && (
              <div className="mb-6 p-4 border rounded-md bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="filter-type">Transaction Type</Label>
                    <Select 
                      value={filters.type} 
                      onValueChange={(value) => setFilters({...filters, type: value})}
                    >
                      <SelectTrigger id="filter-type">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="filter-category">Category</Label>
                    <Select 
                      value={filters.category} 
                      onValueChange={(value) => setFilters({...filters, category: value})}
                    >
                      <SelectTrigger id="filter-category">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {availableCategories.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="filter-vehicle">Vehicle</Label>
                    <Select 
                      value={filters.vehicleId} 
                      onValueChange={(value) => setFilters({...filters, vehicleId: value})}
                    >
                      <SelectTrigger id="filter-vehicle">
                        <SelectValue placeholder="All Vehicles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Vehicles</SelectItem>
                        <SelectItem value="VEH-001">VEH-001</SelectItem>
                        <SelectItem value="VEH-002">VEH-002</SelectItem>
                        <SelectItem value="VEH-003">VEH-003</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>
              </div>
            )}
            
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount (₹)</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Balance (₹)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <p className="text-gray-500">No transactions found for the selected filters</p>
                          <Button variant="outline" size="sm" className="mt-2" onClick={resetFilters}>
                            Reset Filters
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{format(new Date(record.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{record.description}</TableCell>
                          <TableCell className="capitalize">{record.type}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getCategoryIcon(record.category)}
                              {record.category}
                            </div>
                          </TableCell>
                          <TableCell className={getAmountStyle(record.type)}>
                            {record.type === 'expense' ? '-' : '+'}{record.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{record.paymentMethod}</TableCell>
                          <TableCell>{record.reference}</TableCell>
                          <TableCell className="font-medium">{record.balance.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                                {record.bookingId && (
                                  <DropdownMenuItem>View Booking</DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Add Transaction Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>
              Enter the details for the new financial transaction.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transaction-date">Date</Label>
                <Input
                  id="transaction-date"
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="transaction-type">Type</Label>
                <Select 
                  value={newTransaction.type} 
                  onValueChange={(value) => setNewTransaction({...newTransaction, type: value as 'income' | 'expense'})}
                >
                  <SelectTrigger id="transaction-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="transaction-description">Description</Label>
              <Input
                id="transaction-description"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                placeholder="E.g., Fuel payment, Trip fare, etc."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transaction-amount">Amount (₹)</Label>
                <Input
                  id="transaction-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="transaction-category">Category</Label>
                <Select 
                  value={newTransaction.category} 
                  onValueChange={(value) => setNewTransaction({...newTransaction, category: value})}
                >
                  <SelectTrigger id="transaction-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {newTransaction.type === 'income' ? (
                      <>
                        <SelectItem value="Trip Revenue">Trip Revenue</SelectItem>
                        <SelectItem value="Booking Advance">Booking Advance</SelectItem>
                        <SelectItem value="Extra Charges">Extra Charges</SelectItem>
                        <SelectItem value="Capital">Capital</SelectItem>
                        <SelectItem value="Other Income">Other Income</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="Fuel">Fuel</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Rent">Rent</SelectItem>
                        <SelectItem value="Insurance">Insurance</SelectItem>
                        <SelectItem value="Taxes">Taxes</SelectItem>
                        <SelectItem value="Other Expense">Other Expense</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transaction-payment-method">Payment Method</Label>
                <Select 
                  value={newTransaction.paymentMethod} 
                  onValueChange={(value) => setNewTransaction({...newTransaction, paymentMethod: value})}
                >
                  <SelectTrigger id="transaction-payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="transaction-reference">Reference</Label>
                <Input
                  id="transaction-reference"
                  value={newTransaction.reference}
                  onChange={(e) => setNewTransaction({...newTransaction, reference: e.target.value})}
                  placeholder="Receipt number, invoice, etc."
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="transaction-vehicle-id">Vehicle ID (if applicable)</Label>
              <Input
                id="transaction-vehicle-id"
                value={newTransaction.vehicleId}
                onChange={(e) => setNewTransaction({...newTransaction, vehicleId: e.target.value})}
                placeholder="E.g., VEH-001"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTransaction} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
