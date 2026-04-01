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
import { AlertCircle, MapPin, Phone, Mail, MoreHorizontal, RefreshCw, Wifi, Calendar, Car, IndianRupee, Trash2, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { bookingPickupInDateRange, bookingsToCsv, buildBookingExportRows } from '@/utils/adminBookingsExport';
import { AdminBookingsExportPDF } from '@/components/pdf/AdminBookingsExportPDF';
import { usePrivileges } from '@/hooks/usePrivileges';
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
import { getStatusColorClass, formatPassengerPhoneForDisplay } from '@/utils/bookingUtils';
import { getApiUrl } from '@/config/api';
import { formatPrice } from '@/lib/utils';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatLocationForDisplay } from '@/utils/locationUtils';

export function AdminBookingsList() {
  const { toast: uiToast } = useToast();
  const navigate = useNavigate();
  const { isSuperAdmin } = usePrivileges();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pickupDateFrom, setPickupDateFrom] = useState('');
  const [pickupDateTo, setPickupDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiAttempt, setApiAttempt] = useState(0);
  const [responseDebug, setResponseDebug] = useState<string | null>(null);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const customScrollRef = useRef<HTMLDivElement>(null);
  const [showCustomScrollbar, setShowCustomScrollbar] = useState(true);

  const getBookingIdentifier = (booking: Booking | null | undefined): number | null => {
    if (!booking) return null;
    const candidate = (booking as any).id ?? (booking as any).bookingId ?? (booking as any).booking_id;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  /** Merge API/client patches into the row and keep the open modal in sync (fixes fleet vehicle dropdown showing empty after assign). */
  const patchBookingInListAndModal = (
    bookingId: number,
    patchFromApi: Record<string, unknown>,
    clientPatch?: Partial<Booking>
  ): Booking[] => {
    const base =
      bookings.find((b) => b.id === bookingId) ||
      (selectedBooking?.id === bookingId ? selectedBooking : null);
    if (!base) return bookings;
    const merged = { ...base, ...(patchFromApi as Partial<Booking>), ...(clientPatch || {}) } as Booking;
    const updatedBookings = bookings.map((b) => (b.id === bookingId ? merged : b));
    setBookings(updatedBookings);
    setSelectedBooking((prev) => (prev && prev.id === bookingId ? merged : prev));
    return updatedBookings;
  };
  
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
        // Prefer the rich admin bookings API (includes GST fields)
        setApiAttempt(1);
        console.log('Fetching via bookingAPI.getAllBookings()');
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
        console.warn('bookingAPI attempt failed, trying direct-booking-data.php as fallback:', apiError);
        setApiAttempt(2);
        // Fallback to direct-booking-data (may be sample, fewer fields)
        try {
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
                data = directData.map((booking: any) => ({ ...booking, status: booking.status as BookingStatus }));
                responseSource = 'direct_api';
              } else if (directData && Array.isArray(directData.bookings)) {
                data = directData.bookings.map((booking: any) => ({ ...booking, status: booking.status as BookingStatus }));
                responseSource = 'direct_api_bookings_property';
              } else if (directData && Array.isArray(directData.data)) {
                data = directData.data.map((booking: any) => ({ ...booking, status: booking.status as BookingStatus }));
                responseSource = 'direct_api_data_property';
              }
            }
          }
        } catch (directErr) {
          console.error('Fallback direct endpoint failed:', directErr);
          throw new Error('Failed to load bookings from API');
        }
      }
      
      if (Array.isArray(data) && data.length > 0) {
        setBookings(data);
        applyFilters(data);
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
  
  const handleViewDetails = async (booking: Booking) => {
    // Fetch full booking details including tour itinerary
    try {
      const fullBooking = await bookingAPI.getBookingById(booking.id);
      setSelectedBooking(fullBooking);
    } catch (error) {
      console.error('Error fetching full booking details:', error);
      // Fallback to using the list data if fetch fails
      setSelectedBooking(booking);
      uiToast({
        title: "Warning",
        description: "Could not load full booking details. Some information may be missing.",
        variant: "default",
      });
    }
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
        
        const updatedBooking = response.data || {};
        const nextBookings = patchBookingInListAndModal(selectedBooking.id, updatedBooking as Record<string, unknown>, updatedData);
        applyFilters(nextBookings);
        
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
      
      const updatedBooking = response.data || {};
      const nextBookings = patchBookingInListAndModal(selectedBooking.id, updatedBooking as Record<string, unknown>, updatedData);
      applyFilters(nextBookings);
      
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
        
        const updatedBooking = response.data || {};
        const nextBookings = patchBookingInListAndModal(selectedBooking.id, updatedBooking as Record<string, unknown>, updatedData);
        applyFilters(nextBookings);
        
        toast.success("Driver assigned successfully");
        return;
      } catch (apiError) {
        console.warn('bookingAPI.assignDriver failed, trying direct fetch:', apiError);
      }

      const driverPayload = driverData as { driverId?: string; driverName: string; driverPhone: string; vehicleNumber: string };
      const directResponse = await fetch(getApiUrl('/api/admin/assign-driver.php'), {
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
          driverId: driverPayload.driverId,
          driverName: driverPayload.driverName,
          driverPhone: driverPayload.driverPhone,
          vehicleNumber: driverPayload.vehicleNumber
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
      
      const updatedBooking = response.data || {};
      const nextBookings = patchBookingInListAndModal(selectedBooking.id, updatedBooking as Record<string, unknown>, updatedData);
      applyFilters(nextBookings);
      
      toast.success("Driver assigned successfully");
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error("Failed to assign driver: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (booking?: Booking) => {
    const targetBooking = booking || selectedBooking;
    if (!targetBooking) return;
    const targetBookingId = getBookingIdentifier(targetBooking);
    if (!targetBookingId) {
      toast.error("Failed to cancel booking: Missing booking ID");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Try bookingAPI first
      try {
        await bookingAPI.cancelBooking(targetBookingId);
        
        // Update the bookings list
        const updatedBookings = bookings.map(booking => 
          getBookingIdentifier(booking) === targetBookingId ? { ...booking, status: 'cancelled' as BookingStatus } : booking
        );
        setBookings(updatedBookings);
        applyFilters(updatedBookings);
        
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
          bookingId: targetBookingId,
          booking_id: targetBookingId,
          id: targetBookingId,
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
        getBookingIdentifier(booking) === targetBookingId ? { ...booking, status: 'cancelled' as BookingStatus } : booking
      );
      setBookings(updatedBookings);
      applyFilters(updatedBookings);
      
      toast.success("Booking cancelled successfully");
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error("Failed to cancel booking: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBooking = async (booking?: Booking) => {
    const targetBooking = booking || selectedBooking;
    if (!targetBooking) return;
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete booking #${targetBooking.bookingNumber || targetBooking.id}?\n\n` +
      `This action cannot be undone and will permanently remove the booking from the system.`
    );
    
    if (!confirmed) return;
    
    setIsSubmitting(true);
    try {
      // Try bookingAPI first
      try {
        await bookingAPI.deleteBooking(targetBooking.id);
        
        // Remove from bookings list
        const updatedBookings = bookings.filter(b => b.id !== targetBooking.id);
        setBookings(updatedBookings);
        applyFilters(updatedBookings);
        
        toast.success("Booking deleted successfully");
        return;
      } catch (apiError) {
        console.warn('bookingAPI.deleteBooking failed, trying direct fetch:', apiError);
      }
      
      // Direct fetch for better debugging
      const directResponse = await fetch('/api/admin/delete-booking.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        },
        body: JSON.stringify({
          bookingId: targetBooking.id
        })
      });
      
      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error('Delete booking error response:', errorText);
        throw new Error(`Failed to delete booking: ${directResponse.status} ${directResponse.statusText}`);
      }
      
      // Remove from bookings list
      const updatedBookings = bookings.filter(b => b.id !== targetBooking.id);
      setBookings(updatedBookings);
      applyFilters(updatedBookings);
      
      toast.success("Booking deleted successfully");
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error("Failed to delete booking: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: BookingStatus, booking?: Booking) => {
    const targetBooking = booking || selectedBooking;
    if (!targetBooking) return;
    
    console.log('🔄 Status change requested:', { bookingId: targetBooking.id, currentStatus: targetBooking.status, newStatus });
    
    setIsSubmitting(true);
    try {
      // Try bookingAPI first
      try {
        console.log('📤 Calling bookingAPI.updateBookingStatus...');
        const response = await bookingAPI.updateBookingStatus(targetBooking.id, newStatus);
        console.log('✅ bookingAPI response:', response);
        
        // Update the bookings list
        const updatedBookings = bookings.map(booking => 
          booking.id === targetBooking.id ? { ...booking, status: newStatus } : booking
        );
        setBookings(updatedBookings);
        applyFilters(updatedBookings);
        
        toast.success(`Booking status updated to ${newStatus}`);
        return;
      } catch (apiError) {
        console.warn('❌ bookingAPI.updateBookingStatus failed, trying direct fetch:', apiError);
      }
      
      // Direct fetch for better debugging
      console.log('📤 Trying direct fetch to /api/admin/update-booking.php...');
      const requestBody = {
        bookingId: targetBooking.id,
        status: newStatus
      };
      console.log('📤 Request body:', requestBody);
      
      const directResponse = await fetch('/api/admin/update-booking.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📥 Direct response status:', directResponse.status);
      console.log('📥 Direct response headers:', Object.fromEntries(directResponse.headers.entries()));
      
      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error('❌ Status update error response:', errorText);
        throw new Error(`Failed to update status: ${directResponse.status} ${directResponse.statusText}`);
      }
      
      const responseText = await directResponse.text();
      console.log('📥 Direct response body:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('✅ Parsed response data:', responseData);
      } catch (e) {
        console.error('❌ Failed to parse response as JSON:', e);
        throw new Error('Invalid JSON response from server');
      }
      
      // Update the bookings list
      const updatedBookings = bookings.map(booking => 
        booking.id === targetBooking.id ? { ...booking, status: newStatus } : booking
      );
      setBookings(updatedBookings);
      applyFilters(updatedBookings);
      
      console.log('✅ Updated bookings list:', updatedBookings.find(b => b.id === targetBooking.id));
      toast.success(`Booking status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error("Failed to update booking status: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateInvoice = async (
    gstEnabled?: boolean,
    gstDetails?: any,
    isIGST?: boolean,
    includeTax?: boolean,
    customInvoiceNumber?: string,
    adminNotes?: string
  ) => {
    if (!selectedBooking) return null;
    setIsSubmitting(true);
    try {
      // Generate invoice using the proper endpoint
      const apiUrl = getApiUrl('/api/admin/generate-invoice.php');
      
      // #region agent log
      console.log('📤 Generating invoice for booking:', selectedBooking.id);
      console.log('GST Settings:', { gstEnabled, isIGST, includeTax, customInvoiceNumber, includeTaxType: typeof includeTax, includeTaxUndefined: includeTax === undefined });
      // #endregion
      
      // CRITICAL FIX: Don't default to true - if includeTax is undefined, it means GST is disabled
      // Only default to true if gstEnabled is true AND includeTax is undefined
      const finalIncludeTax = includeTax !== undefined 
        ? includeTax 
        : (gstEnabled ? true : false); // Only default to true if GST is enabled
      
      // #region agent log
      console.log('🔍 includeTax parameter processing:', {
        received: includeTax,
        receivedType: typeof includeTax,
        gstEnabled,
        finalIncludeTax,
        note: 'Final value being sent to backend'
      });
      // #endregion
      
      const requestBody: any = {
        bookingId: selectedBooking.id,
        gstEnabled: gstEnabled || false,
        isIGST: isIGST || false,
        includeTax: finalIncludeTax,
        invoiceNumber: customInvoiceNumber || '',
        gstDetails: gstDetails || {},
        adminNotes: (adminNotes || '').trim() || undefined
      };
      
      // #region agent log
      console.log('📤 Request body being sent to backend:', requestBody);
      // #endregion
      
      // Extract lockedBaseFare from gstDetails if present
      if (gstDetails && typeof gstDetails === 'object' && 'lockedBaseFare' in gstDetails) {
        requestBody.lockedBaseFare = gstDetails.lockedBaseFare;
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate invoice: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        throw new Error('Invoice API returned non-JSON response: ' + textResponse);
      }
      
      const data = await response.json();
      if (data.status === 'success') {
        console.log('✅ Invoice generated successfully:', data.data);
        toast.success('Invoice generated successfully');
        return data;
      } else {
        throw new Error(data.message || 'Unknown error generating invoice');
      }
    } catch (error) {
      console.error('❌ Invoice generation error:', error);
      toast.error('Failed to generate invoice: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [retryCount]);

  useEffect(() => {
    applyFilters(bookings);
  }, [searchTerm, statusFilter, bookings, pickupDateFrom, pickupDateTo]);

  const applyFilters = (bookingsArray: Booking[]) => {
    console.log('Applying filters:', { searchTerm, statusFilter, pickupDateFrom, pickupDateTo });
    console.log('Bookings to filter:', bookingsArray.length);
    
    let filtered = [...bookingsArray];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => {
        const phoneDisplay = formatPassengerPhoneForDisplay(
          booking.passengerPhone,
          booking.passengerCountryCode
        ).toLowerCase();
        return (
        (booking.bookingNumber && booking.bookingNumber.toLowerCase().includes(term)) ||
        (booking.passengerName && booking.passengerName.toLowerCase().includes(term)) ||
        (booking.passengerPhone && booking.passengerPhone.includes(term)) ||
        (phoneDisplay && phoneDisplay.includes(term)) ||
        (booking.passengerCountryCode && booking.passengerCountryCode.toLowerCase().includes(term)) ||
        (booking.passengerEmail && booking.passengerEmail.toLowerCase().includes(term)) ||
        (booking.pickupLocation && booking.pickupLocation.toLowerCase().includes(term))
        );
      });
      console.log('After search filter:', filtered.length);
    }

    if (pickupDateFrom.trim() !== '' || pickupDateTo.trim() !== '') {
      filtered = filtered.filter((booking) =>
        bookingPickupInDateRange(booking.pickupDate, pickupDateFrom, pickupDateTo)
      );
      console.log('After pickup date filter:', filtered.length);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
      console.log('After status filter:', filtered.length);
    }
    
    setFilteredBookings(filtered);
  };

  const exportFileNameSuffix = () => {
    const a = pickupDateFrom.trim();
    const b = pickupDateTo.trim();
    if (a && b) return `${a}_to_${b}`;
    if (a) return `from_${a}`;
    if (b) return `to_${b}`;
    return new Date().toISOString().slice(0, 10);
  };

  const handleDownloadCsv = () => {
    if (filteredBookings.length === 0) {
      toast.info('No bookings to export');
      return;
    }
    const rows = buildBookingExportRows(
      filteredBookings,
      formatDateTime,
      formatPassengerPhoneForDisplay,
      (loc) => formatLocationForDisplay(loc).name,
      (loc) => formatLocationForDisplay(loc).name,
      formatPrice
    );
    const csv = bookingsToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `vizag-bookings-${exportFileNameSuffix()}.csv`);
    toast.success(`Downloaded ${filteredBookings.length} row(s) as CSV`);
  };

  const handleDownloadPdf = async () => {
    if (filteredBookings.length === 0) {
      toast.info('No bookings to export');
      return;
    }
    setIsExportingPdf(true);
    try {
      const pdfRows = filteredBookings.map((b) => ({
        bookingNumber: b.bookingNumber ?? String(b.id ?? ''),
        passengerName: b.passengerName ?? '',
        phone: formatPassengerPhoneForDisplay(b.passengerPhone, b.passengerCountryCode),
        pickup: formatLocationForDisplay(b.pickupLocation ?? '').name.slice(0, 200),
        drop: formatLocationForDisplay(b.dropLocation ?? '').name.slice(0, 200),
        pickupDate: formatDateTime(b.pickupDate ?? ''),
        cabType: b.cabType ?? '',
        amount: formatPrice(Number(b.totalAmount ?? 0)),
        status: String(b.status ?? ''),
        paymentStatus: String((b as Booking & { payment_status?: string }).payment_status ?? '—'),
      }));
      const blob = await pdf(
        <AdminBookingsExportPDF
          title="Vizag Taxi Hub — Bookings"
          generatedAt={new Date().toLocaleString('en-IN')}
          rows={pdfRows}
        />
      ).toBlob();
      saveAs(blob, `vizag-bookings-${exportFileNameSuffix()}.pdf`);
      toast.success(`Downloaded ${filteredBookings.length} booking(s) as PDF`);
    } catch (e) {
      console.error(e);
      toast.error('Could not generate PDF');
    } finally {
      setIsExportingPdf(false);
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

  // Helper to format date and time consistently with frontend
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      // Treat SQL datetime as IST (no timezone conversion needed)
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      
      // Format: "13 Aug 2025 at 12:31 PM" (same as frontend)
      return `${day} ${month} ${year} at ${displayHours}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
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
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between xl:flex-wrap">
        <div className="grid gap-2 w-full min-w-0 sm:max-w-md">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search by name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="grid gap-2 w-full sm:w-40">
            <Label htmlFor="pickup-from">Pickup from</Label>
            <Input
              id="pickup-from"
              type="date"
              value={pickupDateFrom}
              onChange={(e) => setPickupDateFrom(e.target.value)}
              className="min-h-10"
            />
          </div>
          <div className="grid gap-2 w-full sm:w-40">
            <Label htmlFor="pickup-to">Pickup to</Label>
            <Input
              id="pickup-to"
              type="date"
              value={pickupDateTo}
              onChange={(e) => setPickupDateTo(e.target.value)}
              className="min-h-10"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="sm:mb-0.5 h-10"
            onClick={() => {
              setPickupDateFrom('');
              setPickupDateTo('');
            }}
            disabled={!pickupDateFrom && !pickupDateTo}
          >
            Clear dates
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={handleDownloadCsv}
            disabled={filteredBookings.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={handleDownloadPdf}
            disabled={filteredBookings.length === 0 || isExportingPdf}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExportingPdf ? 'PDF…' : 'PDF'}
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 xl:self-end">
          <div className="grid gap-2 sm:w-48">
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
            className="h-10 mt-auto"
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
          onStatusChange={(newStatus) => handleStatusChange(newStatus, selectedBooking)}
          isSubmitting={isSubmitting}
        />
      )}

      {filteredBookings.length > 0 ? (
        <div className="bg-card rounded-lg border shadow-sm">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-sm w-32">Booking #</TableHead>
                  <TableHead className="font-semibold text-sm min-w-[200px]">Passenger</TableHead>
                  <TableHead className="font-semibold text-sm min-w-[300px]">Route</TableHead>
                  <TableHead className="font-semibold text-sm min-w-[160px]">Pickup Date & Time</TableHead>
                  <TableHead className="font-semibold text-sm min-w-[140px]">Vehicle type</TableHead>
                  <TableHead className="font-semibold text-sm w-28">Amount</TableHead>
                  <TableHead className="font-semibold text-sm w-24">Status</TableHead>
                  <TableHead className="font-semibold text-sm w-28">Payment Status</TableHead>
                  <TableHead className="font-semibold text-sm w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-primary">
                      {booking.bookingNumber}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{booking.passengerName}</div>
                        {booking.passengerPhone && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 mr-1.5" />
                            {formatPassengerPhoneForDisplay(
                              booking.passengerPhone,
                              booking.passengerCountryCode
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm leading-relaxed">
                            {(() => {
                              const pickup = formatLocationForDisplay(booking.pickupLocation);
                              return (
                                <div>
                                  <div className="font-semibold text-sm">{pickup.name}</div>
                                  {pickup.address && pickup.address !== pickup.name && (
                                    <div className="text-xs text-gray-500 mt-1">{pickup.address}</div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-4 h-px bg-border"></div>
                          <span className="text-xs">to</span>
                          <div className="w-4 h-px bg-border"></div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm leading-relaxed">
                            {(() => {
                              const drop = formatLocationForDisplay(booking.dropLocation);
                              return (
                                <div>
                                  <div className="font-semibold text-sm">{drop.name}</div>
                                  {drop.address && drop.address !== drop.name && (
                                    <div className="text-xs text-gray-500 mt-1">{drop.address}</div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div className="text-sm">
                          {formatDateTime(booking.pickupDate)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <span className="font-medium">
                          {(booking.cabType || booking.vehicle_type || '—').toString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center font-semibold text-lg">
                        {formatPrice(booking.totalAmount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`${getStatusColorClass(booking.status)} capitalize`}
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={(booking.payment_status || booking.status) === 'paid' ? 'default' : 'secondary'}
                        className={
                          (booking.payment_status || booking.status) === 'paid'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }
                      >
                        {(booking.payment_status || booking.status) === 'paid'
                          ? 'Paid'
                          : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(booking)}>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {booking.status === 'pending' && (
                            <DropdownMenuItem onClick={() => {
                              handleStatusChange('confirmed', booking);
                            }}>
                              Confirm booking
                            </DropdownMenuItem>
                          )}
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <DropdownMenuItem onClick={() => {
                              handleCancelBooking(booking);
                            }}>
                              Cancel booking
                            </DropdownMenuItem>
                          )}
                          {isSuperAdmin() && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteBooking(booking)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete booking
                              </DropdownMenuItem>
                            </>
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
