
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, ArrowDown, ArrowUp } from "lucide-react";
import { ledgerAPI, LedgerTransaction, LedgerFilters } from '@/services/api/ledgerAPI';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { IndianRupee } from 'lucide-react';

const LedgerPage: React.FC = () => {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [filters, setFilters] = useState<LedgerFilters>({
    startDate: '',
    endDate: '',
    type: '',
    category: '',
    vehicleId: ''
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netBalance, setNetBalance] = useState(0);

  const fetchTransactions = async (filters: LedgerFilters = {}) => {
    setLoading(true);
    try {
      const response = await ledgerAPI.getTransactions(filters);
      setTransactions(response.transactions || []);
      setTotalIncome(response.totalIncome || 0);
      setTotalExpenses(response.totalExpenses || 0);
      setNetBalance(response.netBalance || 0);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch transactions",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(filters);
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
  };

  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);
    if (newDateRange?.from) {
      setFilters(prevFilters => ({
        ...prevFilters,
        startDate: format(newDateRange.from!, 'yyyy-MM-dd'),
        endDate: newDateRange.to ? format(newDateRange.to, 'yyyy-MM-dd') : format(newDateRange.from!, 'yyyy-MM-dd')
      }));
    } else {
      setFilters(prevFilters => ({
        ...prevFilters,
        startDate: '',
        endDate: ''
      }));
    }
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setFilters({
      startDate: '',
      endDate: '',
      type: '',
      category: '',
      vehicleId: ''
    });
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Financial Ledger</CardTitle>
          <CardDescription>View and filter financial transactions</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, "MMM dd, yyyy")} - ${format(
                          dateRange.to,
                          "MMM dd, yyyy"
                        )}`
                      ) : (
                        format(dateRange.from, "MMM dd, yyyy")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center" side="bottom">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date('2023-01-01')
                    }
                    numberOfMonths={2}
                    pagedNavigation
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select name="type" value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                type="text"
                id="category"
                name="category"
                value={filters.category || ''}
                onChange={handleFilterChange}
                placeholder="All Categories"
              />
            </div>
            <div>
              <Label htmlFor="vehicleId">Vehicle ID</Label>
              <Input
                type="text"
                id="vehicleId"
                name="vehicleId"
                value={filters.vehicleId || ''}
                onChange={handleFilterChange}
                placeholder="All Vehicle IDs"
              />
            </div>
          </div>
          <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex flex-col gap-2 pt-6">
              <span className="text-sm font-medium text-muted-foreground">Total Income</span>
              <span className="text-2xl font-bold">
                <IndianRupee className="inline-block h-4 w-4 mr-1" />
                {totalIncome.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-2 pt-6">
              <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
              <span className="text-2xl font-bold">
                <IndianRupee className="inline-block h-4 w-4 mr-1" />
                {totalExpenses.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-2 pt-6">
              <span className="text-sm font-medium text-muted-foreground">Net Balance</span>
              <span className="text-2xl font-bold">
                <IndianRupee className="inline-block h-4 w-4 mr-1" />
                {netBalance.toLocaleString()}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Transactions</h2>
        <Table>
          <TableCaption>A list of your recent transactions.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">No transactions found.</TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'income' ? "outline" : "destructive"}>
                      {transaction.type === 'income' ? (
                        <div className="flex items-center">
                          Income
                          <ArrowUp className="ml-1 h-4 w-4" />
                        </div>
                      ) : (
                        <div className="flex items-center">
                          Expense
                          <ArrowDown className="ml-1 h-4 w-4" />
                        </div>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>{transaction.paymentMethod}</TableCell>
                  <TableCell className="text-right">
                    {transaction.type === 'income' ? '+' : '-'}
                    <IndianRupee className="inline-block h-3 w-3 mr-1" />
                    {transaction.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <IndianRupee className="inline-block h-3 w-3 mr-1" />
                    {transaction.balance.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LedgerPage;
