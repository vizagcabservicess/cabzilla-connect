import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  LogOut, 
  Search, 
  Filter, 
  Calendar, 
  Car, 
  MapPin, 
  Download, 
  Share, 
  Clock,
  Plus,
  Copy,
  Mail,
  MessageCircle
} from "lucide-react";
import { bookingAPI } from '@/services/api';
import { authAPI } from '@/services/api/authAPI';
import { Booking } from '@/types/api';
import { BookingInvoice } from './BookingInvoice';
import { BookingShare } from './BookingShare';

interface GuestDashboardProps {
  user: any;
  onLogout: () => void;
}

function GuestDashboard({ user, onLogout }: GuestDashboardProps) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Fetch real bookings from API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        
        if (!user?.id) {
          console.warn('No user ID available');
          setBookings([]);
          setFilteredBookings([]);
          return;
        }

        // Fetch user bookings from API
        const userBookings = await bookingAPI.getUserBookings(user.id);
        
        // Transform API response to match component expectations
        const transformedBookings = userBookings.map((booking: any) => ({
          id: booking.id || booking.booking_id,
          bookingNumber: booking.booking_number || booking.bookingNumber || booking.id,
          pickupLocation: booking.pickup_location || booking.pickupLocation,
          dropLocation: booking.drop_location || booking.dropLocation,
          pickupDate: booking.pickup_date || booking.pickupDate,
          pickupTime: booking.pickup_time || booking.pickupTime,
          passengerName: booking.passenger_name || booking.passengerName || booking.guest_name || booking.name,
          passengerPhone: booking.passenger_phone || booking.passengerPhone || booking.guest_phone,
          passengerEmail: booking.passenger_email || booking.passengerEmail || booking.guest_email,
          tripType: booking.trip_type || booking.tripType,
          tripMode: booking.trip_mode || booking.tripMode,
          returnDate: booking.return_date || booking.returnDate,
          cabType: booking.cab_type || booking.cabType || booking.vehicle_type || booking.vehicleType,
          vehicleType: booking.vehicle_type || booking.vehicleType || booking.cab_type || booking.cabType,
          totalAmount: booking.total_amount || booking.totalAmount || booking.fare || 0,
          status: booking.status,
          payment_status: booking.payment_status || booking.paymentStatus || 'pending',
          driverName: booking.driver_name || booking.driverName,
          driverPhone: booking.driver_phone || booking.driverPhone,
          vehicleNumber: booking.vehicle_number || booking.vehicleNumber,
          extraCharges: booking.extra_charges || booking.extraCharges || {},
          createdAt: booking.created_at || booking.createdAt,
          updatedAt: booking.updated_at || booking.updatedAt
        }));
        
        setBookings(transformedBookings);
        setFilteredBookings(transformedBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        toast.error('Failed to load bookings');
        // Set empty arrays on error
        setBookings([]);
        setFilteredBookings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [user?.id]);

  // Filter bookings based on search and status
  useEffect(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.dropLocation.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleDownloadInvoice = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowInvoice(true);
  };

  const handleShareBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowShare(true);
  };

  const calculateTotal = (booking: Booking) => {
    const extraTotal = Object.values(booking.extraCharges || {}).reduce((sum, charge) => sum + (Number(charge) || 0), 0);
    return booking.totalAmount + extraTotal;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-48" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <h2 className="text-xl font-semibold text-muted-foreground mt-1">
            Welcome back, {user.name}
          </h2>
          <div className="text-sm text-muted-foreground mt-1">Role: Guest</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => navigate('/')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Booking
          </Button>
          <Button variant="outline" onClick={onLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by booking ID, pickup, or drop location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
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
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Your Bookings ({filteredBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {bookings.length === 0 ? 'No bookings yet' : 'No bookings found'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {bookings.length === 0 
                  ? 'You do not have any bookings yet. Create your first booking to get started.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {bookings.length === 0 && (
                <Button onClick={() => navigate('/')} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Booking
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredBookings.map((booking, index) => (
                  <div key={booking.id}>
                    <div className="flex flex-col lg:flex-row gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                      {/* Booking Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(booking.status)}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Booking #{booking.bookingNumber}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div className="text-sm">
                              <div className="font-medium">{booking.pickupLocation}</div>
                              <div className="text-muted-foreground">→ {booking.dropLocation}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatDate(booking.pickupDate)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Car className="h-4 w-4" />
                              {booking.cabType}
                            </div>
                          </div>

                          {booking.driverName && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Driver: </span>
                              <span className="font-medium">{booking.driverName}</span>
                              {booking.vehicleNumber && (
                                <span className="text-muted-foreground"> • {booking.vehicleNumber}</span>
                              )}
                            </div>
                          )}

                          {/* Extra Charges */}
                          {booking.extraCharges && Object.keys(booking.extraCharges).length > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Extra charges: </span>
                              <div className="mt-1 space-y-1">
                                {Object.entries(booking.extraCharges).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground capitalize">
                                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                                    </span>
                                    <span>₹{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amount and Actions */}
                      <div className="flex flex-col items-end justify-between">
                        <div className="text-right">
                          <div className="text-2xl font-bold">₹{calculateTotal(booking).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.payment_status === 'paid' ? 'Paid' : 
                             booking.payment_status === 'partial' ? 'Partial' :
                             booking.payment_status === 'refunded' ? 'Refunded' : 'Pending'}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          {booking.status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadInvoice(booking)}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Invoice
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShareBooking(booking)}
                            className="flex items-center gap-1"
                          >
                            <Share className="h-3 w-3" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </div>
                    {index < filteredBookings.length - 1 && <Separator className="my-4" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Invoice Modal */}
      {selectedBooking && (
        <BookingInvoice
          booking={selectedBooking}
          user={user}
          isOpen={showInvoice}
          onClose={() => {
            setShowInvoice(false);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* Share Modal */}
      {selectedBooking && (
        <BookingShare
          booking={selectedBooking}
          isOpen={showShare}
          onClose={() => {
            setShowShare(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
}

export default GuestDashboard;