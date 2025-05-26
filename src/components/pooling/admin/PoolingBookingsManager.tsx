
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: number;
  rideId: number;
  userId: number;
  userName: string;
  userPhone: string;
  seats: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

export function PoolingBookingsManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState<Partial<Booking>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/pooling/bookings');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (booking?: Booking) => {
    if (booking) {
      setSelectedBooking(booking);
      setFormData(booking);
    } else {
      setSelectedBooking(null);
      setFormData({});
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBooking(null);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedBooking 
        ? `/api/pooling/bookings/${selectedBooking.id}`
        : '/api/pooling/bookings';
      
      const method = selectedBooking ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save booking');
      
      await fetchBookings();
      handleCloseDialog();
      toast({
        title: "Success",
        description: "Booking saved successfully"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save booking"
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    
    try {
      const response = await fetch(`/api/pooling/bookings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete booking');
      
      await fetchBookings();
      toast({
        title: "Success",
        description: "Booking deleted successfully"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete booking"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'confirmed' ? 'default' : 
                   status === 'pending' ? 'secondary' :
                   status === 'cancelled' ? 'destructive' : 'outline';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const variant = status === 'paid' ? 'default' : 
                   status === 'pending' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{status}</Badge>;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Pooling Bookings Management</CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              Add New Booking
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Seats</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Payment</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-b">
                    <td className="p-2">{booking.id}</td>
                    <td className="p-2">{booking.userName}</td>
                    <td className="p-2">{booking.userPhone}</td>
                    <td className="p-2">{booking.seats}</td>
                    <td className="p-2">₹{booking.totalAmount}</td>
                    <td className="p-2">{getStatusBadge(booking.status)}</td>
                    <td className="p-2">{getPaymentStatusBadge(booking.paymentStatus)}</td>
                    <td className="p-2">
                      {format(new Date(booking.createdAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenDialog(booking)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(booking.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedBooking ? 'Edit Booking' : 'Add New Booking'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  type="number"
                  value={formData.userId || ''}
                  onChange={(e) => setFormData({ ...formData, userId: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="rideId">Ride ID</Label>
                <Input
                  id="rideId"
                  type="number"
                  value={formData.rideId || ''}
                  onChange={(e) => setFormData({ ...formData, rideId: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="seats">Seats</Label>
                <Input
                  id="seats"
                  type="number"
                  value={formData.seats || ''}
                  onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="totalAmount">Total Amount</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  value={formData.totalAmount || ''}
                  onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status || ''} 
                  onValueChange={(value: 'pending' | 'confirmed' | 'cancelled' | 'completed') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select 
                  value={formData.paymentStatus || ''} 
                  onValueChange={(value: 'pending' | 'paid' | 'refunded') => 
                    setFormData({ ...formData, paymentStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedBooking ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PoolingBookingsManager;
