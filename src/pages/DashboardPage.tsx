import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { book } from "lucide-react";
import { bookingAPI, authAPI } from '@/services/api';
import { Booking } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CircleOff, RefreshCw } from "lucide-react";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export default function DashboardPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const user = authAPI.getCurrentUser();

  const fetchBookings = useCallback(async (retry = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching user bookings...');
      const data = await bookingAPI.getUserBookings();
      console.log('Bookings received:', data);
      setBookings(data);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Error fetching bookings:', error);
      if (retry < MAX_RETRIES) {
        // Wait before retrying
        setTimeout(() => {
          setRetryCount(retry + 1);
          fetchBookings(retry + 1);
        }, RETRY_DELAY);
      } else {
        setError('Failed to load your bookings. Please try again later.');
        toast({
          title: "Error",
          description: "Could not load bookings. Please refresh the page.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [navigate, fetchBookings]);

  const handleRetry = () => {
    setRetryCount(0);
    fetchBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const upcomingBookings = bookings.filter(booking => 
    ['pending', 'confirmed'].includes(booking.status.toLowerCase())
  );
  
  const pastBookings = bookings.filter(booking => 
    ['completed', 'cancelled'].includes(booking.status.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-500">Welcome back, {user?.name || 'User'}</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name || 'User'}</p>
        </div>
        <Button onClick={() => navigate('/')}>Book New Cab</Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <CircleOff className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              className="ml-4"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {retryCount > 0 && !error && (
        <Alert className="mb-6">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Retrying...</AlertTitle>
          <AlertDescription>
            Attempt {retryCount} of {MAX_RETRIES}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming Bookings</TabsTrigger>
          <TabsTrigger value="past">Past Bookings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
            </div>
          ) : upcomingBookings.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">Booking #{booking.bookingNumber}</CardTitle>
                        <CardDescription>{booking.tripType.toUpperCase()} - {booking.tripMode}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-sm text-gray-500">Pickup</p>
                          <p className="font-medium">{booking.pickupLocation}</p>
                        </div>
                        {booking.dropLocation && (
                          <div>
                            <p className="text-sm text-gray-500">Drop</p>
                            <p className="font-medium">{booking.dropLocation}</p>
                          </div>
                        )}
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-sm text-gray-500">Date & Time</p>
                          <p className="font-medium">{new Date(booking.pickupDate).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Vehicle</p>
                          <p className="font-medium">{booking.cabType}</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-bold text-lg">₹{booking.totalAmount.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => window.open(`/receipt/${booking.id}`, '_blank')}>
                      View Receipt
                    </Button>
                    <Button onClick={() => navigate(`/booking/${booking.id}/edit`)}>
                      Modify Booking
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <p className="text-gray-500 mb-4">You don't have any upcoming bookings.</p>
                <Button onClick={() => navigate('/')}>Book a Cab Now</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="past">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
            </div>
          ) : pastBookings.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {pastBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">Booking #{booking.bookingNumber}</CardTitle>
                        <CardDescription>{booking.tripType.toUpperCase()} - {booking.tripMode}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-sm text-gray-500">Pickup</p>
                          <p className="font-medium">{booking.pickupLocation}</p>
                        </div>
                        {booking.dropLocation && (
                          <div>
                            <p className="text-sm text-gray-500">Drop</p>
                            <p className="font-medium">{booking.dropLocation}</p>
                          </div>
                        )}
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-sm text-gray-500">Date & Time</p>
                          <p className="font-medium">{new Date(booking.pickupDate).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Vehicle</p>
                          <p className="font-medium">{booking.cabType}</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-bold text-lg">₹{booking.totalAmount.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" 
                      onClick={() => window.open(`/receipt/${booking.id}`, '_blank')}>
                      View Receipt
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <p className="text-gray-500 mb-4">You don't have any past bookings.</p>
                <Button onClick={() => navigate('/')}>Book a Cab Now</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
