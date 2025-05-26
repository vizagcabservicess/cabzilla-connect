
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Edit, Trash2, Plus } from 'lucide-react';
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

export function PoolingRidesManager() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [formData, setFormData] = useState<Partial<Ride>>({});
  const { toast } = useToast();

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
      toast({
        title: "Success",
        description: "Ride saved successfully"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save ride"
      });
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
      toast({
        title: "Success",
        description: "Ride deleted successfully"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete ride"
      });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Pooling Rides Management</CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Ride
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">From</th>
                  <th className="text-left p-2">To</th>
                  <th className="text-left p-2">Departure</th>
                  <th className="text-left p-2">Seats</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Provider</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => (
                  <tr key={ride.id} className="border-b">
                    <td className="p-2">{ride.id}</td>
                    <td className="p-2">{ride.type}</td>
                    <td className="p-2">{ride.fromLocation}</td>
                    <td className="p-2">{ride.toLocation}</td>
                    <td className="p-2">
                      {format(new Date(ride.departureTime), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="p-2">{`${ride.availableSeats}/${ride.totalSeats}`}</td>
                    <td className="p-2">₹{ride.pricePerSeat}</td>
                    <td className="p-2">{ride.status}</td>
                    <td className="p-2">{ride.providerName}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenDialog(ride)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(ride.id)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRide ? 'Edit Ride' : 'Add New Ride'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="fromLocation">From Location</Label>
                <Input
                  id="fromLocation"
                  value={formData.fromLocation || ''}
                  onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="toLocation">To Location</Label>
                <Input
                  id="toLocation"
                  value={formData.toLocation || ''}
                  onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="departureTime">Departure Time</Label>
                <Input
                  id="departureTime"
                  type="datetime-local"
                  value={formData.departureTime || ''}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="totalSeats">Total Seats</Label>
                <Input
                  id="totalSeats"
                  type="number"
                  value={formData.totalSeats || ''}
                  onChange={(e) => setFormData({ ...formData, totalSeats: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="pricePerSeat">Price per Seat</Label>
                <Input
                  id="pricePerSeat"
                  type="number"
                  value={formData.pricePerSeat || ''}
                  onChange={(e) => setFormData({ ...formData, pricePerSeat: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedRide ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PoolingRidesManager;
