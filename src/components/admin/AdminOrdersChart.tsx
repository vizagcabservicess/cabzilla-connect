
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminOrdersChartProps {
  data?: { month: string; orders: number; revenue: number }[];
}

export function AdminOrdersChart({ data }: AdminOrdersChartProps) {
  const chartData = data || [
    { month: 'Jan', orders: 0, revenue: 0 },
    { month: 'Feb', orders: 0, revenue: 0 },
    { month: 'Mar', orders: 0, revenue: 0 },
    { month: 'Apr', orders: 0, revenue: 0 },
    { month: 'May', orders: 0, revenue: 0 },
    { month: 'Jun', orders: 0, revenue: 0 }
  ];

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Bar dataKey="orders" fill="#3b82f6" yAxisId="left" name="Orders" />
          <Bar dataKey="revenue" fill="#10b981" yAxisId="right" name="Revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
