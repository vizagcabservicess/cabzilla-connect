import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Booking, BookingStatus } from '@/types/api';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

interface PoolingBookingsManagerProps {
  bookings: Booking[];
  onUpdateBooking: (id: number, updates: Partial<Booking>) => void;
  onCreatePooling: (bookingIds: number[]) => void;
}

export function PoolingBookingsManager({ 
  bookings, 
  onUpdateBooking, 
  onCreatePooling 
}: PoolingBookingsManagerProps) {
  const [selectedBookings, setSelectedBookings] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<BookingStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    const matchesSearch = !searchTerm || 
      booking.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.dropLocation && booking.dropLocation.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  const handleBookingSelect = (bookingId: number) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleCreatePooling = () => {
    if (selectedBookings.length < 2) {
      alert('Please select at least 2 bookings to create a pool');
      return;
    }
    
    onCreatePooling(selectedBookings);
    setSelectedBookings([]);
  };

  const getStatusBadgeColor = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-500 text-white';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pooling Bookings Manager</h2>
        <Button 
          onClick={handleCreatePooling}
          disabled={selectedBookings.length < 2}
        >
          Create Pool ({selectedBookings.length})
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Bookings</Label>
              <Input
                id="search"
                placeholder="Search by passenger name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as BookingStatus | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Grid */}
      <div className="grid gap-4">
        {filteredBookings.map((booking) => (
          <Card 
            key={booking.id} 
            className={`cursor-pointer transition-all ${
              selectedBookings.includes(booking.id) 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleBookingSelect(booking.id)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">#{booking.bookingNumber}</h3>
                  <p className="text-gray-600">{booking.passengerName}</p>
                </div>
                <Badge className={getStatusBadgeColor(booking.status)}>
                  {booking.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium">From:</div>
                    <div className="text-gray-600">{booking.pickupLocation}</div>
                  </div>
                </div>
                
                {booking.dropLocation && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="font-medium">To:</div>
                      <div className="text-gray-600">{booking.dropLocation}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium">Date:</div>
                    <div className="text-gray-600">
                      {new Date(booking.pickupDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium">Amount:</div>
                    <div className="text-gray-600">₹{booking.totalAmount}</div>
                  </div>
                </div>
              </div>
              
              {booking.cabType && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Vehicle:</span>
                  <span className="text-gray-600">{booking.cabType}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBookings.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No bookings found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PoolingBookingsManager;
