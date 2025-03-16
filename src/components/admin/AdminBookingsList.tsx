
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
import { bookingAPI } from '@/services/api';
import { Booking } from '@/types/api';
import { AlertCircle, MapPin, Phone, Mail, CheckCircle, XCircle, MoreHorizontal, FileText, Truck, CalendarDays, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

export function AdminBookingsList() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Status update dialog state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Driver assignment dialog state
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  
  // Receipt dialog state
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Admin: Fetching all bookings...');
      
      // Temporary fallback to getUserBookings if getAllBookings fails
      let data;
      try {
        data = await bookingAPI.getAllBookings();
      } catch (error) {
        console.warn('getAllBookings failed, falling back to getUserBookings');
        data = await bookingAPI.getUserBookings();
      }
      
      console.log('Admin: Bookings received:', data);
      
      if (Array.isArray(data)) {
        setBookings(data);
        setFilteredBookings(data);
      } else {
        console.error('Admin: Invalid data format received:', data);
        throw new Error('Invalid data format received from server');
      }
    } catch (error) {
      console.error('Admin: Error fetching bookings:', error);
      setError(error instanceof Error ? error.message : 'Failed to load bookings');
      
      toast({
        title: "Error",
        description: "Failed to load bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Apply filters when search term or status filter changes
    let filtered = bookings;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.bookingNumber?.toLowerCase().includes(term) ||
        booking.passengerName?.toLowerCase().includes(term) ||
        booking.passengerPhone?.includes(term) ||
        booking.passengerEmail?.toLowerCase().includes(term) ||
        booking.pickupLocation?.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }
    
    setFilteredBookings(filtered);
  }, [searchTerm, statusFilter, bookings]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'postponed': return 'bg-purple-100 text-purple-800';
      case 'updated': return 'bg-indigo-100 text-indigo-800';
      case 'assigned': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleOpenStatusDialog = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setNewStatus('');
    setStatusNotes('');
    setIsStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedBookingId || !newStatus) {
      toast({
        title: "Missing Information",
        description: "Please select a status.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdatingStatus(true);
      await bookingAPI.updateBookingStatus(selectedBookingId, newStatus, statusNotes);
      
      toast({
        title: "Status Updated",
        description: `Booking status has been updated to ${newStatus}.`,
      });
      
      // Refresh the bookings list
      fetchBookings();
      
      // Close the dialog
      setIsStatusDialogOpen(false);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update booking status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenDriverDialog = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setDriverName('');
    setDriverPhone('');
    setIsDriverDialogOpen(true);
  };

  const handleAssignDriver = async () => {
    if (!selectedBookingId || !driverName || !driverPhone) {
      toast({
        title: "Missing Information",
        description: "Please enter driver name and phone number.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAssigningDriver(true);
      await bookingAPI.assignDriver(selectedBookingId, "driver-" + Date.now(), driverName, driverPhone);
      
      toast({
        title: "Driver Assigned",
        description: `Driver ${driverName} has been assigned to the booking.`,
      });
      
      // Refresh the bookings list
      fetchBookings();
      
      // Close the dialog
      setIsDriverDialogOpen(false);
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to assign driver.",
        variant: "destructive",
      });
    } finally {
      setIsAssigningDriver(false);
    }
  };

  const handleViewReceipt = async (bookingId: string) => {
    try {
      setIsLoadingReceipt(true);
      setSelectedBookingId(bookingId);
      setIsReceiptDialogOpen(true);
      
      // Get the booking data for the receipt
      const booking = bookings.find(b => b.id.toString() === bookingId.toString());
      
      if (!booking) {
        throw new Error("Booking not found");
      }
      
      // Try to fetch a server-generated receipt if available
      try {
        const receiptData = await bookingAPI.getBookingReceipt(bookingId);
        setReceiptData(receiptData);
      } catch (error) {
        console.warn('Server receipt not available, using client-side generation', error);
        // Fall back to client-side receipt generation
        setReceiptData(booking);
      }
    } catch (error) {
      console.error('Error viewing receipt:', error);
      toast({
        title: "Error",
        description: "Failed to load receipt. Please try again.",
        variant: "destructive",
      });
      setIsReceiptDialogOpen(false);
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await bookingAPI.updateBookingStatus(bookingId, 'cancelled', 'Cancelled by admin');
      
      toast({
        title: "Booking Cancelled",
        description: "The booking has been cancelled successfully.",
      });
      
      // Refresh the bookings list
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "Failed to cancel booking.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="ml-4"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
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
              <SelectItem value="postponed">Postponed</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchBookings}
          className="md:ml-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

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
                      <div>{formatDate(booking.pickupDate)}</div>
                      <div className="text-xs text-gray-500">
                        {formatTime(booking.pickupDate)}
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
                          <DropdownMenuItem onClick={() => handleViewReceipt(booking.id.toString())}>
                            <FileText className="h-4 w-4 mr-2" />
                            View Receipt
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenStatusDialog(booking.id.toString())}>
                            <CalendarDays className="h-4 w-4 mr-2" />
                            Update Status
                          </DropdownMenuItem>
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <DropdownMenuItem onClick={() => handleOpenDriverDialog(booking.id.toString())}>
                              <Truck className="h-4 w-4 mr-2" />
                              Assign Driver
                            </DropdownMenuItem>
                          )}
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <DropdownMenuItem 
                              onClick={() => handleCancelBooking(booking.id.toString())}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
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

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Booking Status</DialogTitle>
            <DialogDescription>
              Change the status of this booking. This will notify the customer via email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">New Status</Label>
              <Select onValueChange={setNewStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="postponed">Postponed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes for the customer about this status change"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver Assignment Dialog */}
      <Dialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription>
              Assign a driver to this booking. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="driverName">Driver Name</Label>
              <Input 
                id="driverName" 
                value={driverName} 
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Enter driver's full name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="driverPhone">Driver Phone</Label>
              <Input 
                id="driverPhone" 
                value={driverPhone} 
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="Enter driver's phone number"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDriverDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignDriver} disabled={isAssigningDriver}>
              {isAssigningDriver ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : 'Assign Driver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Booking Receipt</DialogTitle>
            <DialogDescription>
              Receipt details for booking {selectedBookingId}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingReceipt ? (
            <div className="flex justify-center p-10">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : receiptData ? (
            <div className="bg-white p-6 border rounded-md">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">AP TOURISM CABS</h2>
                <p className="text-sm text-gray-500">Booking Receipt</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Booking Number</p>
                  <p className="font-medium">{receiptData.bookingNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Booking Date</p>
                  <p className="font-medium">{formatDate(receiptData.createdAt || receiptData.pickupDate)}</p>
                </div>
              </div>
              
              <div className="border-t border-b py-4 mb-6">
                <h3 className="font-semibold mb-2">Customer Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{receiptData.passengerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contact</p>
                    <p className="font-medium">{receiptData.passengerPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{receiptData.passengerEmail}</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Trip Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Trip Type</p>
                    <p className="font-medium">{receiptData.tripType} ({receiptData.tripMode})</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vehicle</p>
                    <p className="font-medium">{receiptData.cabType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pickup Date & Time</p>
                    <p className="font-medium">{formatDate(receiptData.pickupDate)} {formatTime(receiptData.pickupDate)}</p>
                  </div>
                  {receiptData.returnDate && (
                    <div>
                      <p className="text-sm text-gray-500">Return Date & Time</p>
                      <p className="font-medium">{formatDate(receiptData.returnDate)} {formatTime(receiptData.returnDate)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">From</p>
                    <p className="font-medium">{receiptData.pickupLocation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">To</p>
                    <p className="font-medium">{receiptData.dropLocation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Distance</p>
                    <p className="font-medium">{receiptData.distance} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge className={getStatusColor(receiptData.status)}>
                      {receiptData.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center py-2">
                  <p className="font-semibold">Total Amount:</p>
                  <p className="font-bold text-xl">₹{receiptData.totalAmount.toLocaleString('en-IN')}</p>
                </div>
                <p className="text-xs text-gray-500 text-right">Includes all taxes & fees</p>
              </div>
              
              <div className="text-center text-sm text-gray-500 mt-8">
                <p>Thank you for choosing AP Tourism Cabs!</p>
                <p className="mt-1">For inquiries, call: +91 9876543210</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No receipt data available for this booking.
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => window.print()} className="mr-2">
              Print Receipt
            </Button>
            <Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
