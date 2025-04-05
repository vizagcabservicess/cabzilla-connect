
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, Database } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { fareAPI } from '@/services/api';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { getVehicleData } from '@/services/vehicleDataService';
import { syncAirportFares, syncLocalFares } from '@/services/fareManagementService';

export function FareManagement() {
  const [activeTab, setActiveTab] = useState("tours");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tourFares, setTourFares] = useState<any[]>([]);
  const [vehiclePricing, setVehiclePricing] = useState<any[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFare, setSelectedFare] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for editing
  const [editTourId, setEditTourId] = useState('');
  const [editSedan, setEditSedan] = useState(0);
  const [editErtiga, setEditErtiga] = useState(0);
  const [editInnova, setEditInnova] = useState(0);
  
  // Form state for adding
  const [newTourId, setNewTourId] = useState('');
  const [newSedan, setNewSedan] = useState(0);
  const [newErtiga, setNewErtiga] = useState(0);
  const [newInnova, setNewInnova] = useState(0);
  
  // Available vehicle types
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  
  useEffect(() => {
    fetchData();
    fetchVehicleTypes();
  }, []);
  
  const fetchVehicleTypes = async () => {
    try {
      const vehicles = await getVehicleData();
      const types = [...new Set(vehicles.map(v => v.name || '').filter(Boolean))];
      setVehicleTypes(types);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      setVehicleTypes(['Sedan', 'Ertiga', 'Innova']); // Fallback
    }
  };
  
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch tour fares
      const tourFaresData = await fareAPI.getTourFares();
      setTourFares(Array.isArray(tourFaresData) ? tourFaresData : []);
      
      // Fetch vehicle pricing
      const pricingData = await fareAPI.getVehiclePricing();
      setVehiclePricing(Array.isArray(pricingData) ? pricingData : []);
    } catch (err) {
      console.error('Error fetching fare data:', err);
      setError('Failed to load fare data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSyncTables = async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      toast.info('Syncing fare tables...');
      
      // Sync local fares
      const localResult = await syncLocalFares();
      console.log('Local fares sync result:', localResult);
      
      // Sync airport fares
      const airportResult = await syncAirportFares();
      console.log('Airport fares sync result:', airportResult);
      
      if (localResult.success || airportResult.success) {
        toast.success('Fare tables synced successfully');
        await fetchData();
      } else {
        toast.error('Failed to sync fare tables');
        setError('Failed to sync fare tables. Please check server logs.');
      }
    } catch (err) {
      console.error('Error syncing fare tables:', err);
      toast.error('Failed to sync fare tables');
      setError('Failed to sync fare tables. Please check server logs.');
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleEditTourFare = (fare: any) => {
    setSelectedFare(fare);
    setEditTourId(fare.tourId || '');
    setEditSedan(fare.sedan || 0);
    setEditErtiga(fare.ertiga || 0);
    setEditInnova(fare.innova || 0);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateTourFare = async () => {
    if (!selectedFare) return;
    
    setIsSaving(true);
    
    try {
      const updateData = {
        tourId: editTourId,
        sedan: editSedan,
        ertiga: editErtiga,
        innova: editInnova
      };
      
      await fareAPI.updateTourFare(updateData);
      toast.success('Tour fare updated successfully');
      setIsEditDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error updating tour fare:', err);
      toast.error('Failed to update tour fare');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAddTourFare = async () => {
    setIsSaving(true);
    
    try {
      if (!newTourId) {
        toast.error('Tour ID is required');
        return;
      }
      
      const newFare = {
        tourId: newTourId,
        sedan: newSedan,
        ertiga: newErtiga,
        innova: newInnova
      };
      
      await fareAPI.addTourFare(newFare);
      toast.success('Tour fare added successfully');
      setIsAddDialogOpen(false);
      
      // Reset form
      setNewTourId('');
      setNewSedan(0);
      setNewErtiga(0);
      setNewInnova(0);
      
      fetchData();
    } catch (err) {
      console.error('Error adding tour fare:', err);
      toast.error('Failed to add tour fare');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteTourFare = async () => {
    if (!selectedFare) return;
    
    setIsSaving(true);
    
    try {
      await fareAPI.deleteTourFare(selectedFare.tourId);
      toast.success('Tour fare deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error deleting tour fare:', err);
      toast.error('Failed to delete tour fare');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Fare Management</h2>
          <p className="text-muted-foreground">Manage tour fares and vehicle pricing</p>
        </div>
        <Button onClick={handleSyncTables} disabled={isSyncing}>
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Sync Tables
            </>
          )}
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tours">Tour Fares</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Pricing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tours">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tour Fares</CardTitle>
              <Button onClick={() => setIsAddDialogOpen(true)}>Add Tour Fare</Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-2 text-muted-foreground">Loading tour fares...</p>
                </div>
              ) : tourFares.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No tour fares found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tour ID</TableHead>
                      <TableHead>Sedan (₹)</TableHead>
                      <TableHead>Ertiga (₹)</TableHead>
                      <TableHead>Innova (₹)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tourFares.map((fare, index) => (
                      <TableRow key={fare.tourId || index}>
                        <TableCell className="font-medium">{fare.tourId}</TableCell>
                        <TableCell>{fare.sedan}</TableCell>
                        <TableCell>{fare.ertiga}</TableCell>
                        <TableCell>{fare.innova}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditTourFare(fare)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedFare(fare);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-2 text-muted-foreground">Loading vehicle pricing...</p>
                </div>
              ) : vehiclePricing.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No vehicle pricing found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Base Price (₹)</TableHead>
                      <TableHead>Price per KM (₹)</TableHead>
                      <TableHead>Night Halt (₹)</TableHead>
                      <TableHead>Driver Allowance (₹)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehiclePricing.map((pricing) => (
                      <TableRow key={pricing.vehicleId}>
                        <TableCell className="font-medium">
                          {pricing.name || pricing.vehicleId}
                        </TableCell>
                        <TableCell>{pricing.basePrice}</TableCell>
                        <TableCell>{pricing.pricePerKm}</TableCell>
                        <TableCell>{pricing.nightHaltCharge}</TableCell>
                        <TableCell>{pricing.driverAllowance}</TableCell>
                        <TableCell>
                          {pricing.isActive ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Tour Fare Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tour Fare</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tourId">Tour ID</Label>
              <Input
                id="tourId"
                value={editTourId}
                onChange={(e) => setEditTourId(e.target.value)}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sedan">Sedan Price (₹)</Label>
              <Input
                id="sedan"
                type="number"
                value={editSedan}
                onChange={(e) => setEditSedan(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ertiga">Ertiga Price (₹)</Label>
              <Input
                id="ertiga"
                type="number"
                value={editErtiga}
                onChange={(e) => setEditErtiga(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="innova">Innova Price (₹)</Label>
              <Input
                id="innova"
                type="number"
                value={editInnova}
                onChange={(e) => setEditInnova(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTourFare} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tour Fare Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tour Fare</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newTourId">Tour ID</Label>
              <Input
                id="newTourId"
                value={newTourId}
                onChange={(e) => setNewTourId(e.target.value)}
                placeholder="e.g., coastal_tour"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newSedan">Sedan Price (₹)</Label>
              <Input
                id="newSedan"
                type="number"
                value={newSedan}
                onChange={(e) => setNewSedan(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newErtiga">Ertiga Price (₹)</Label>
              <Input
                id="newErtiga"
                type="number"
                value={newErtiga}
                onChange={(e) => setNewErtiga(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newInnova">Innova Price (₹)</Label>
              <Input
                id="newInnova"
                type="number"
                value={newInnova}
                onChange={(e) => setNewInnova(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTourFare} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Tour Fare'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tour Fare Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tour Fare</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the fare for tour <span className="font-semibold">{selectedFare?.tourId}</span>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteTourFare}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
