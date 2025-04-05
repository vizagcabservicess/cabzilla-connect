
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bookingAPI } from '@/services/api';
import { toast } from 'sonner';

interface Booking {
  id: string;
  pickup: string;
  dropoff: string;
  date: string;
  vehicle: string;
  status: string;
  amount: number;
  user_id: string;
  customer_name?: string;
  customer_phone?: string;
  created_at?: string;
}

export const BookingsManagement = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAllBookings();
      if (Array.isArray(data)) {
        setBookings(data);
      } else {
        console.error('Invalid booking data format:', data);
        setBookings([]);
        toast.error('Failed to load bookings: Invalid data format');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
      
      // Mock data for preview mode
      setBookings([
        { 
          id: '1', 
          pickup: 'Airport', 
          dropoff: 'City Center', 
          date: new Date().toISOString(),
          vehicle: 'Sedan',
          status: 'completed',
          amount: 1200,
          user_id: '1',
          customer_name: 'John Doe',
          customer_phone: '9876543210',
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        { 
          id: '2', 
          pickup: 'Hotel', 
          dropoff: 'Shopping Mall', 
          date: new Date(Date.now() + 86400000).toISOString(),
          vehicle: 'SUV',
          status: 'pending',
          amount: 800,
          user_id: '2',
          customer_name: 'Jane Smith',
          customer_phone: '8765432109',
          created_at: new Date(Date.now() - 172800000).toISOString()
        },
        { 
          id: '3', 
          pickup: 'Residential Area', 
          dropoff: 'Beach Resort', 
          date: new Date(Date.now() + 172800000).toISOString(),
          vehicle: 'Luxury',
          status: 'confirmed',
          amount: 1500,
          user_id: '3',
          customer_name: 'Robert Johnson',
          customer_phone: '7654321098',
          created_at: new Date(Date.now() - 259200000).toISOString()
        },
        { 
          id: '4', 
          pickup: 'Conference Center', 
          dropoff: 'Airport', 
          date: new Date(Date.now() - 86400000).toISOString(),
          vehicle: 'Tempo',
          status: 'cancelled',
          amount: 2000,
          user_id: '4',
          customer_name: 'Alice Brown',
          customer_phone: '6543210987',
          created_at: new Date(Date.now() - 345600000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await bookingAPI.updateBookingStatus(bookingId, newStatus);
      toast.success(`Booking status updated to ${newStatus}`);
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId ? {...booking, status: newStatus} : booking
      ));
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const deleteBooking = async (bookingId: string) => {
    try {
      await bookingAPI.deleteBooking(bookingId);
      toast.success('Booking deleted successfully');
      
      // Update local state
      setBookings(bookings.filter(booking => booking.id !== bookingId));
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    }
  };

  const getFilteredBookings = () => {
    switch (activeTab) {
      case 'pending':
        return bookings.filter(b => b.status === 'pending');
      case 'confirmed':
        return bookings.filter(b => b.status === 'confirmed');
      case 'completed':
        return bookings.filter(b => b.status === 'completed');
      case 'cancelled':
        return bookings.filter(b => b.status === 'cancelled');
      default:
        return bookings;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Booking Management</h2>
        <Button onClick={fetchBookings} variant="outline">Refresh</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="all">
            All ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({bookings.filter(b => b.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmed ({bookings.filter(b => b.status === 'confirmed').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({bookings.filter(b => b.status === 'completed').length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({bookings.filter(b => b.status === 'cancelled').length})
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="py-10 text-center">Loading bookings...</div>
        ) : getFilteredBookings().length === 0 ? (
          <div className="py-10 text-center">No bookings found.</div>
        ) : (
          <TabsContent value={activeTab} className="mt-0">
            <div className="space-y-4">
              {getFilteredBookings().map(booking => (
                <Card key={booking.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{booking.pickup} → {booking.dropoff}</CardTitle>
                        <div className="text-sm text-gray-500">
                          {new Date(booking.date).toLocaleDateString()} | {booking.vehicle} | ID: {booking.id}
                        </div>
                        <div className="text-sm mt-1">
                          <span className="font-medium">{booking.customer_name}</span> 
                          {booking.customer_phone && <span> • {booking.customer_phone}</span>}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded text-sm font-medium ${
                        booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="font-bold">₹{booking.amount.toLocaleString()}</div>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/bookings/${booking.id}`}>View Details</a>
                        </Button>
                        
                        {booking.status === 'pending' && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => updateStatus(booking.id, 'confirmed')}
                          >
                            Confirm
                          </Button>
                        )}
                        
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => updateStatus(booking.id, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                        
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => updateStatus(booking.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        )}
                        
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => deleteBooking(booking.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default BookingsManagement;
