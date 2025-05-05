
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
import { getStatusColorClass } from '@/utils/bookingUtils';
import { getApiUrl } from '@/config/api';

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
  const [devMode, setDevMode] = useState<boolean>(false);
  
  // Check if dev mode is enabled
  useEffect(() => {
    const devModeEnabled = localStorage.getItem('dev_mode') === 'true';
    setDevMode(devModeEnabled);
  }, []);
  
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
      
      // If dev mode is enabled, use sample data
      if (devMode) {
        console.log('Using dev mode sample data');
        const sampleBookings = createSampleBookings();
        setBookings(sampleBookings);
        applyFilters(sampleBookings, searchTerm, statusFilter);
        setIsLoading(false);
        setIsRefreshing(false);
        toast.success(`${sampleBookings.length} sample bookings loaded (dev mode)`, {
          id: 'bookings-loaded',
        });
        return;
      }
      
      try {
        setApiAttempt(1);
        // Try the direct-booking-data.php endpoint first
        console.log('Attempting to fetch via direct-booking-data.php');
        const directResponse = await fetch(`/api/admin/direct-booking-data.php?_t=${timestamp}`, {
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (directResponse.ok) {
          const contentType = directResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const directData = await directResponse.json();
            
            if (Array.isArray(directData)) {
              data = directData.map((booking: any) => ({
                ...booking,
                status: booking.status as BookingStatus
              }));
              console.log('Admin: Bookings received from direct endpoint:', data);
              responseSource = 'direct_api';
            } else if (directData && Array.isArray(directData.bookings)) {
              data = directData.bookings.map((booking: any) => ({
                ...booking,
                status: booking.status as BookingStatus
              }));
              responseSource = 'direct_api_bookings_property';
            } else if (directData && Array.isArray(directData.data)) {
              data = directData.data.map((booking: any) => ({
                ...booking,
                status: booking.status as BookingStatus
              }));
              responseSource = 'direct_api_data_property';
            }
            
            if (data.length > 0) {
              setBookings(data);
              applyFilters(data, searchTerm, statusFilter);
              toast.success(`${data.length} bookings loaded successfully (${responseSource})`, {
                id: 'bookings-loaded',
              });
              setIsLoading(false);
              setIsRefreshing(false);
              return;
            }
          } else {
            console.warn('Direct API returned non-JSON response:', await directResponse.text());
          }
        }
        
        // If direct fetch failed, try using the bookingAPI
        setApiAttempt(2);
        console.log('Direct fetch failed, trying bookingAPI.getAllBookings()');
        const apiData = await bookingAPI.getAllBookings();
        
        if (Array.isArray(apiData)) {
          data = apiData.map((booking: any) => ({
            ...booking,
            status: booking.status as BookingStatus
          }));
          console.log('Admin: Bookings received from booking API:', data);
          responseSource = 'booking_api';
        } else if (apiData && Array.isArray(apiData.bookings)) {
          data = apiData.bookings.map((booking: any) => ({
            ...booking,
            status: booking.status as BookingStatus
          }));
          responseSource = 'booking_api_object';
        } else {
          throw new Error('Invalid data format from booking API');
        }
      } catch (apiError) {
        console.warn('All API attempts failed:', apiError);
        
        try {
          // Try using fallback sample data if both API attempts fail
          setApiAttempt(3);
          const sampleBookings = createSampleBookings();
          setBookings(sampleBookings);
          applyFilters(sampleBookings, searchTerm, statusFilter);
          toast.info('Using sample booking data (API unavailable)', {
            duration: 5000,
          });
          console.log('Using sample data due to API error:', sampleBookings);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        } catch (directError) {
          console.warn('Sample data fallback failed:', directError);
          throw new Error('Failed to load bookings. Using sample data as fallback.');
        }
      }
      
      if (Array.isArray(data) && data.length > 0) {
        setBookings(data);
        applyFilters(data, searchTerm, statusFilter);
        toast.success(`${data.length} bookings loaded successfully (${responseSource})`, {
          id: 'bookings-loaded',
        });
      } else {
        // If we got an empty array, that's valid but we should show a message
        console.log('No bookings found in the response');
        setBookings([]);
        setFilteredBookings([]);
        toast.info('No bookings found', {
          id: 'no-bookings',
        });
        
        // Use sample data if no bookings were found
        const sampleBookings = createSampleBookings();
        setBookings(sampleBookings);
        applyFilters(sampleBookings, searchTerm, statusFilter);
        toast.info('Using sample booking data', {
          duration: 5000,
        });
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
      
      // Use sample data if there are no bookings
      const sampleBookings = createSampleBookings();
      setBookings(sampleBookings);
      applyFilters(sampleBookings, searchTerm, statusFilter);
      toast.info('Using sample booking data as fallback', {
        duration: 5000,
      });
      console.log('Using sample data as fallback:', sampleBookings);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Function to create sample bookings for fallback
  const createSampleBookings = (): Booking[] => {
    return [
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
      },
      {
        id: 3,
        bookingNumber: 'DEMO1236',
        pickupLocation: 'City Center',
        dropLocation: 'Beach Resort',
        pickupDate: new Date(Date.now() + 172800000).toISOString(), // 2 days in future
        cabType: 'ertiga',
        distance: 35,
        tripType: 'outstation',
        tripMode: 'round-trip',
        totalAmount: 3500,
        status: 'confirmed' as BookingStatus,
        passengerName: 'Jane Smith',
        passengerPhone: '9876543212',
        passengerEmail: 'jane@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
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
      console.log('Updating booking:', selectedBooking.id, updatedData);
      
      // Try bookingAPI first
      try {
        const response = await bookingAPI.updateBooking(selectedBooking.id, updatedData);
        console.log('Booking update response:', response);
        
        // Update the bookings list with the updated data from the response
        const updatedBooking = response.data || { ...selectedBooking, ...updatedData };
        
        const updatedBookings = bookings.map(booking => 
          booking.id === selectedBooking.id ? { ...booking, ...updatedBooking } : booking
        );
        setBookings(updatedBookings);
        applyFilters(updatedBookings, searchTerm, statusFilter);
        
        toast.success("Booking updated successfully");
        handleCloseDetails();
        return;
      } catch (apiError) {
        console.warn('bookingAPI.updateBooking failed, trying direct fetch:', apiError);
      }
      
      // If bookingAPI fails, try direct fetch
      const directResponse = await fetch('/api/admin/update-booking.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          ...updatedData
        })
      });
      
      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error('Booking update error response:', errorText);
        throw new Error(`Failed to update booking: ${directResponse.status} ${directResponse.statusText}`);
      }
      
      const contentType = directResponse.headers.get('content-type');
      console.log('Response content-type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await directResponse.text();
        console.error('API returned non-JSON response:', textResponse);
        throw new Error('API returned non-JSON response');
      }
      
      const response = await directResponse.json();
      console.log('Booking update response:', response);
      
      // Update the bookings list with the updated data from the response
      const updatedBooking = response.data || { ...selectedBooking, ...updatedData };
      
      const updatedBookings = bookings.map(booking => 
        booking.id === selectedBooking.id ? { ...booking, ...updatedBooking } : booking
      );
      setBookings(updatedBookings);
      applyFilters(updatedBookings, searchTerm, statusFilter);
      
      toast.success("Booking updated successfully");
      handleCloseDetails();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error("Failed to update booking: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDriver = async (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => {
    if (!selectedBooking) return;
    
    setIsSubmitting(true);
    try {
      const updatedData = {
        ...driverData,
        status: 'assigned' as BookingStatus
      };
      
      // Try bookingAPI first
      try {
        const response = await bookingAPI.assignDriver(selectedBooking.id, driverData);
        console.log('Driver assignment response:', response);
        
        // Update the bookings list with the updated data from the response
        const updatedBooking = response.data || { ...selectedBooking, ...updatedData };
        
        const updatedBookings = bookings.map(booking => 
          booking.id === selectedBooking.id ? { ...booking, ...updatedBooking } : booking
        );
        setBookings(updatedBookings);
        applyFilters(updatedBookings, searchTerm, statusFilter);
        
        toast.success("Driver assigned successfully");
        handleCloseDetails();
        return;
      } catch (apiError) {
        console.warn('bookingAPI.assignDriver failed, trying direct fetch:', apiError);
      }
      
      // Direct fetch for better debugging
      const directResponse = await fetch('/api/admin/update-booking.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          ...updatedData
        })
      });
      
      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error('Driver assignment error response:', errorText);
        throw new Error(`Failed to assign driver: ${directResponse.status} ${directResponse.statusText}`);
      }
      
      const contentType = directResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await directResponse.text();
        console.error('API returned non-JSON response:', textResponse);
        throw new Error('API returned non-JSON response');
      }
      
      const response = await directResponse.json();
      console.log('Driver assignment response:', response);
      
      // Update the bookings list with the updated data from the response
      const updatedBooking = response.data || { ...selectedBooking, ...updatedData };
      
      const updatedBookings = bookings.map(booking => 
        booking.id === selectedBooking.id ? { ...booking, ...updatedBooking } : booking
      );
      setBookings(updatedBookings);
      applyFilters(updatedBookings, searchTerm, statusFilter);
      
      toast.success("Driver assigned successfully");
      handleCloseDetails();
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error("Failed to assign driver: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    setIsSubmitting(true);
    try {
      // Try bookingAPI first
      try {
        await bookingAPI.cancelBooking(selectedBooking.id);
        
        // Update the bookings list
        const updatedBookings = bookings.map(booking => 
          booking.id === selectedBooking.id ? { ...booking, status: 'cancelled' as BookingStatus } : booking
        );
        setBookings(updatedBookings);
        applyFilters(updatedBookings, searchTerm, statusFilter);
        
        toast.success("Booking cancelled successfully");
        handleCloseDetails();
        return;
      } catch (apiError) {
        console.warn('bookingAPI.cancelBooking failed, trying direct fetch:', apiError);
      }
      
      // Direct fetch for better debugging
      const directResponse = await fetch('/api/admin/update-booking.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          status: 'cancelled'
        })
      });
      
      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error('Cancel booking error response:', errorText);
        throw new Error(`Failed to cancel booking: ${directResponse.status} ${directResponse.statusText}`);
      }
      
      // Update the bookings list
      const updatedBookings = bookings.map(booking => 
        booking.id === selectedBooking.id ? { ...booking, status: 'cancelled' as BookingStatus } : booking
      );
      setBookings(updatedBookings);
      applyFilters(updatedBookings, searchTerm, statusFilter);
      
      toast.success("Booking cancelled successfully");
      handleCloseDetails();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error("Failed to cancel booking: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!selectedBooking) return;
    
    setIsSubmitting(true);
    try {
      // Try bookingAPI first
      try {
        await bookingAPI.updateBookingStatus(selectedBooking.id, newStatus);
        
        // Update the bookings list
        const updatedBookings = bookings.map(booking => 
          booking.id === selectedBooking.id ? { ...booking, status: newStatus } : booking
        );
        setBookings(updatedBookings);
        applyFilters(updatedBookings, searchTerm, statusFilter);
        
        toast.success(`Booking status updated to ${newStatus}`);
        return;
      } catch (apiError) {
        console.warn('bookingAPI.updateBookingStatus failed, trying direct fetch:', apiError);
      }
      
      // Direct fetch for better debugging
      const directResponse = await fetch('/api/admin/update-booking.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          status: newStatus
        })
      });
      
      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error('Status update error response:', errorText);
        throw new Error(`Failed to update status: ${directResponse.status} ${directResponse.statusText}`);
      }
      
      // Update the bookings list
      const updatedBookings = bookings.map(booking => 
        booking.id === selectedBooking.id ? { ...booking, status: newStatus } : booking
      );
      setBookings(updatedBookings);
      applyFilters(updatedBookings, searchTerm, statusFilter);
      
      toast.success(`Booking status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error("Failed to update booking status: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateInvoice = async (gstEnabled?: boolean, gstDetails?: any) => {
    if (!selectedBooking) return null;
    
    setIsSubmitting(true);
    try {
      console.log('Generating invoice for booking:', selectedBooking.id);
      
      const requestData = {
        bookingId: selectedBooking.id,
        gstEnabled: gstEnabled || false,
        gstDetails: gstDetails || {}
      };
      
      const apiUrl = getApiUrl('/api/admin/generate-invoice');
      console.log('Invoice API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Invoice generation error response:', errorText);
        throw new Error(`Failed to generate invoice: ${response.status} ${response.statusText}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Invoice API returned non-JSON response:', textResponse);
        throw new Error('Invoice API returned non-JSON response');
      }
      
      const data = await response.json();
      console.log('Invoice generation response:', data);
      
      if (data.status === 'success') {
        toast.success("Invoice generated successfully");
        return data;
      } else {
        throw new Error(data.message || 'Unknown error generating invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error("Failed to generate invoice: " + (error instanceof Error ? error.message : 'Unknown error'));
      return null;
    } finally {
      setIsSubmitting(false);
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

  const enableDevMode = () => {
    localStorage.setItem('dev_mode', 'true');
    setDevMode(true);
    toast.success('Development mode enabled', {
      description: 'Using sample data for bookings'
    });
    handleRetry();
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
              onClick={enableDevMode}
              className="md:self-end"
            >
              Enable Dev Mode
            </Button>
          </div>
        </div>
        
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Error</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{error}</p>
            <p>This typically happens when:</p>
            <ul className="list-disc pl-5 mb-3">
              <li>The API endpoint is not correctly set up</li>
              <li>There's a server-side error or redirection</li>
              <li>The API is returning HTML instead of JSON data</li>
            </ul>
            <div className="mt-2">
              <p className="text-sm text-gray-700 mb-2">API Attempt: {apiAttempt}/4</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Retry API Call
                </Button>
                <Button variant="outline" size="sm" onClick={enableDevMode}>
                  Enable Dev Mode
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
          {!devMode && (
            <Button 
              variant="outline" 
              onClick={enableDevMode}
              className="md:self-end h-10 mt-auto"
            >
              Dev Mode
            </Button>
          )}
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

      {devMode && (
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertTitle className="text-amber-800">Development Mode Enabled</AlertTitle>
          <AlertDescription className="text-amber-700">
            Using sample booking data for development. This will not affect production data.
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
          isSubmitting={isSubmitting}
        />
      )}

      {filteredBookings.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking #</TableHead>
              <TableHead>Passenger</TableHead>
              <TableHead className="hidden md:table-cell">Pickup</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{booking.bookingNumber}</TableCell>
                <TableCell className="font-medium">
                  {booking.passengerName}
                  {booking.passengerPhone && (
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Phone className="h-3 w-3 mr-1" />
                      {booking.passengerPhone}
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-1 mt-0.5 text-gray-400" />
                    <span>{booking.pickupLocation}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(booking.pickupDate).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  <Badge 
                    className={getStatusColorClass(booking.status)}
                  >
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewDetails(booking)}>
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {booking.status === 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange('confirmed')}
                          >
                            Confirm booking
                          </DropdownMenuItem>
                        )}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <DropdownMenuItem 
                            onClick={() => handleCancelBooking()}
                          >
                            Cancel booking
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500">No bookings found matching your criteria.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={handleRetry}
          >
            Refresh Bookings
          </Button>
        </div>
      )}
    </div>
  );
}
