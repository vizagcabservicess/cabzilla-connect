import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { format } from 'date-fns';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
type PaymentStatus = 'pending' | 'paid' | 'refunded';

interface Booking {
  id: number;
  rideId: number;
  userId: number;
  userName: string;
  userPhone: string;
  seats: number;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

const PoolingBookingsManager: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState<Partial<Booking>>({});

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/pooling/bookings.php');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      const mapped = data.map((b: any) => ({
        id: b.id,
        rideId: b.ride_id,
        userId: b.user_id,
        userName: b.passenger_name,
        userPhone: b.passenger_phone,
        seats: b.seats_booked,
        totalAmount: parseFloat(b.total_amount),
        status: b.booking_status,
        paymentStatus: b.payment_status,
        createdAt: b.created_at || '',
        updatedAt: b.updated_at || '',
      }));
      setBookings(mapped);
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
        ? `/api/pooling/bookings.php/${selectedBooking.id}`
        : '/api/pooling/bookings.php';

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;

    try {
      const response = await fetch('/api/pooling/bookings.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete booking');

      await fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Pooling Bookings Management</Typography>
        <Button
          variant="contained"
          onClick={() => handleOpenDialog()}
        >
          Add New Booking
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Seats</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{booking.id}</TableCell>
                <TableCell>{booking.userName}</TableCell>
                <TableCell>{booking.userPhone}</TableCell>
                <TableCell>{booking.seats}</TableCell>
                <TableCell>₹{booking.totalAmount}</TableCell>
                <TableCell>
                  <Chip 
                    label={booking.status} 
                    color={getStatusColor(booking.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={booking.paymentStatus} 
                    color={getPaymentStatusColor(booking.paymentStatus) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {booking.createdAt && !isNaN(new Date(booking.createdAt).getTime())
                    ? format(new Date(booking.createdAt), 'MMM dd, yyyy HH:mm')
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(booking)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(booking.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedBooking ? 'Edit Booking' : 'Add New Booking'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <TextField
                fullWidth
                label="User ID"
                type="number"
                value={formData.userId || ''}
                onChange={(e) => setFormData({ ...formData, userId: parseInt(e.target.value) })}
                required
              />
              <TextField
                fullWidth
                label="Ride ID"
                type="number"
                value={formData.rideId || ''}
                onChange={(e) => setFormData({ ...formData, rideId: parseInt(e.target.value) })}
                required
              />
              <TextField
                fullWidth
                label="User Name"
                value={formData.userName || ''}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="User Phone"
                value={formData.userPhone || ''}
                onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Seats"
                type="number"
                value={formData.seats || ''}
                onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) })}
                required
              />
              <TextField
                fullWidth
                label="Total Amount"
                type="number"
                value={formData.totalAmount || ''}
                onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) })}
                required
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {selectedBooking ? 'Update' : 'Add'} Booking
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default PoolingBookingsManager;