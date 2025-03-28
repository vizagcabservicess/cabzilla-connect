import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { bookingAPI } from '@/services/api';
import { Booking } from '@/types/api';
import { AlertCircle, MapPin, Phone, Mail, CheckCircle, XCircle, MoreHorizontal, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiErrorFallback } from '@/components/ApiErrorFallback';

export function AdminBookingsList() {
  const { toast: uiToast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsRefreshing(true);
      console.log('Admin: Fetching all bookings...');
      
      const timestamp = new Date().getTime();
      console.log(`Cache busting with timestamp: ${timestamp}`);
      
      let data: Booking[] = [];
      
      try {
        data = await bookingAPI.getAllBookings();
        console.log('Admin: Bookings received from admin API:', data);
      } catch (adminError) {
        console.warn('getAllBookings admin API failed:', adminError);
        
        try {
          data = await bookingAPI.getUserBookings();
          console.log('Admin: Bookings received from user API:', data);
        } catch (userError) {
          console.warn('getUserBookings API also failed:', userError);
          
          const token = localStorage.getItem('authToken');
          
          try {
            const response = await fetch('/api/user/direct-booking-data.php', {
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Cache-Control': 'no-cache',
                'X-Force-Refresh': 'true'
              }
            });
            
            if (response.ok) {
              const responseData = await response.json();
              console.log('Direct API fallback successful:', responseData);
              
              if (responseData.bookings && Array.isArray(responseData.bookings)) {
                data = responseData.bookings;
              } else if (Array.isArray(responseData)) {
                data = responseData;
              } else {
                throw new Error('Invalid data format from direct API');
              }
            } else {
              throw new Error(`Direct API failed with status: ${response.status}`);
            }
          } catch (directError) {
            console.error('All API attempts failed:', directError);
            throw adminError;
          }
        }
      }
      
      if (Array.isArray(data)) {
        setBookings(data);
        applyFilters(data, searchTerm, statusFilter);
        toast.success(`${data.length} bookings loaded successfully`, {
          id: 'bookings-loaded',
        });
      } else {
        console.error('Admin: Invalid data format received:', data);
        throw new Error('Invalid data format received from server');
      }
    } catch (error: any) {
      console.error('Admin: Error fetching bookings:', error);
      
      let errorMessage = 'Failed to load bookings';
      
      if (error.message && error.message.includes('Network connection error')) {
        errorMessage = 'Network connection error. Please check your internet connection and the API server status.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      toast.error("Error Loading Bookings", {
        description: errorMessage,
        duration: 5000,
      });
      
      uiToast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      
      const sampleBookings: Booking[] = [
        {
          id: 1,
          bookingNumber: 'DEMO1234',
          pickupLocation: 'Demo Airport',
          dropLocation: 'Demo Hotel',
          pickupDate: new Date().toISOString(),
          cabType: 'sedan',
          distance: 15,
          tripType: 'airport',
          tripMode: 'one-way',
          totalAmount: 1500,
          status: 'pending',
          passengerName: 'Demo User',
          passengerPhone: '9876543210',
          passengerEmail: 'demo@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          bookingNumber: 'DEMO1235',
          pickupLocation: 'Demo Hotel',
          dropLocation: 'Demo Beach',
          pickupDate: new Date(Date.now() + 86400000).toISOString(),
          cabType: 'innova_crysta',
          distance: 25,
          tripType: 'local',
          tripMode: 'round-trip',
          totalAmount: 2500,
          status: 'confirmed',
          passengerName: 'Demo Admin',
          passengerPhone: '9876543211',
          passengerEmail: 'admin@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      setBookings(sampleBookings);
      applyFilters(sampleBookings, searchTerm, statusFilter);
      
      console.log('Using sample data for development:', sampleBookings);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [retryCount]);

  useEffect(() => {
    applyFilters(bookings, searchTerm, statusFilter);
  }, [searchTerm, statusFilter, bookings]);

  const applyFilters = (bookingsArray: Booking[], search: string, status: string) => {
    console.log('Applying filters:', { search, status });
    console.log('Bookings to filter:', bookingsArray.length);
    
    let filtered = [...bookingsArray];
    
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(booking => 
        (booking.bookingNumber && booking.bookingNumber.toLowerCase().includes(term)) ||
        (booking.passengerName && booking.passengerName.toLowerCase().includes(term)) ||
        (booking.passengerPhone && booking.passengerPhone.includes(term)) ||
        (booking.passengerEmail && booking.passengerEmail.toLowerCase().includes(term)) ||
        (booking.pickupLocation && booking.pickupLocation.toLowerCase().includes(term))
      );
      console.log('After search filter:', filtered.length);
    }
    
    if (status !== 'all') {
      filtered = filtered.filter(booking => booking.status === status);
      console.log('After status filter:', filtered.length);
    }
    
    setFilteredBookings(filtered);
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

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchBookings();
  };

  const handleAssignDriver = (bookingId: number) => {
    uiToast({
      title: "Feature Coming Soon",
      description: "Driver assignment functionality will be available soon.",
    });
  };

  const handleCancelBooking = (bookingId: number) => {
    uiToast({
      title: "Feature Coming Soon",
      description: "Booking cancellation functionality will be available soon.",
    });
  };

  if (isLoading && retryCount === 0) {
    return (
      <div className="flex justify-center p-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error && filteredBookings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
          <div className="grid gap-2 md:w-60">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by name, phone, email..."
              value={searchTerm}
              disabled
            />
          </div>
          <Button 
            variant="default" 
            onClick={handleRetry} 
            disabled={isRefreshing}
            className="md:self-end"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Retrying...' : 'Retry Connection'}
          </Button>
        </div>
        
        <ApiErrorFallback
          error={error}
          onRetry={handleRetry}
          title="Unable to Load Bookings"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-2 md:w-60">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search by name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 md:self-end">
          <div className="grid gap-2 md:w-48">
            <Label htmlFor="status">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRetry}
            className="md:self-end h-10 mt-auto"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading bookings</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {filteredBookings.length > 0 ? (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Trip Details</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium">{booking.passengerName}</div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Phone className="h-3 w-3 mr-1" /> {booking.passengerPhone}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 truncate max-w-[150px]">
                        <Mail className="h-3 w-3 mr-1" /> {booking.passengerEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{booking.tripType.toUpperCase()} - {booking.tripMode}</div>
                      <div className="flex items-center text-xs text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" /> From: {booking.pickupLocation}
                      </div>
                      {booking.dropLocation && (
                        <div className="flex items-center text-xs text-gray-500">
                          <MapPin className="h-3 w-3 mr-1" /> To: {booking.dropLocation}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{new Date(booking.pickupDate).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(booking.pickupDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </TableCell>
                    <TableCell>₹{booking.totalAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {booking.driverName ? (
                        <div>
                          <div className="font-medium">{booking.driverName || 'Unassigned'}</div>
                          {booking.driverPhone && (
                            <div className="text-xs text-gray-500">{booking.driverPhone}</div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Unassigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigate(`/admin/booking/${booking.id}`)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/booking/${booking.id}/edit`)}>
                            Edit Booking
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {booking.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleAssignDriver(booking.id)}>
                                Assign Driver
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancelBooking(booking.id)}>
                                Cancel Booking
                              </DropdownMenuItem>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <DropdownMenuItem onClick={() => handleCancelBooking(booking.id)}>
                              Cancel Booking
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 border rounded-md">
          <p className="text-gray-500 mb-4">No bookings found that match your filters.</p>
          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setStatusFilter('all');
          }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
