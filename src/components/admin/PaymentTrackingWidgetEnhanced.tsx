import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Download, Search, Filter, TrendingUp, TrendingDown, AlertTriangle, X, Trash2, Eye, MapPin, Car, User, Phone, Mail } from 'lucide-react';
import { getTrackingData, deletePaymentAttempt } from '@/services/paymentTrackingService';
import { toast } from 'sonner';

interface BookingDetails {
  pickup_location?: string;
  drop_location?: string;
  pickup_date?: string;
  return_date?: string;
  cab_type?: string;
  distance?: number;
  trip_type?: string;
  trip_mode?: string;
  total_amount?: number;
  passenger_name?: string;
  passenger_phone?: string;
  passenger_email?: string;
  tour_id?: string;
  tour_name?: string;
  booking_created_at?: string;
}

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
  customer_phone?: string;
  customer_email?: string;
  attempt_timestamp: string;
  booking_details?: BookingDetails;
}

interface PaymentStats {
  total_attempts: number;
  successful: number;
  failed: number;
  cancelled: number;
  total_amount: number;
}

export function PaymentTrackingWidgetEnhanced() {
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
  const [selectedPayment, setSelectedPayment] = useState<PaymentAttempt | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
  }, [retryCount]);

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
      setRetryCount(0);
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
      total_amount: data.reduce((sum, p) => sum + (p.amount || 0), 0)
    };
    setStats(stats);
  };

  const handleDelete = async (paymentId: number) => {
    if (!confirm('Are you sure you want to delete this payment attempt? This action cannot be undone.')) {
      return;
    }

    setDeletingId(paymentId);
    try {
      const result = await deletePaymentAttempt(paymentId);
      
      if (result.status === 'success') {
        toast.success('Payment attempt deleted successfully');
        // Remove the deleted item from the list
        setPaymentData(prev => prev.filter(p => p.id !== paymentId));
        calculateStats(paymentData.filter(p => p.id !== paymentId));
      } else {
        toast.error(result.message || 'Failed to delete payment attempt');
      }
    } catch (error) {
      console.error('Error deleting payment attempt:', error);
      toast.error('Failed to delete payment attempt');
    } finally {
      setDeletingId(null);
    }
  };

  const showBookingDetailsModal = (payment: PaymentAttempt) => {
    setSelectedPayment(payment);
    setShowBookingDetails(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      successful: 'default',
      failed: 'destructive',
      cancelled: 'secondary',
      initiated: 'outline'
    } as const;

    const colors = {
      successful: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-yellow-100 text-yellow-800',
      initiated: 'bg-blue-100 text-blue-800'
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const filteredData = paymentData.filter(payment => {
    const matchesBookingNumber = payment.booking_number.toLowerCase().includes(filters.bookingNumber.toLowerCase());
    const matchesStatus = filters.status === 'all' || payment.payment_status === filters.status;
    
    let matchesDate = true;
    if (filters.dateFrom) {
      const paymentDate = new Date(payment.attempt_timestamp);
      const fromDate = new Date(filters.dateFrom);
      matchesDate = matchesDate && paymentDate >= fromDate;
    }
    if (filters.dateTo) {
      const paymentDate = new Date(payment.attempt_timestamp);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && paymentDate <= toDate;
    }

    return matchesBookingNumber && matchesStatus && matchesDate;
  });

  const clearFilters = () => {
    setFilters({
      bookingNumber: '',
      status: 'all',
      dateFrom: '',
      dateTo: ''
    });
    fetchPaymentData();
  };

  const exportData = () => {
    const csvContent = [
      ['ID', 'Booking Number', 'Amount', 'Status', 'Customer Phone', 'Customer Email', 'Timestamp', 'Pickup Location', 'Drop Location', 'Trip Type', 'Cab Type'].join(','),
      ...filteredData.map(payment => [
        payment.id,
        payment.booking_number,
        payment.amount,
        payment.payment_status,
        payment.customer_phone || '',
        payment.customer_email || '',
        payment.attempt_timestamp,
        payment.booking_details?.pickup_location || '',
        payment.booking_details?.drop_location || '',
        payment.booking_details?.trip_type || '',
        payment.booking_details?.cab_type || ''
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
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Attempts</p>
                <p className="text-2xl font-bold">{stats.total_attempts}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.cancelled}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Actions
            </span>
            <div className="flex gap-2">
              <Button onClick={exportData} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={fetchPaymentData} variant="outline" size="sm" disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Booking Number</label>
              <Input
                placeholder="Search booking number..."
                value={filters.bookingNumber}
                onChange={(e) => setFilters({...filters, bookingNumber: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
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
              <label className="block text-sm font-medium mb-2">From Date</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button onClick={clearFilters} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
            <p className="text-sm text-gray-600">
              Showing {filteredData.length} of {paymentData.length} records
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No payment attempts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Booking Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.id}</TableCell>
                      <TableCell className="font-medium">{payment.booking_number}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {payment.customer_phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {payment.customer_phone}
                            </div>
                          )}
                          {payment.customer_email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {payment.customer_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(payment.attempt_timestamp)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {payment.booking_details && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => showBookingDetailsModal(payment)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(payment.id)}
                            disabled={deletingId === payment.id}
                          >
                            {deletingId === payment.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Modal */}
      <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Booking Details - {selectedPayment?.booking_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPayment?.booking_details && (
            <div className="space-y-6">
              {/* Trip Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Trip Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Pickup:</strong> {selectedPayment.booking_details.pickup_location}</div>
                    <div><strong>Drop:</strong> {selectedPayment.booking_details.drop_location}</div>
                    <div><strong>Date:</strong> {selectedPayment.booking_details.pickup_date}</div>
                    {selectedPayment.booking_details.return_date && (
                      <div><strong>Return:</strong> {selectedPayment.booking_details.return_date}</div>
                    )}
                    <div><strong>Trip Type:</strong> {selectedPayment.booking_details.trip_type}</div>
                    <div><strong>Mode:</strong> {selectedPayment.booking_details.trip_mode}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Vehicle & Pricing
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Cab Type:</strong> {selectedPayment.booking_details.cab_type}</div>
                    <div><strong>Distance:</strong> {selectedPayment.booking_details.distance} km</div>
                    <div><strong>Total Amount:</strong> {formatCurrency(selectedPayment.booking_details.total_amount || 0)}</div>
                    {selectedPayment.booking_details.tour_name && (
                      <div><strong>Tour:</strong> {selectedPayment.booking_details.tour_name}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div><strong>Name:</strong> {selectedPayment.booking_details.passenger_name}</div>
                  <div><strong>Phone:</strong> {selectedPayment.booking_details.passenger_phone}</div>
                  <div><strong>Email:</strong> {selectedPayment.booking_details.passenger_email}</div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="font-semibold mb-3">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong>Payment Status:</strong> {getStatusBadge(selectedPayment.payment_status)}</div>
                  <div><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</div>
                  <div><strong>Attempt Time:</strong> {formatDate(selectedPayment.attempt_timestamp)}</div>
                  {selectedPayment.cancellation_reason && (
                    <div><strong>Cancellation Reason:</strong> {selectedPayment.cancellation_reason}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}





















