import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { Book, CircleOff, RefreshCw, Calendar, MapPin, Car, ShieldAlert, LogOut, Info } from "lucide-react";
import { bookingAPI, authAPI } from '@/services/api';
import { Booking } from '@/types/api';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DashboardMetrics } from '@/components/admin/DashboardMetrics';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1500; // 1.5 seconds
const AUTH_CHECK_INTERVAL = 60000; // Check token validity every minute

export default function DashboardPage() {
  const { toast: uiToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  
  const user = authAPI.getCurrentUser();
  const isAdmin = user?.role === 'admin';
  
  const comingFromBooking = location.state?.fromBooking;

  useEffect(() => {
    console.log('Performing initial auth check on DashboardPage mount');
    
    const checkAuth = () => {
      if (!authAPI.isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        toast.error('Please login to access your dashboard');
        navigate('/login');
        return false;
      }
      return true;
    };
    
    const isAuthenticated = checkAuth();
    setIsAuthChecked(true);
    
    if (isAuthenticated) {
      console.log('User authenticated, proceeding with dashboard');
      
      if (comingFromBooking) {
        toast.success('Booking successful! Your dashboard has been updated.');
      }
    }
    
    const authCheckInterval = setInterval(() => {
      console.log('Performing periodic auth check');
      checkAuth();
    }, AUTH_CHECK_INTERVAL);
    
    return () => {
      clearInterval(authCheckInterval);
    };
  }, [navigate, comingFromBooking]);

  const fetchBookings = useCallback(async (retry = 0) => {
    if (!isAuthChecked) {
      console.log('Auth check not completed yet, delaying fetch');
      return;
    }
    
    if (!authAPI.isAuthenticated()) {
      console.error('Auth token missing or invalid, redirecting to login');
      toast.error('Your session has expired. Please login again.');
      navigate('/login');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching user bookings...', { retry });
      
      try {
        console.log('Fetching bookings with cache busting...');
        const cacheBust = new Date().getTime();
        console.log(`Cache busting with timestamp: ${cacheBust}`);
        
        const data = await bookingAPI.getUserBookings();
        console.log('Bookings received:', data);
        
        if (Array.isArray(data)) {
          setBookings(data);
          setRetryCount(0);
          if (data.length === 0) {
            toast.info('No bookings found. Book your first cab ride now!');
          } else {
            toast.success(`Found ${data.length} booking(s)`);
          }
        } else {
          console.error('Invalid data format received:', data);
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error in fetch:', error);
        
        if (error instanceof Error && 
            (error.message.includes('Invalid or expired token') || 
             error.message.includes('Authentication failed') ||
             error.message.includes('Not authenticated') ||
             error.message.includes('401'))) {
          console.log('Authentication error detected, clearing local storage');
          authAPI.logout();
          navigate('/login');
          return;
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      
      if (retry < MAX_RETRIES) {
        toast.info(`Retrying... (${retry + 1}/${MAX_RETRIES})`, {
          duration: RETRY_DELAY,
        });
        
        setTimeout(() => {
          setRetryCount(retry + 1);
          fetchBookings(retry + 1);
        }, RETRY_DELAY);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load your bookings. Please try again later.';
        setError(errorMessage);
        
        uiToast({
          title: "Error Loading Bookings",
          description: errorMessage,
          variant: "destructive",
        });
        
        toast.error('Could not load your bookings after multiple attempts', {
          description: "Please refresh the page or try again later",
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, uiToast, isAuthChecked]);

  useEffect(() => {
    if (isAuthChecked) {
      fetchBookings();
    }
  }, [fetchBookings, isAuthChecked]);

  const handleRetry = () => {
    setRetryCount(0);
    fetchBookings();
  };
  
  const handleLogout = () => {
    authAPI.logout();
  };

  const handleViewReceipt = (bookingId: number | string) => {
    window.open(`/receipt/${bookingId}`, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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

  const NoBookingsCard = () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10">
        <Book className="h-16 w-16 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">You don't have any bookings yet.</p>
        <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">Book a Cab Now</Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name || 'User'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRetry} variant="outline" className="mr-2" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">
            Book New Cab
          </Button>
          <Button onClick={handleLogout} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Admin Metrics</h2>
          <DashboardMetrics />
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error Loading Bookings</AlertTitle>
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

      {bookings.length === 0 && !isLoading && !error && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>No Bookings Found</AlertTitle>
          <AlertDescription>
            You haven't made any bookings yet. Book your first cab ride now!
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
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 mr-1 mt-1 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">Pickup</p>
                            <p className="font-medium">{booking.pickupLocation}</p>
                          </div>
                        </div>
                        {booking.dropLocation && (
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mr-1 mt-1 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-500">Drop</p>
                              <p className="font-medium">{booking.dropLocation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-start">
                          <Calendar className="h-4 w-4 mr-1 mt-1 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">Date & Time</p>
                            <p className="font-medium">{new Date(booking.pickupDate).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <Car className="h-4 w-4 mr-1 mt-1 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">Vehicle</p>
                            <p className="font-medium">{booking.cabType}</p>
                          </div>
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
                    <Button 
                      variant="outline" 
                      onClick={() => handleViewReceipt(booking.id)}
                    >
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
            <NoBookingsCard />
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
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 mr-1 mt-1 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">Pickup</p>
                            <p className="font-medium">{booking.pickupLocation}</p>
                          </div>
                        </div>
                        {booking.dropLocation && (
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mr-1 mt-1 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-500">Drop</p>
                              <p className="font-medium">{booking.dropLocation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-start">
                          <Calendar className="h-4 w-4 mr-1 mt-1 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">Date & Time</p>
                            <p className="font-medium">{new Date(booking.pickupDate).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <Car className="h-4 w-4 mr-1 mt-1 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">Vehicle</p>
                            <p className="font-medium">{booking.cabType}</p>
                          </div>
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
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => handleViewReceipt(booking.id)}
                    >
                      View Receipt
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <NoBookingsCard />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
