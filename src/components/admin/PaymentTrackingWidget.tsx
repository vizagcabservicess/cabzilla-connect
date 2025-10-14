import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Search, Filter, TrendingUp, TrendingDown, AlertTriangle, X } from 'lucide-react';
import { getTrackingData } from '@/services/paymentTrackingService';

interface PaymentAttempt {
  id: number;
  booking_id?: number;
  booking_number: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount: number;
  payment_status: 'initiated' | 'successful' | 'failed' | 'cancelled';
  failure_reason?: string;
  failure_code?: string;
  cancellation_reason?: string;
  cancellation_description?: string;
  customer_phone?: string;
  customer_email?: string;
  attempt_timestamp: string;
}

interface PaymentStats {
  total_attempts: number;
  successful: number;
  failed: number;
  cancelled: number;
  total_amount: number;
}

export function PaymentTrackingWidget() {
  const [paymentData, setPaymentData] = useState<PaymentAttempt[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total_attempts: 0,
    successful: 0,
    failed: 0,
    cancelled: 0,
    total_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filters, setFilters] = useState({
    bookingNumber: '',
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    // Add a small delay to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchPaymentData();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const fetchPaymentData = async () => {
    // Prevent infinite retries
    if (retryCount >= 3) {
      setError('Failed to load payment data after multiple attempts');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await getTrackingData();
      
      if (result.status === 'error') {
        console.error('API Error:', result.message);
        setError(result.message || 'Failed to fetch payment data');
        setPaymentData([]);
        calculateStats([]);
        setRetryCount(prev => prev + 1);
        return;
      }
      
      const data = result.data || [];
      setPaymentData(data);
      calculateStats(data);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Failed to fetch payment data:', error);
      setError('Network error: Unable to connect to payment tracking API');
      setPaymentData([]);
      calculateStats([]);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: PaymentAttempt[]) => {
    const stats = {
      total_attempts: data.length,
      successful: data.filter(p => p.payment_status === 'successful').length,
      failed: data.filter(p => p.payment_status === 'failed').length,
      cancelled: data.filter(p => p.payment_status === 'cancelled').length,
      total_amount: data.reduce((sum, p) => sum + p.amount, 0)
    };
    setStats(stats);
  };

  const handleFilter = async () => {
    try {
      setLoading(true);
      let result = await getTrackingData();
      
      if (result.status === 'error') {
        console.error('API Error:', result.message);
        setPaymentData([]);
        calculateStats([]);
        return;
      }
      
      let data = result.data || [];
      
      // Apply filters
      if (filters.bookingNumber) {
        data = data.filter(p => 
          p.booking_number.toLowerCase().includes(filters.bookingNumber.toLowerCase())
        );
      }
      
      if (filters.status && filters.status !== 'all') {
        data = data.filter(p => p.payment_status === filters.status);
      }
      
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        data = data.filter(p => new Date(p.attempt_timestamp) >= fromDate);
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        data = data.filter(p => new Date(p.attempt_timestamp) <= toDate);
      }
      
      setPaymentData(data);
      calculateStats(data);
    } catch (error) {
      console.error('Failed to filter payment data:', error);
      setPaymentData([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      bookingNumber: '',
      status: 'all',
      dateFrom: '',
      dateTo: ''
    });
    fetchPaymentData();
  };

  const exportToCsv = () => {
    const headers = [
      'Booking Number',
      'Amount',
      'Status',
      'Customer Phone',
      'Customer Email',
      'Failure Reason',
      'Cancellation Reason',
      'Attempt Time'
    ];

    const csvContent = [
      headers.join(','),
      ...paymentData.map(payment => [
        payment.booking_number,
        payment.amount,
        payment.payment_status,
        payment.customer_phone || '',
        payment.customer_email || '',
        payment.failure_reason || '',
        payment.cancellation_reason || '',
        new Date(payment.attempt_timestamp).toLocaleString()
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

  const getStatusBadge = (status: string) => {
    const variants = {
      successful: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-yellow-100 text-yellow-800',
      initiated: 'bg-blue-100 text-blue-800'
    };
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading payment data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="text-red-600 mb-4">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
              <p className="text-lg font-medium">Error Loading Payment Data</p>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setRetryCount(0);
                  setError(null);
                  fetchPaymentData();
                }}
                variant="outline"
                size="sm"
              >
                Retry
              </Button>
              <Button 
                onClick={() => {
                  setRetryCount(0);
                  setError(null);
                  setPaymentData([]);
                  calculateStats([]);
                  setLoading(false);
                }}
                variant="outline"
                size="sm"
              >
                Continue Without Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Attempts</p>
                <p className="text-2xl font-bold">{stats.total_attempts}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(stats.total_amount)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Successful</p>
                <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((stats.successful / stats.total_attempts) * 100).toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((stats.failed / stats.total_attempts) * 100).toFixed(1)}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Cancelled</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.cancelled}</p>
              </div>
              <X className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((stats.cancelled / stats.total_attempts) * 100).toFixed(1)}% cancellation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking Number
              </label>
              <Input
                placeholder="Search booking number"
                value={filters.bookingNumber}
                onChange={(e) => setFilters({...filters, bookingNumber: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="successful">Successful</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="initiated">Initiated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button onClick={handleFilter} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Attempts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Attempts ({paymentData.length})</CardTitle>
          <Button onClick={exportToCsv} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {paymentData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payment attempts found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Attempt Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentData.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.booking_number}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.customer_phone}</div>
                          <div className="text-sm text-gray-500">{payment.customer_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.failure_reason && (
                          <div className="text-sm text-red-600">
                            {payment.failure_reason}
                          </div>
                        )}
                        {payment.cancellation_reason && (
                          <div className="text-sm text-yellow-600">
                            {payment.cancellation_reason}
                          </div>
                        )}
                        {payment.payment_status === 'successful' && (
                          <div className="text-sm text-green-600">
                            Payment completed
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(payment.attempt_timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
