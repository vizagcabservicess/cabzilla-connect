import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Grid,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { format } from 'date-fns';

interface Ride {
  id: number;
  type: string;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  arrivalTime: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  status: string;
  providerName: string;
  vehicleInfo: {
    make: string;
    model: string;
    color: string;
    plateNumber: string;
  };
}

const PoolingRidesManager: React.FC = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [formData, setFormData] = useState<Partial<Ride>>({});

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      const response = await fetch('/api/pooling/rides');
      if (!response.ok) throw new Error('Failed to fetch rides');
      const data = await response.json();
      setRides(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (ride?: Ride) => {
    if (ride) {
      setSelectedRide(ride);
      setFormData(ride);
    } else {
      setSelectedRide(null);
      setFormData({});
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRide(null);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedRide 
        ? `/api/pooling/rides/${selectedRide.id}`
        : '/api/pooling/rides';
      
      const method = selectedRide ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save ride');
      
      await fetchRides();
      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this ride?')) return;
    
    try {
      const response = await fetch(`/api/pooling/rides/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete ride');
      
      await fetchRides();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Pooling Rides Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Ride
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Departure</TableCell>
              <TableCell>Seats</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rides.map((ride) => (
              <TableRow key={ride.id}>
                <TableCell>{ride.id}</TableCell>
                <TableCell>{ride.type}</TableCell>
                <TableCell>{ride.fromLocation}</TableCell>
                <TableCell>{ride.toLocation}</TableCell>
                <TableCell>
                  {format(new Date(ride.departureTime), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                <TableCell>{`${ride.availableSeats}/${ride.totalSeats}`}</TableCell>
                <TableCell>₹{ride.pricePerSeat}</TableCell>
                <TableCell>{ride.status}</TableCell>
                <TableCell>{ride.providerName}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(ride)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(ride.id)}>
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
          {selectedRide ? 'Edit Ride' : 'Add New Ride'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Type"
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From Location"
                  value={formData.fromLocation || ''}
                  onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="To Location"
                  value={formData.toLocation || ''}
                  onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Departure Time"
                  type="datetime-local"
                  value={formData.departureTime || ''}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Seats"
                  type="number"
                  value={formData.totalSeats || ''}
                  onChange={(e) => setFormData({ ...formData, totalSeats: parseInt(e.target.value) })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Price per Seat"
                  type="number"
                  value={formData.pricePerSeat || ''}
                  onChange={(e) => setFormData({ ...formData, pricePerSeat: parseFloat(e.target.value) })}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedRide ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default PoolingRidesManager; 