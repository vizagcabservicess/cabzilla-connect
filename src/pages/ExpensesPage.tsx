import React, { useState, useEffect, useCallback } from 'react';
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
import AdminLayout from "@/components/admin/AdminLayout";

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
    <AdminLayout activeTab="expenses">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">Expense Management</h1>
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
            {expenses.length > 0 ? (
              <ExpenseTable 
                data={expenses} 
                isLoading={isLoading || isRefreshing}
                categories={categories}
                onEdit={handleEditExpense}
                onDelete={handleDeleteExpense}
                onAddNew={handleAddNew}
              />
            ) : (
              // Show all categories if there are no expenses
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Expense Categories</span>
                  <Button onClick={handleAddNew}>
                    <Plus className="h-4 w-4 mr-2" /> Add Expense
                  </Button>
                </div>
                {categories.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categories.map(category => (
                          <tr key={category.id}>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{category.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{category.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-block w-6 h-6 rounded-full border" style={{ backgroundColor: category.color || '#6B7280', borderColor: category.color || '#6B7280' }}></span>
                              <span className="ml-2 text-xs text-gray-500">{category.color}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">No categories found.</div>
                )}
              </div>
            )}
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
      
      {/* Expense Entry Form Dialog */}
      <ExpenseEntryForm 
        open={formOpen}
        onOpenChange={setFormOpen}
        onExpenseAdded={handleExpenseAdded}
        expenseToEdit={currentExpense}
        categories={categories}
      />
    </AdminLayout>
  );
}
