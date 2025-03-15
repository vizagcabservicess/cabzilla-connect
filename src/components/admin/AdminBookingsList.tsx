
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
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AdminBookingsList() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Admin: Fetching all bookings...');
        
        const data = await bookingAPI.getAllBookings();
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

    fetchBookings();
  }, [toast]);

  useEffect(() => {
    // Apply filters when search term or status filter changes
    let filtered = bookings;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.bookingNumber.toLowerCase().includes(term) ||
        booking.passengerName.toLowerCase().includes(term) ||
        booking.passengerPhone.includes(term) ||
        booking.passengerEmail.toLowerCase().includes(term) ||
        booking.pickupLocation.toLowerCase().includes(term)
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
      default: return 'bg-gray-100 text-gray-800';
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
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredBookings.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{booking.passengerName}</div>
                    <div className="text-xs text-gray-500">{booking.passengerPhone}</div>
                  </TableCell>
                  <TableCell>
                    <div>{booking.tripType.toUpperCase()}</div>
                    <div className="text-xs text-gray-500">
                      {booking.pickupLocation} {booking.dropLocation ? `to ${booking.dropLocation}` : ''}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(booking.pickupDate).toLocaleDateString()}</TableCell>
                  <TableCell>₹{booking.totalAmount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/admin/booking/${booking.id}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
