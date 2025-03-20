
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit, Car } from "lucide-react";
import { VehicleForm } from './VehicleForm';
import { getVehicleData, deleteVehicle } from '@/services/vehicleDataService';

export function VehicleManagement() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Load vehicles
  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await getVehicleData(true); // Include inactive vehicles
      if (Array.isArray(data)) {
        setVehicles(data);
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  // Refresh vehicles
  const refreshVehicles = async () => {
    try {
      setRefreshing(true);
      await loadVehicles();
      toast.success('Vehicle list refreshed');
    } catch (error) {
      toast.error('Failed to refresh vehicle list');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle vehicle deletion
  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    
    try {
      const success = await deleteVehicle(vehicleToDelete.id || vehicleToDelete.vehicleId);
      if (success) {
        toast.success(`Vehicle "${vehicleToDelete.name}" deleted successfully`);
        loadVehicles(); // Refresh the list
      } else {
        toast.error('Failed to delete vehicle');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    } finally {
      setVehicleToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  // Load vehicles on component mount
  useEffect(() => {
    loadVehicles();
  }, []);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="list" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="cards">Card View</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={refreshVehicles} 
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>
            
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {/* List View */}
        <TabsContent value="list" className="w-full">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="text-right">Base Price</TableHead>
                  <TableHead className="text-right">Per KM</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <span className="text-sm text-muted-foreground">Loading vehicles...</span>
                    </TableCell>
                  </TableRow>
                ) : vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <span className="text-sm text-muted-foreground">No vehicles found</span>
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id || vehicle.vehicleId}>
                      <TableCell className="font-medium">{vehicle.id || vehicle.vehicleId}</TableCell>
                      <TableCell>{vehicle.name}</TableCell>
                      <TableCell>{vehicle.capacity || 0}</TableCell>
                      <TableCell className="text-right">₹{vehicle.basePrice || vehicle.price || 0}</TableCell>
                      <TableCell className="text-right">₹{vehicle.pricePerKm || 0}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${vehicle.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {vehicle.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedVehicle(vehicle);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setVehicleToDelete(vehicle);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Card View */}
        <TabsContent value="cards">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Loading vehicles...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Car className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No vehicles found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id || vehicle.vehicleId} className={vehicle.isActive ? "" : "opacity-70"}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{vehicle.name}</CardTitle>
                        <CardDescription>{vehicle.id || vehicle.vehicleId}</CardDescription>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${vehicle.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {vehicle.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Capacity:</span>
                        <span className="font-medium">{vehicle.capacity || 0} passengers</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Luggage:</span>
                        <span className="font-medium">{vehicle.luggageCapacity || 0} bags</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Base Price:</span>
                        <span className="font-medium">₹{vehicle.basePrice || vehicle.price || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Price per KM:</span>
                        <span className="font-medium">₹{vehicle.pricePerKm || 0}</span>
                      </div>
                      <div className="pt-2 flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setVehicleToDelete(vehicle);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Vehicle Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <VehicleForm 
              vehicle={selectedVehicle} 
              onSuccess={() => {
                setShowEditDialog(false);
                loadVehicles();
              }}
              isEdit={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Vehicle Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm 
            onSuccess={() => {
              setShowAddDialog(false);
              loadVehicles();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{vehicleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVehicle} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
