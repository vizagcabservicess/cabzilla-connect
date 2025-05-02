
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
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ReportRevenueTableProps {
  data: any[];
  withGst?: boolean;
}

export const ReportRevenueTable: React.FC<ReportRevenueTableProps> = ({ data, withGst = false }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">No revenue data available for the selected period.</p>
      </div>
    );
  }

  // Check if this is a summary or detailed report
  const isSummary = data.length === 1 && data[0].totalRevenue !== undefined;

  if (isSummary) {
    const summary = data[0];
    const { totalRevenue, revenueByTripType, dailyRevenue, gstSummary } = summary;

    // Format data for charts
    const tripTypeChartData = revenueByTripType ? 
      Object.entries(revenueByTripType).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
        value: value as number
      })) : [];

    // Format daily revenue data for the chart
    const revenueChartData = dailyRevenue ? 
      dailyRevenue.map((day: any) => ({
        date: format(new Date(day.date), 'dd MMM'),
        revenue: day.total,
      })) : [];

    return (
      <div className="space-y-6">
        {/* Revenue Overview Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
                <div className="text-2xl font-bold mt-1">₹{totalRevenue.toLocaleString()}</div>
              </div>

              {withGst && gstSummary && (
                <>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">Taxable Amount (GST)</div>
                    <div className="text-2xl font-bold mt-1">₹{gstSummary.taxableAmount.toLocaleString()}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">GST Amount ({gstSummary.gstRate})</div>
                    <div className="text-2xl font-bold mt-1">₹{gstSummary.gstAmount.toLocaleString()}</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Revenue Chart */}
        {revenueChartData && revenueChartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Daily Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revenue by Trip Type Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Revenue by Trip Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip Type</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(revenueByTripType || {}).map(([tripType, revenue]) => (
                  <TableRow key={tripType}>
                    <TableCell className="font-medium">
                      {tripType.charAt(0).toUpperCase() + tripType.slice(1).replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-right">₹{(revenue as number).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* GST Summary Section if GST data is available */}
        {withGst && gstSummary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">GST Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Taxable Amount</TableCell>
                    <TableCell className="text-right">₹{gstSummary.taxableAmount.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>GST Rate</TableCell>
                    <TableCell className="text-right">{gstSummary.gstRate}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>GST Amount</TableCell>
                    <TableCell className="text-right">₹{gstSummary.gstAmount.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold">Total with GST</TableCell>
                    <TableCell className="text-right font-bold">₹{gstSummary.totalWithGst.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } else {
    // Detailed revenue report view
    return (
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Date</TableHead>
              {withGst && (
                <>
                  <TableHead className="text-right">Taxable Value</TableHead>
                  <TableHead className="text-center">GST</TableHead>
                  <TableHead className="text-right">GST Amount</TableHead>
                </>
              )}
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((transaction: any) => {
              // Calculate GST amount if withGst is true
              const gstAmount = withGst && transaction.gst_amount ? 
                transaction.gst_amount : 
                (withGst ? transaction.taxable_value * 0.05 : 0);
              
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.booking_number}</TableCell>
                  <TableCell>{transaction.passenger_name || 'N/A'}</TableCell>
                  <TableCell>{transaction.passenger_phone || 'N/A'}</TableCell>
                  <TableCell>
                    {transaction.created_at ? 
                      format(new Date(transaction.created_at), 'dd MMM yyyy') : 
                      'N/A'
                    }
                  </TableCell>
                  {withGst && (
                    <>
                      <TableCell className="text-right">
                        ₹{(transaction.taxable_value || transaction.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {transaction.gst_rate || '5%'}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{gstAmount.toLocaleString()}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right">₹{Number(transaction.total_amount).toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }
};
