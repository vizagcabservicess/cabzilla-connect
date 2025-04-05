
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const data = await bookingAPI.getUserBookings();
        setBookings(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        toast.error('Failed to fetch bookings');
        setBookings([
          { 
            id: '1', 
            pickup: 'Airport', 
            dropoff: 'City Center', 
            date: new Date().toISOString(),
            vehicle: 'Sedan',
            status: 'completed',
            amount: 1200,
            user_id: '1'
          },
          { 
            id: '2', 
            pickup: 'Hotel', 
            dropoff: 'Shopping Mall', 
            date: new Date(Date.now() + 86400000).toISOString(),
            vehicle: 'SUV',
            status: 'pending',
            amount: 800,
            user_id: '1'
          },
          { 
            id: '3', 
            pickup: 'Residential Area', 
            dropoff: 'Beach Resort', 
            date: new Date(Date.now() + 172800000).toISOString(),
            vehicle: 'Luxury',
            status: 'confirmed',
            amount: 1500,
            user_id: '1'
          },
          { 
            id: '4', 
            pickup: 'Conference Center', 
            dropoff: 'Airport', 
            date: new Date(Date.now() - 86400000).toISOString(),
            vehicle: 'Tempo',
            status: 'cancelled',
            amount: 2000,
            user_id: '1'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter(b => b.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter(b => b.status === 'cancelled').length}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {renderBookingList(bookings, loading)}
        </TabsContent>
        
        <TabsContent value="upcoming">
          {renderBookingList(
            bookings.filter(b => ['pending', 'confirmed'].includes(b.status)),
            loading
          )}
        </TabsContent>
        
        <TabsContent value="completed">
          {renderBookingList(
            bookings.filter(b => b.status === 'completed'),
            loading
          )}
        </TabsContent>
        
        <TabsContent value="cancelled">
          {renderBookingList(
            bookings.filter(b => b.status === 'cancelled'),
            loading
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function renderBookingList(bookings: Booking[], loading: boolean) {
  if (loading) {
    return <div className="py-8 text-center">Loading bookings...</div>;
  }
  
  if (!bookings.length) {
    return <div className="py-8 text-center">No bookings found.</div>;
  }
  
  return (
    <div className="space-y-4 mt-4">
      {bookings.map(booking => (
        <Card key={booking.id}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{booking.pickup} → {booking.dropoff}</CardTitle>
                <CardDescription>
                  {new Date(booking.date).toLocaleDateString()} | {booking.vehicle}
                </CardDescription>
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
                {['pending', 'confirmed'].includes(booking.status) && (
                  <Button variant="destructive" size="sm">Cancel</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
