import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Users, Clock, CreditCard, Download, Share, Search, Filter, AlertCircle } from 'lucide-react';
import { bookingAPI } from '@/services/api/bookingAPI';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';
import { BookingInvoice } from './BookingInvoice';
import { BookingShare } from './BookingShare';

interface Booking {
  id: number;
  booking_id: string;
  pickup_location: string;
  drop_location: string;
  pickup_date: string;
  pickup_time: string;
  vehicle_type: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_amount: number;
  extra_charges?: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
  payment_method?: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
}

export function BookingList() {
  const { user } = usePoolingAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [user]);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  const fetchBookings = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const data = await bookingAPI.getUserBookings(user.id);
      const bookingList = Array.isArray(data) ? data : data?.bookings || [];
      setBookings(bookingList);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.booking_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.pickup_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.drop_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.vehicle_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(booking => 
            new Date(booking.pickup_date) >= filterDate &&
            new Date(booking.pickup_date) < new Date(filterDate.getTime() + 24 * 60 * 60 * 1000)
          );
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(booking => new Date(booking.pickup_date) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(booking => new Date(booking.pickup_date) >= filterDate);
          break;
      }
    }

    setFilteredBookings(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Calendar className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'completed':
        return <CreditCard className="h-3 w-3" />;
      case 'cancelled':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  const handleDownloadInvoice = (booking: Booking) => {
    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      toast.error('Invoice is only available for confirmed bookings');
      return;
    }
    setSelectedBooking(booking);
    setShowInvoice(true);
  };

  const handleShareBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowShare(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>My Bookings</span>
            <Badge variant="secondary">{filteredBookings.length} bookings</Badge>
          </CardTitle>
          
          {/* Search and Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                {bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filters'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {bookings.length === 0 
                  ? 'Start your journey by creating your first booking'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {bookings.length === 0 && (
                <Button onClick={() => window.location.href = '/'}>
                  Create Booking
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-4 space-y-4 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status}</span>
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        #{booking.booking_id}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">₹{booking.total_amount?.toLocaleString()}</div>
                      {booking.extra_charges && booking.extra_charges.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          +₹{booking.extra_charges.reduce((sum, charge) => sum + charge.amount, 0)} extra
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Trip Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{booking.pickup_location}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{booking.drop_location}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(booking.pickup_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{booking.pickup_time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{booking.vehicle_type}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Extra Charges */}
                  {booking.extra_charges && booking.extra_charges.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <h4 className="text-sm font-medium mb-2">Extra Charges</h4>
                      <div className="space-y-1">
                        {booking.extra_charges.map((charge, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {charge.type}: {charge.description}
                            </span>
                            <span>₹{charge.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareBooking(booking)}
                      className="flex-1"
                    >
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    
                    {(booking.status === 'confirmed' || booking.status === 'completed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(booking)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Invoice
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Modal */}
      {showInvoice && selectedBooking && (
        <BookingInvoice
          booking={selectedBooking}
          onClose={() => {
            setShowInvoice(false);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* Share Modal */}
      {showShare && selectedBooking && (
        <BookingShare
          booking={selectedBooking}
          onClose={() => {
            setShowShare(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </>
  );
}