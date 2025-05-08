
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ExpenseCategory, ExpenseSummary } from '@/types/ledger';

interface MonthlyBudgetChartProps {
  data: ExpenseSummary;
  categories: ExpenseCategory[];
  monthlyBudget?: number;
}

export function MonthlyBudgetChart({ data, categories, monthlyBudget = 50000 }: MonthlyBudgetChartProps) {
  // Format currency for tooltips
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`;
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

  // Transform data for the chart
  const chartData = data.byCategory.map(category => ({
    name: getCategoryName(category.category),
    amount: category.amount,
    color: getCategoryColor(category.category),
    percentage: category.percentage.toFixed(1),
  }));

  // Sort by amount descending
  chartData.sort((a, b) => b.amount - a.amount);

  // Create a custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="font-semibold">{data.name}</p>
          <p>{formatCurrency(data.amount)}</p>
          <p className="text-sm text-gray-500">{data.percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  // Is over budget?
  const isOverBudget = data.totalAmount > monthlyBudget;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Monthly Expenses by Category</CardTitle>
          <div className="text-sm">
            <span className="font-medium">
              Total: {formatCurrency(data.totalAmount)}
            </span>
            {monthlyBudget && (
              <span className={`ml-2 ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                {isOverBudget ? 'Over budget' : 'Under budget'} by{' '}
                {formatCurrency(Math.abs(data.totalAmount - monthlyBudget))}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={formatCurrency} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {monthlyBudget && (
                  <ReferenceLine
                    x={monthlyBudget}
                    stroke="#ff0000"
                    strokeDasharray="3 3"
                    label={{ value: 'Budget', position: 'insideTopRight' }}
                  />
                )}
                <Bar 
                  dataKey="amount" 
                  name="Amount" 
                  fill="#8884d8"
                  // Use the category color for each bar
                  fill={(entry) => entry.color}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No expense data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
