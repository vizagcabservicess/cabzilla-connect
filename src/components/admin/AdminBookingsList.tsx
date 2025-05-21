import { useState, useEffect, useRef } from 'react';
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
import { AlertCircle, MapPin, Phone, Mail, MoreHorizontal, RefreshCw, Wifi, Calendar, Car, IndianRupee } from 'lucide-react';
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
import { BookingDetailsModal } from './BookingDetailsModal';
import { getStatusColorClass } from '@/utils/bookingUtils';
import { getApiUrl } from '@/config/api';
import { formatPrice } from '@/lib/utils';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
  
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const customScrollRef = useRef<HTMLDivElement>(null);
  const [showCustomScrollbar, setShowCustomScrollbar] = useState(true);
  
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
        console.error('API attempts failed:', apiError);
        throw new Error('Failed to load bookings from API');
      }
      
      if (Array.isArray(data) && data.length > 0) {
        setBookings(data);
        applyFilters(data, searchTerm, statusFilter);
        toast.success(`${data.length} bookings loaded successfully (${responseSource})`, {
          id: 'bookings-loaded',
        });
      } else {
        console.log('No bookings found in the response');
        setBookings([]);
        setFilteredBookings([]);
        toast.info('No bookings found', {
          id: 'no-bookings',
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

  // Helper to format date and time nicely
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Sync scroll positions
  const handleTableScroll = () => {
    if (tableScrollRef.current && customScrollRef.current) {
      customScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
  };
  
  const handleCustomScroll = () => {
    if (tableScrollRef.current && customScrollRef.current) {
      tableScrollRef.current.scrollLeft = customScrollRef.current.scrollLeft;
    }
  };

  // Always show custom scrollbar
  useEffect(() => {
    setShowCustomScrollbar(true);
  }, []);

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
        <BookingDetailsModal
          booking={selectedBooking}
          isOpen={!!selectedBooking}
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
        <div className="relative">
          <ScrollArea className="h-[calc(70vh-20px)] w-full rounded-md border">
            <div className="min-w-[2000px]"> {/* Force minimum width to ensure scrolling */}
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="text-xs">Booking #</TableHead>
                    <TableHead className="text-xs">Passenger</TableHead>
                    <TableHead className="text-xs">Route</TableHead>
                    <TableHead className="text-xs">Pickup Date & Time</TableHead>
                    <TableHead className="text-xs">Vehicle & Trip Type</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Payment Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id} className="text-sm">
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
                      <TableCell>
                        <div
                          className="flex items-center gap-1 max-w-lg whitespace-normal"
                          title={`${booking.pickupLocation} → ${booking.dropLocation}`}
                          style={{ whiteSpace: 'normal' }}
                        >
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="whitespace-normal break-words">{booking.pickupLocation}</span>
                          <span className="mx-1 text-gray-400">→</span>
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="whitespace-normal break-words">{booking.dropLocation}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {formatDateTime(booking.pickupDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-gray-400" />
                          <span>{booking.cabType}</span>
                          <span className="text-gray-500">({booking.tripType})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center font-medium">
                          <IndianRupee className="h-3.5 w-3.5 mr-1" />
                          {formatPrice(booking.totalAmount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={getStatusColorClass(booking.status)}
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            (booking.paymentStatus || booking.payment_status || booking.status) === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {(booking.paymentStatus || booking.payment_status || booking.status) === 'paid'
                            ? 'Paid'
                            : 'Pending'}
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
            </div>
            <ScrollBar orientation="horizontal" className="h-3 bg-gray-100" />
          </ScrollArea>
        </div>
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
