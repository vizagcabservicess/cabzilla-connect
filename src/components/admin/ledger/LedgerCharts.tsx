
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { CategorySummary, PaymentMethodSummary, LedgerEntry } from '@/services/api/ledgerAPI';

interface LedgerChartsProps {
  categorySummaries: CategorySummary[];
  paymentMethodSummaries: PaymentMethodSummary[];
  recentEntries: LedgerEntry[];
  isLoading?: boolean;
}

export function LedgerCharts({ 
  categorySummaries, 
  paymentMethodSummaries, 
  recentEntries,
  isLoading = false 
}: LedgerChartsProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Colors for pie chart
  const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];
  
  // Generate daily profit/loss data
  const profitLossData = React.useMemo(() => {
    // Group entries by date
    const entriesByDate: Record<string, { income: number, expense: number }> = {};
    
    // Sort entries by date
    const sortedEntries = [...recentEntries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Get only the last 7 dates of data
    const dates = Array.from(new Set(sortedEntries.map(entry => entry.date))).slice(-7);
    
    // Initialize data for each date
    dates.forEach(date => {
      entriesByDate[date] = { income: 0, expense: 0 };
    });
    
    // Populate with actual data
    sortedEntries.forEach(entry => {
      if (!dates.includes(entry.date)) return;
      
      if (entry.type === 'income') {
        entriesByDate[entry.date].income += entry.amount;
      } else {
        entriesByDate[entry.date].expense += entry.amount;
      }
    });
    
    // Convert to array for chart
    return Object.entries(entriesByDate).map(([date, values]) => ({
      date: date.split('-')[2] + '/' + date.split('-')[1], // Format as DD/MM
      income: values.income,
      expense: values.expense,
      profit: values.income - values.expense
    }));
  }, [recentEntries]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Expense Categories Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categorySummaries.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySummaries}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                  nameKey="category"
                >
                  {categorySummaries.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500">No expense data available</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Daily Profit/Loss Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Profit/Loss</CardTitle>
        </CardHeader>
        <CardContent>
          {profitLossData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitLossData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#82ca9d" />
                <Bar dataKey="expense" name="Expense" fill="#ff8042" />
                <Bar dataKey="profit" name="Profit/Loss" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500">No daily profit/loss data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
