
import React, { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from "sonner";
import { ExpenseCategory, ExpenseEntry, ExpenseFilter, ExpenseSummary } from '@/types/ledger';
import { expenseAPI } from '@/services/api/expenseAPI';
import { LedgerDateRangePicker } from '@/components/admin/ledger/LedgerDateRangePicker';
import { ExpenseEntryForm } from '@/components/admin/expense/ExpenseEntryForm';
import { ExpenseTable } from '@/components/admin/expense/ExpenseTable';
import { MonthlyBudgetChart } from '@/components/admin/expense/MonthlyBudgetChart';
import { ExpenseAnalytics } from '@/components/admin/expense/ExpenseAnalytics';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ExpensesPage() {
  // Set default date range to current month
  const today = new Date();
  const defaultDateRange = {
    from: startOfMonth(today),
    to: endOfMonth(today)
  };
  
  // State variables
  const [activeView, setActiveView] = useState<string>("expenses");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<ExpenseEntry | undefined>();
  
  // Data state
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  
  // Fetch expense categories
  const fetchCategories = useCallback(async () => {
    try {
      const data = await expenseAPI.fetchExpenseCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load expense categories");
    }
  }, []);
  
  // Fetch expenses based on filters
  const fetchExpenses = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      const filters: ExpenseFilter = {
        dateRange,
        category: undefined,
        status: undefined
      };
      
      // Fetch expenses and summary in parallel
      const [expenseData, summaryData] = await Promise.all([
        expenseAPI.fetchExpenses(filters),
        expenseAPI.getExpenseSummary(dateRange)
      ]);
      
      setExpenses(expenseData);
      setSummary(summaryData);
    } catch (error) {
      console.error("Error fetching expense data:", error);
      toast.error("Failed to load expense data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange]);
  
  // Initial data load
  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, [fetchCategories, fetchExpenses]);
  
  // Apply date range filter
  const handleApplyDateRange = () => {
    fetchExpenses(true);
  };
  
  // Handle expense edit
  const handleEditExpense = (expense: ExpenseEntry) => {
    setCurrentExpense(expense);
    setFormOpen(true);
  };
  
  // Handle expense delete
  const handleDeleteExpense = async (id: string | number) => {
    try {
      const confirmed = window.confirm("Are you sure you want to delete this expense?");
      
      if (confirmed) {
        await expenseAPI.deleteExpense(id);
        fetchExpenses(true);
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };
  
  // Handle add new expense
  const handleAddNew = () => {
    setCurrentExpense(undefined);
    setFormOpen(true);
  };
  
  // Handle expense added/updated
  const handleExpenseAdded = () => {
    fetchExpenses(true);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeView} setActiveTab={setActiveView} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
              <p className="text-gray-500">Track and manage your business expenses</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-end">
              <LedgerDateRangePicker 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onApply={handleApplyDateRange}
                disabled={isLoading}
              />
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" /> New Expense
              </Button>
            </div>
          </div>
          
          {/* Expense Table */}
          <Card>
            <CardContent className="p-6">
              <ExpenseTable 
                data={expenses} 
                isLoading={isLoading || isRefreshing}
                categories={categories}
                onEdit={handleEditExpense}
                onDelete={handleDeleteExpense}
                onAddNew={handleAddNew}
              />
            </CardContent>
          </Card>
          
          {/* Charts and Analytics */}
          {summary && !isLoading && expenses.length > 0 && (
            <div className="space-y-6">
              {/* Monthly Budget Chart */}
              <MonthlyBudgetChart 
                data={summary} 
                categories={categories}
                monthlyBudget={50000} // This could be dynamic
              />
              
              {/* Analytics Charts */}
              <ExpenseAnalytics 
                summary={summary}
                categories={categories}
              />
            </div>
          )}
        </div>
      </main>
      
      {/* Expense Entry Form Dialog */}
      <ExpenseEntryForm 
        open={formOpen}
        onOpenChange={setFormOpen}
        onExpenseAdded={handleExpenseAdded}
        expenseToEdit={currentExpense}
        categories={categories}
      />
    </div>
  );
}
