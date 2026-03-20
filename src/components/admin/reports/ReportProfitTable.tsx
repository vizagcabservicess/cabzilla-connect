import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export interface ProfitReportData {
  kpis?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    totalTrips: number;
    avgRevenuePerTrip: number;
  };
  dailyChart?: { date: string; revenue: number; expense: number; profit: number }[];
  revenueBreakdown?: Record<string, number>;
  expenseBreakdown?: Record<string, number>;
  vehicleProfit?: { vehicle: string; vehicleId: string | number; revenue: number; expense: number; profit: number }[];
  driverProfit?: { driver: string; driverId: string | number; trips: number; revenue: number; expense: number; profit: number }[];
  areaReport?: { area: string; trips: number; revenue: number }[];
  todaySnapshot?: { revenue: number; expense: number; profit: number };
  filters?: { vehicles: { id: string | number; name: string }[]; drivers: { id: string | number; name: string }[]; serviceTypes: string[] };
}

interface ReportProfitTableProps {
  data: ProfitReportData | null;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
}

const formatCurrency = (amount: number) => {
  return `₹${(amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export function ReportProfitTable({ data }: ReportProfitTableProps) {
  const kpis = data?.kpis ?? { totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0, totalTrips: 0, avgRevenuePerTrip: 0 };
  const dailyChart = data?.dailyChart ?? [];
  const revenueBreakdown = data?.revenueBreakdown ?? { Local: 0, Outstation: 0, Airport: 0, Packages: 0 };
  const expenseBreakdown = data?.expenseBreakdown ?? { Fuel: 0, 'Driver Payments': 0, Maintenance: 0, Toll: 0, Other: 0 };
  const vehicleProfit = data?.vehicleProfit ?? [];
  const driverProfit = data?.driverProfit ?? [];
  const areaReport = data?.areaReport ?? [];
  const todaySnapshot = data?.todaySnapshot ?? { revenue: 0, expense: 0, profit: 0 };

  const revenueBreakdownArr = Object.entries(revenueBreakdown).map(([name, value]) => ({ name, value }));
  const expenseBreakdownArr = Object.entries(expenseBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(kpis.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm font-medium text-muted-foreground">Total Expenses</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(kpis.totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm font-medium text-muted-foreground">Net Profit</div>
            <div className={`text-2xl font-bold mt-1 ${kpis.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(kpis.netProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm font-medium text-muted-foreground">Profit Margin</div>
            <div className={`text-2xl font-bold mt-1 ${kpis.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {kpis.profitMargin}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm font-medium text-muted-foreground">Total Trips</div>
            <div className="text-2xl font-bold mt-1">{kpis.totalTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm font-medium text-muted-foreground">Avg Revenue/Trip</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(kpis.avgRevenuePerTrip)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Today Snapshot */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Today&apos;s Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Revenue</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(todaySnapshot.revenue)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Expense</div>
              <div className="text-xl font-bold text-red-600">{formatCurrency(todaySnapshot.expense)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Profit</div>
              <div className={`text-xl font-bold ${todaySnapshot.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(todaySnapshot.profit)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Chart */}
      {dailyChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Revenue, Expenses & Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyChart.map(d => ({ ...d, date: format(new Date(d.date), 'dd MMM') }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `₹${v >= 1000 ? (v/1000) + 'k' : v}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(label) => label} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {revenueBreakdownArr.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <span className="text-sm">{item.name}</span>
                  <span className="font-medium text-green-600">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenseBreakdownArr.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <span className="text-sm">{item.name}</span>
                  <span className="font-medium text-red-600">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle-wise Profit Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vehicle-wise Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expense</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleProfit.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No vehicle data</TableCell>
                  </TableRow>
                ) : (
                  vehicleProfit.map((row) => (
                    <TableRow key={row.vehicleId}>
                      <TableCell className="font-medium">{row.vehicle}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(row.revenue)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(row.expense)}</TableCell>
                      <TableCell className={`text-right font-medium ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(row.profit)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Driver-wise Profit Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Driver-wise Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expense</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driverProfit.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No driver data</TableCell>
                  </TableRow>
                ) : (
                  driverProfit.map((row) => (
                    <TableRow key={row.driverId}>
                      <TableCell className="font-medium">{row.driver}</TableCell>
                      <TableCell className="text-right">{row.trips}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(row.revenue)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(row.expense)}</TableCell>
                      <TableCell className={`text-right font-medium ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(row.profit)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Area-wise Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Area-wise Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areaReport.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No area data</TableCell>
                  </TableRow>
                ) : (
                  areaReport.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.area}</TableCell>
                      <TableCell className="text-right">{row.trips}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(row.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
