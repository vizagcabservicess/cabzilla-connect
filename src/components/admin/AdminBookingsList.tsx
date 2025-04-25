
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
import { Booking, BookingStatus } from '@/types/api';
import { AlertCircle, MapPin, Phone, Mail, MoreHorizontal, RefreshCw, Wifi } from 'lucide-react';
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
import { getForcedRequestConfig } from '@/config/requestConfig';
import { BookingDetails } from './BookingDetails';
import { getStatusColor } from '@/utils/bookingUtils';

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
  const [apiAttempt, setApiAttempt] = useState(0);
  const [responseDebug, setResponseDebug] = useState<string | null>(null);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsRefreshing(true);
      setResponseDebug(null);
      console.log('Admin: Fetching all bookings...');
      
      const timestamp = new Date().getTime();
      console.log(`Cache busting with timestamp: ${timestamp}`);
      
      let data: Booking[] = [];
      let responseSource = '';
      
      try {
        setApiAttempt(1);
        // Try direct fetch first with explicit API url and proper headers
        const token = localStorage.getItem('authToken');
        const requestUrl = `/api/admin/booking.php?_t=${timestamp}`;
        console.log(`Attempting direct fetch from: ${requestUrl}`);
        
        const directResponse = await fetch(requestUrl, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Force-Refresh': 'true',
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          }
        });
        
        // Check for non-200 responses
        if (!directResponse.ok) {
          console.error(`Direct API failed with status: ${directResponse.status}`);
          throw new Error(`Direct API failed with status: ${directResponse.status}`);
        }
        
        // Check that we actually got JSON back
        const contentType = directResponse.headers.get('content-type');
        console.log('Content-Type from response:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await directResponse.text();
          console.error('API returned non-JSON response:', textResponse);
          setResponseDebug(textResponse.substring(0, 500) + (textResponse.length > 500 ? '...' : ''));
          throw new Error('API returned non-JSON response');
        }
        
        const responseData = await directResponse.json();
        console.log('Direct API response:', responseData);
        
        if (responseData && responseData.bookings && Array.isArray(responseData.bookings)) {
          data = responseData.bookings.map(booking => ({
            ...booking,
            status: booking.status as BookingStatus
          }));
          responseSource = 'direct_fetch';
        } else if (Array.isArray(responseData)) {
          data = responseData.map(booking => ({
            ...booking,
            status: booking.status as BookingStatus
          }));
          responseSource = 'direct_fetch_array';
        } else {
          console.error('Invalid data format:', responseData);
          throw new Error('Invalid data format from direct API');
        }
      } catch (directError) {
        console.warn('Direct fetch failed:', directError);
        
        // Try with a more explicit server path
        try {
          setApiAttempt(2);
          const token = localStorage.getItem('authToken');
          const requestUrl = `/api/admin/bookings?_t=${timestamp}`;
          console.log(`Attempting alternative fetch from: ${requestUrl}`);
          
          const altDirectResponse = await fetch(requestUrl, {
            ...getForcedRequestConfig(),
            headers: {
              ...getForcedRequestConfig().headers,
              'Authorization': token ? `Bearer ${token}` : '',
              'Accept': 'application/json',
              'X-Admin-Mode': 'true',
              'X-Debug': 'true'
            }
          });
          
          if (!altDirectResponse.ok) {
            console.error(`Alternative direct API failed with status: ${altDirectResponse.status}`);
            throw new Error(`Alternative direct API failed with status: ${altDirectResponse.status}`);
          }
          
          const contentType = altDirectResponse.headers.get('content-type');
          console.log('Content-Type from alternative response:', contentType);
          
          if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await altDirectResponse.text();
            console.error('Alternative API returned non-JSON response:', textResponse);
            setResponseDebug(textResponse.substring(0, 500) + (textResponse.length > 500 ? '...' : ''));
            throw new Error('Alternative API returned non-JSON response');
          }
          
          const responseData = await altDirectResponse.json();
          console.log('Alternative direct API response:', responseData);
          
          if (responseData && responseData.bookings && Array.isArray(responseData.bookings)) {
            data = responseData.bookings.map(booking => ({
              ...booking,
              status: booking.status as BookingStatus
            }));
            responseSource = 'alt_direct_fetch';
          } else if (Array.isArray(responseData)) {
            data = responseData.map(booking => ({
              ...booking,
              status: booking.status as BookingStatus
            }));
            responseSource = 'alt_direct_fetch_array';
          } else {
            throw new Error('Invalid data format from alternative direct API');
          }
        } catch (altDirectError) {
          console.warn('Alternative direct fetch failed:', altDirectError);
          
          try {
            setApiAttempt(3);
            // Fallback to using the bookingAPI service
            console.log('Attempting to fetch via bookingAPI.getAllBookings()');
            const apiData = await bookingAPI.getAllBookings();
            data = apiData.map(booking => ({
              ...booking,
              status: booking.status as BookingStatus
            }));
            console.log('Admin: Bookings received from admin API:', data);
            responseSource = 'booking_api';
          } catch (adminError) {
            console.warn('getAllBookings admin API failed:', adminError);
            
            try {
              setApiAttempt(4);
              // Try user bookings as a final fallback
              console.log('Attempting to fetch via bookingAPI.getUserBookings()');
              const userBookings = await bookingAPI.getUserBookings();
              data = userBookings.map(booking => ({
                ...booking,
                status: booking.status as BookingStatus
              }));
              console.log('Admin: Bookings received from user API:', data);
              responseSource = 'user_api';
            } catch (userError) {
              console.warn('getUserBookings API also failed:', userError);
              
              try {
                setApiAttempt(5);
                // Last resort try
                const token = localStorage.getItem('authToken');
                console.log('Attempting final fallback to /api/user/bookings.php');
                const response = await fetch('/api/user/bookings.php', {
                  headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Cache-Control': 'no-cache',
                    'X-Force-Refresh': 'true',
                    'X-Admin-Mode': 'true' 
                  }
                });
                
                if (response.ok) {
                  const responseData = await response.json();
                  console.log('Final fallback API successful:', responseData);
                  
                  if (responseData.bookings && Array.isArray(responseData.bookings)) {
                    data = responseData.bookings.map(booking => ({
                      ...booking,
                      status: booking.status as BookingStatus
                    }));
                  } else if (Array.isArray(responseData)) {
                    data = responseData.map(booking => ({
                      ...booking,
                      status: booking.status as BookingStatus
                    }));
                  } else {
                    throw new Error('Invalid data format from final fallback API');
                  }
                  responseSource = 'fallback_api';
                } else {
                  throw new Error(`Final fallback API failed with status: ${response.status}`);
                }
              } catch (directError) {
                console.error('All API attempts failed:', directError);
                throw new Error('All booking API attempts failed. Please check your network connection and server status.');
              }
            }
          }
        }
      }
      
      if (Array.isArray(data)) {
        setBookings(data);
        applyFilters(data, searchTerm, statusFilter);
        toast.success(`${data.length} bookings loaded successfully (${responseSource})`, {
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
      
      // Only use sample data for development if there are no bookings
      if (bookings.length === 0) {
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
            status: 'pending' as BookingStatus,
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
            status: 'confirmed' as BookingStatus,
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
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const handleCloseDetails = () => {
    setSelectedBooking(null);
  };

  const handleEditBooking = async (updatedData: Partial<Booking>) => {
    if (!selectedBooking) return;
    
    setIsSubmitting(true);
    try {
      const bookingId = selectedBooking.id;
      const result = await bookingAPI.updateBooking(bookingId, updatedData);
      
      // Update the selected booking with new data
      setSelectedBooking({
        ...selectedBooking,
        ...updatedData
      });
      
      // Also update in the bookings list
      const updatedBookings = bookings.map(booking => 
        booking.id === bookingId ? { ...booking, ...updatedData } : booking
      );
      setBookings(updatedBookings);
      applyFilters(updatedBookings, searchTerm, statusFilter);
      
      toast.success("Booking updated successfully");
      return result;
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error("Failed to update booking");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDriver = async (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => {
    if (!selectedBooking) return;
    
    setIsSubmitting(true);
    try {
      const bookingId = selectedBooking.id;
      const updatedData = {
        ...driverData,
        status: 'assigned' as BookingStatus
      };
      
      const result = await bookingAPI.updateBooking(bookingId, updatedData);
      
      // Update the selected booking with new data
      setSelectedBooking({
        ...selectedBooking,
        ...driverData,
        status: 'assigned' as BookingStatus
      });
      
      // Also update in the bookings list
      const updatedBookings = bookings.map(booking => 
        booking.id === bookingId ? { 
          ...booking, 
          ...driverData,
          status: 'assigned' as BookingStatus 
        } : booking
      );
      setBookings(updatedBookings);
      applyFilters(updatedBookings, searchTerm, statusFilter);
      
      toast.success("Driver assigned successfully");
      return result;
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error("Failed to assign driver");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    setIsSubmitting(true);
    try {
      const bookingId = selectedBooking.id;
      await bookingAPI.updateBooking(bookingId, { status: 'cancelled' as BookingStatus });
      
      // Update the selected booking
      setSelectedBooking({
        ...selectedBooking,
        status: 'cancelled' as BookingStatus
      });
      
      // Update in the bookings list
      const updatedBookings = bookings.map(booking => 
        booking.id === bookingId ? { 
          ...booking, 
          status: 'cancelled' as BookingStatus
        } : booking
      );
      setBookings(updatedBookings);
      applyFilters(updatedBookings, searchTerm, statusFilter);
      
      toast.success("Booking cancelled successfully");
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error("Failed to cancel booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!selectedBooking) return;
    
    setIsSubmitting(true);
    try {
      const bookingId = selectedBooking.id;
      await bookingAPI.updateBooking(bookingId, { status: newStatus });
      
      // Update the selected booking
      setSelectedBooking({
        ...selectedBooking,
        status: newStatus
      });
      
      // Update in the bookings list
      const updatedBookings = bookings.map(booking => 
        booking.id === bookingId ? { 
          ...booking, 
          status: newStatus 
        } : booking
      );
      setBookings(updatedBookings);
      applyFilters(updatedBookings, searchTerm, statusFilter);
      
      toast.success(`Booking status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error("Failed to update booking status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateInvoice = async () => {
    uiToast({
      description: "Invoice generation will be available shortly."
    });
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

  const handleVerifyConnectivity = async () => {
    try {
      setIsRefreshing(true);
      console.log('Verifying API connectivity...');
      
      const response = await fetch('/api/admin/status.php');
      if (response.ok) {
        const data = await response.json();
        console.log('API status response:', data);
        toast.success('API is operational', {
          description: `Server time: ${data.server_time}`
        });
      } else {
        toast.error('API connectivity issue', {
          description: `Status code: ${response.status}`
        });
      }
    } catch (error) {
      console.error('API connectivity check failed:', error);
      toast.error('API connectivity check failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRefreshing(false);
    }
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
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={handleRetry} 
              disabled={isRefreshing}
              className="md:self-end"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Retrying...' : 'Retry Connection'}
            </Button>
            <Button
              variant="outline"
              onClick={handleVerifyConnectivity}
              disabled={isRefreshing}
              className="md:self-end"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Verify API
            </Button>
          </div>
        </div>
        
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Error: HTML Response Instead of JSON</AlertTitle>
          <AlertDescription>
            <p className="mb-2">The API is returning HTML instead of JSON data. This typically happens when:</p>
            <ul className="list-disc pl-5 mb-3">
              <li>The API endpoint is not correctly set up</li>
              <li>There's a server-side error or redirection</li>
              <li>The API is returning a web page instead of JSON data</li>
            </ul>
            <div className="mt-2">
              <p className="text-sm text-gray-700 mb-2">API Attempt: {apiAttempt}/5</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Retry API Call
                </Button>
                <Button variant="outline" size="sm" onClick={handleVerifyConnectivity}>
                  Check API Status
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
        
        {responseDebug && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Response Debug</AlertTitle>
            <AlertDescription>
              <div className="mt-2 p-2 bg-gray-100 text-xs rounded overflow-auto max-h-40">
                <pre>{responseDebug}</pre>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
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
                <SelectItem value="assigned">Assigned</SelectItem>
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

      {selectedBooking && (
        <BookingDetails
          booking={selectedBooking}
          onClose={handleCloseDetails}
          onEdit={handleEditBooking}
          onAssignDriver={handleAssignDriver}
          onCancel={handleCancelBooking}
          onGenerateInvoice={handleGenerateInvoice}
          onStatusChange={handleStatusChange}
        />
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
                      <div className="font-medium">{booking.tripType?.toUpperCase() || 'N/A'} - {booking.tripMode || 'N/A'}</div>
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
                    <TableCell>₹{booking.totalAmount?.toLocaleString('en-IN') || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status || 'pending')}>
                        {booking.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {booking.driverName ? (
                        <div>
                          <div className="font-medium">{booking.driverName}</div>
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
                          <DropdownMenuItem onClick={() => handleViewDetails(booking)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {booking.status === 'pending' && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedBooking(booking);
                              handleStatusChange('confirmed');
                            }}>
                              Confirm Booking
                            </DropdownMenuItem>
                          )}
                          {['pending', 'confirmed'].includes(booking.status) && (
                            <>
                              <DropdownMenuItem onClick={() => {
                                handleViewDetails(booking);
                                setTimeout(() => document.getElementById('driver-tab')?.click(), 100);
                              }}>
                                Assign Driver
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedBooking(booking);
                                handleCancelBooking();
                              }}>
                                Cancel Booking
                              </DropdownMenuItem>
                            </>
                          )}
                          {booking.status === 'assigned' && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedBooking(booking);
                              handleStatusChange('completed');
                            }}>
                              Mark as Completed
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
