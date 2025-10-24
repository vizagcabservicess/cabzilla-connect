import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { paymentTrackingService } from '@/services/paymentTrackingService';
import AdminLayout from '@/components/admin/AdminLayout';
import { Search, Filter, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentAttempt {
  id: number;
  booking_id: number;
  booking_number: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount: number;
  currency: string;
  payment_status: 'initiated' | 'failed' | 'cancelled' | 'successful';
  failure_reason?: string;
  cancellation_reason?: string;
  payment_method?: string;
  customer_phone?: string;
  customer_email?: string;
  attempt_timestamp: string;
  failure_timestamp?: string;
  cancellation_timestamp?: string;
  created_at: string;
  updated_at: string;
}

const PaymentTrackingPage = () => {
  const [paymentAttempts, setPaymentAttempts] = useState<PaymentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const fetchPaymentData = async () => {
    setIsLoading(true);
    try {
      const result = await paymentTrackingService.getTrackingData();
      if (result.status === 'success') {
        setPaymentAttempts(result.data || []);
      } else {
        toast.error('Failed to fetch payment tracking data');
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Error fetching payment tracking data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const filteredAttempts = paymentAttempts.filter(attempt => {
    const matchesSearch = 
      attempt.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attempt.customer_phone?.includes(searchTerm) ||
      attempt.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || attempt.payment_status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const attemptDate = new Date(attempt.attempt_timestamp);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = attemptDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = attemptDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = attemptDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      initiated: { color: 'bg-blue-100 text-blue-800', label: 'Initiated' },
      successful: { color: 'bg-green-100 text-green-800', label: 'Success' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      cancelled: { color: 'bg-yellow-100 text-yellow-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.initiated;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const exportData = () => {
    const csvContent = [
      ['Booking ID', 'Booking Number', 'Amount', 'Status', 'Customer Phone', 'Customer Email', 'Attempt Time', 'Failure/Cancellation Reason'].join(','),
      ...filteredAttempts.map(attempt => [
        attempt.booking_id,
        attempt.booking_number,
        attempt.amount,
        attempt.payment_status,
        attempt.customer_phone || '',
        attempt.customer_email || '',
        attempt.attempt_timestamp,
        attempt.failure_reason || attempt.cancellation_reason || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-tracking-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    total: paymentAttempts.length,
    successful: paymentAttempts.filter(a => a.payment_status === 'successful').length,
    failed: paymentAttempts.filter(a => a.payment_status === 'failed').length,
    cancelled: paymentAttempts.filter(a => a.payment_status === 'cancelled').length,
    totalAmount: paymentAttempts.reduce((sum, a) => sum + a.amount, 0)
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Tracking</h1>
            <p className="text-gray-600 mt-1">Monitor payment attempts, failures, and cancellations</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchPaymentData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Attempts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalAmount)}</div>
              <div className="text-sm text-gray-600">Total Amount</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Booking number, phone, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="initiated">Initiated</SelectItem>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Date Range</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchPaymentData} disabled={isLoading} className="w-full">
                  <Filter className="w-4 h-4 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Attempts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Attempts ({filteredAttempts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Booking</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Customer</th>
                      <th className="text-left p-3 font-medium">Attempt Time</th>
                      <th className="text-left p-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttempts.map((attempt) => (
                      <tr key={attempt.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{attempt.booking_number}</div>
                            <div className="text-sm text-gray-500">ID: {attempt.booking_id}</div>
                          </div>
                        </td>
                        <td className="p-3 font-medium">
                          {formatCurrency(attempt.amount)}
                        </td>
                        <td className="p-3">
                          {getStatusBadge(attempt.payment_status)}
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="text-sm">{attempt.customer_phone || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{attempt.customer_email || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {formatDateTime(attempt.attempt_timestamp)}
                        </td>
                        <td className="p-3 text-sm text-gray-600 max-w-xs truncate">
                          {attempt.failure_reason || attempt.cancellation_reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAttempts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No payment attempts found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default PaymentTrackingPage;


















