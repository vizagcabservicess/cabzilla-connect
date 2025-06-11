import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  RefreshCw, 
  MapPin,
  Calendar,
  Clock,
  Car
} from "lucide-react";
import { tourManagementAPI } from '@/services/api/tourManagementAPI';

interface Vehicle {
  id: string;
  name: string;
}

interface TourData {
  id?: number;
  tourId: string;
  tourName: string;
  distance: number;
  days: number;
  description: string;
  imageUrl?: string;
  isActive?: boolean;
  pricing: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

export default function TourManagement() {
  const [tours, setTours] = useState<TourData[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<TourData | null>(null);

  // Create dynamic schema based on available vehicles
  const createTourFormSchema = (availableVehicles: Vehicle[]) => {
    const pricingSchema: Record<string, z.ZodNumber> = {};
    availableVehicles.forEach(vehicle => {
      pricingSchema[vehicle.id] = z.coerce.number().min(0, { message: "Price cannot be negative" });
    });

    return z.object({
      tourId: z.string().min(1, { message: "Tour ID is required" }),
      tourName: z.string().min(1, { message: "Tour name is required" }),
      distance: z.coerce.number().min(1, { message: "Distance must be at least 1 km" }),
      days: z.coerce.number().min(1, { message: "Duration must be at least 1 day" }),
      description: z.string().min(10, { message: "Description must be at least 10 characters" }),
      imageUrl: z.string().optional(),
      pricing: z.object(pricingSchema)
    });
  };

  const getDefaultValues = (availableVehicles: Vehicle[]) => {
    const defaultPricing: Record<string, number> = {};
    availableVehicles.forEach(vehicle => {
      defaultPricing[vehicle.id] = 0;
    });

    return {
      tourId: "",
      tourName: "",
      distance: 0,
      days: 1,
      description: "",
      imageUrl: "",
      pricing: defaultPricing
    };
  };

  const addForm = useForm({
    resolver: vehicles.length > 0 ? zodResolver(createTourFormSchema(vehicles)) : undefined,
    defaultValues: getDefaultValues(vehicles),
  });

  const editForm = useForm({
    resolver: vehicles.length > 0 ? zodResolver(createTourFormSchema(vehicles)) : undefined,
  });

  const loadVehicles = async () => {
    try {
      const response = await fetch('/api/admin/tours-management.php?action=vehicles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      // Fallback to default vehicles
      setVehicles([
        { id: 'sedan', name: 'Sedan' },
        { id: 'ertiga', name: 'Ertiga' },
        { id: 'innova', name: 'Innova' },
        { id: 'tempo', name: 'Tempo' },
        { id: 'luxury', name: 'Luxury' }
      ]);
    }
  };

  const loadTours = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tours-management.php', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTours(data.data);
      }
    } catch (error) {
      console.error('Error loading tours:', error);
      toast.error('Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles().then(() => {
      loadTours();
    });
  }, []);

  // Reset forms when vehicles change
  useEffect(() => {
    if (vehicles.length > 0) {
      addForm.reset(getDefaultValues(vehicles));
    }
  }, [vehicles]);

  const onAddSubmit = async (values: any) => {
    try {
      const response = await fetch('/api/admin/tours-management.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(values)
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Tour added successfully');
        setIsAddDialogOpen(false);
        addForm.reset(getDefaultValues(vehicles));
        loadTours();
      } else {
        toast.error(data.message || 'Failed to add tour');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add tour');
    }
  };

  const onEditSubmit = async (values: any) => {
    try {
      const response = await fetch('/api/admin/tours-management.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(values)
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Tour updated successfully');
        setIsEditDialogOpen(false);
        setEditingTour(null);
        loadTours();
      } else {
        toast.error(data.message || 'Failed to update tour');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update tour');
    }
  };

  const handleEdit = (tour: TourData) => {
    setEditingTour(tour);
    editForm.reset({
      tourId: tour.tourId,
      tourName: tour.tourName,
      distance: tour.distance,
      days: tour.days,
      description: tour.description,
      imageUrl: tour.imageUrl || "",
      pricing: tour.pricing
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (tourId: string) => {
    try {
      const response = await fetch(`/api/admin/tours-management.php?tourId=${tourId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Tour deleted successfully');
        loadTours();
      } else {
        toast.error(data.message || 'Failed to delete tour');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tour');
    }
  };

  const handleToggleActive = async (tour: TourData) => {
    try {
      const response = await fetch('/api/admin/tours-management.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          tourId: tour.tourId,
          isActive: !tour.isActive
        })
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        toast.success(`Tour ${tour.isActive ? 'deactivated' : 'activated'} successfully`);
        loadTours();
      } else {
        toast.error(data.message || 'Failed to update tour status');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update tour status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tour Management</h2>
          <p className="text-gray-600">Manage tour packages and dynamic pricing</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadTours} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Tour
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Tour</DialogTitle>
                <DialogDescription>
                  Create a new tour package with dynamic pricing for all available vehicles.
                </DialogDescription>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="tourId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour ID</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., araku_valley" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="tourName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Araku Valley Tour" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={addForm.control}
                      name="distance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distance (km)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (days)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input placeholder="/tours/tour.jpg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the tour package..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <h4 className="font-semibold">Vehicle Pricing</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {vehicles.map((vehicle) => (
                        <FormField
                          key={vehicle.id}
                          control={addForm.control}
                          name={`pricing.${vehicle.id}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{vehicle.name} (₹)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Tour</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tours Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tours ({tours.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tour Details</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours.map((tour) => (
                <TableRow key={tour.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{tour.tourName}</div>
                      <div className="text-sm text-gray-500">{tour.tourId}</div>
                      <div className="text-xs text-gray-400 line-clamp-2 mt-1">
                        {tour.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {Object.entries(tour.pricing).slice(0, 3).map(([vehicleId, price]) => {
                        const vehicle = vehicles.find(v => v.id === vehicleId);
                        return (
                          <div key={vehicleId} className="text-sm">
                            {vehicle?.name}: ₹{price}
                          </div>
                        );
                      })}
                      {Object.keys(tour.pricing).length > 3 && (
                        <div className="text-xs text-gray-400">
                          +{Object.keys(tour.pricing).length - 3} more
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {tour.distance} km
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {tour.days} day{tour.days > 1 ? 's' : ''}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tour.isActive}
                        onCheckedChange={() => handleToggleActive(tour)}
                      />
                      <Badge variant={tour.isActive ? "default" : "secondary"}>
                        {tour.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(tour)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Tour</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{tour.tourName}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(tour.tourId)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tour</DialogTitle>
            <DialogDescription>
              Update tour package details and pricing.
            </DialogDescription>
          </DialogHeader>
          {editingTour && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="tourId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour ID</FormLabel>
                        <FormControl>
                          <Input {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="tourName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="distance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distance (km)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (days)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <h4 className="font-semibold">Vehicle Pricing</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {vehicles.map((vehicle) => (
                      <FormField
                        key={vehicle.id}
                        control={editForm.control}
                        name={`pricing.${vehicle.id}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{vehicle.name} (₹)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Tour</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
