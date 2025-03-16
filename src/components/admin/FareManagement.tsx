
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RefreshCw, Save, Plus, Edit, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TourFare, FareUpdateRequest } from '@/types/api';
import { fareAPI } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const formSchema = z.object({
  tourId: z.string().min(1, { message: "Tour is required" }),
  sedan: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  ertiga: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  innova: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tempo: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  luxury: z.coerce.number().min(0, { message: "Price cannot be negative" }),
});

const newTourSchema = z.object({
  tourName: z.string().min(3, { message: "Tour name must be at least 3 characters" }),
  tourDescription: z.string().optional(),
  sedan: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  ertiga: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  innova: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tempo: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  luxury: z.coerce.number().min(0, { message: "Price cannot be negative" }),
});

export function FareManagement() {
  const [tourFares, setTourFares] = useState<TourFare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast: uiToast } = useToast();
  
  // New tour dialog state
  const [isNewTourDialogOpen, setIsNewTourDialogOpen] = useState(false);
  const [isAddingTour, setIsAddingTour] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tourId: "",
      sedan: 0,
      ertiga: 0,
      innova: 0,
      tempo: 0,
      luxury: 0,
    },
  });
  
  const newTourForm = useForm<z.infer<typeof newTourSchema>>({
    resolver: zodResolver(newTourSchema),
    defaultValues: {
      tourName: "",
      tourDescription: "",
      sedan: 0,
      ertiga: 0,
      innova: 0,
      tempo: 0,
      luxury: 0,
    },
  });
  
  // Handle form submission for updating existing tour
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      console.log("Submitting fare update:", values);
      
      const data = await fareAPI.updateTourFares(values as FareUpdateRequest);
      console.log("Fare update response:", data);
      
      toast.success("Tour fare updated successfully");
      await fetchTourFares();
    } catch (error) {
      console.error("Error updating fare:", error);
      toast.error("Failed to update fare");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission for adding new tour
  const onAddTour = async (values: z.infer<typeof newTourSchema>) => {
    try {
      setIsAddingTour(true);
      console.log("Adding new tour:", values);
      
      // Create a new tour with the provided data
      const newTourData = {
        tourName: values.tourName,
        tourDescription: values.tourDescription || '',
        sedan: values.sedan,
        ertiga: values.ertiga,
        innova: values.innova,
        tempo: values.tempo,
        luxury: values.luxury,
      };
      
      // Call the API to add the new tour
      const data = await fareAPI.addTourFare(newTourData);
      console.log("New tour added:", data);
      
      toast.success("New tour added successfully");
      
      // Reset the form
      newTourForm.reset();
      
      // Close the dialog
      setIsNewTourDialogOpen(false);
      
      // Refresh the tour fares
      await fetchTourFares();
    } catch (error) {
      console.error("Error adding new tour:", error);
      toast.error("Failed to add new tour");
    } finally {
      setIsAddingTour(false);
    }
  };
  
  useEffect(() => {
    fetchTourFares();
  }, []);
  
  const fetchTourFares = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      // Cache busting log
      console.log("Manually refreshing tour fares...");
      const data = await fareAPI.getTourFares();
      setTourFares(data);
      toast.success("Tour fares refreshed");
    } catch (error) {
      console.error("Error refreshing tour fares:", error);
      setError("Failed to refresh tour fares. Please try again.");
      toast.error("Failed to refresh tour fares");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleTourSelect = (tourId: string) => {
    const selectedTour = tourFares.find(fare => fare.tourId === tourId);
    if (selectedTour) {
      form.setValue("tourId", selectedTour.tourId);
      form.setValue("sedan", selectedTour.sedan);
      form.setValue("ertiga", selectedTour.ertiga);
      form.setValue("innova", selectedTour.innova);
      form.setValue("tempo", selectedTour.tempo);
      form.setValue("luxury", selectedTour.luxury);
    }
  };

  const handleDeleteTour = async (tourId: string) => {
    try {
      if (!confirm("Are you sure you want to delete this tour?")) {
        return;
      }
      
      console.log("Deleting tour:", tourId);
      await fareAPI.deleteTourFare(tourId);
      
      toast.success("Tour deleted successfully");
      
      // Refresh the tour fares
      await fetchTourFares();
    } catch (error) {
      console.error("Error deleting tour:", error);
      toast.error("Failed to delete tour");
    }
  };

  return (
    <Tabs defaultValue="update">
      <TabsList>
        <TabsTrigger value="update">Update Tour Fares</TabsTrigger>
        <TabsTrigger value="all">View All Fares</TabsTrigger>
      </TabsList>
      
      <TabsContent value="update">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Update Tour Fares</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchTourFares} 
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setIsNewTourDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Tour
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="tourId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Tour</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleTourSelect(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a tour" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tourFares.map((fare) => (
                            <SelectItem key={fare.tourId} value={fare.tourId}>
                              {fare.tourName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="sedan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sedan Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="ertiga"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ertiga Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="innova"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Innova Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tempo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tempo Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="luxury"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Luxury Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Fare
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="all">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Tour Fares</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchTourFares} 
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setIsNewTourDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Tour
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isRefreshing ? (
              <div className="flex justify-center p-10">
                <RefreshCw className="h-10 w-10 animate-spin text-gray-400" />
              </div>
            ) : tourFares.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Tour</th>
                      <th className="text-right py-2 px-2">Sedan</th>
                      <th className="text-right py-2 px-2">Ertiga</th>
                      <th className="text-right py-2 px-2">Innova</th>
                      <th className="text-right py-2 px-2">Tempo</th>
                      <th className="text-right py-2 px-2">Luxury</th>
                      <th className="text-right py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tourFares.map((fare) => (
                      <tr key={fare.tourId} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{fare.tourName}</td>
                        <td className="text-right py-2 px-2">₹{fare.sedan.toLocaleString('en-IN')}</td>
                        <td className="text-right py-2 px-2">₹{fare.ertiga.toLocaleString('en-IN')}</td>
                        <td className="text-right py-2 px-2">₹{fare.innova.toLocaleString('en-IN')}</td>
                        <td className="text-right py-2 px-2">₹{fare.tempo.toLocaleString('en-IN')}</td>
                        <td className="text-right py-2 px-2">₹{fare.luxury.toLocaleString('en-IN')}</td>
                        <td className="text-right py-2 px-2">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                handleTourSelect(fare.tourId);
                                form.setValue("tourId", fare.tourId);
                                document.querySelector('[data-value="update"]')?.click();
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteTour(fare.tourId)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                No tour fares found.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Add New Tour Dialog */}
      <Dialog open={isNewTourDialogOpen} onOpenChange={setIsNewTourDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Tour</DialogTitle>
            <DialogDescription>
              Create a new tour with pricing for different vehicle types.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newTourForm}>
            <form onSubmit={newTourForm.handleSubmit(onAddTour)} className="space-y-4">
              <FormField
                control={newTourForm.control}
                name="tourName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tour Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Araku Valley Tour" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newTourForm.control}
                name="tourDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Brief description of the tour" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={newTourForm.control}
                  name="sedan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sedan Price</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newTourForm.control}
                  name="ertiga"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ertiga Price</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newTourForm.control}
                  name="innova"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Innova Price</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newTourForm.control}
                  name="tempo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo Price</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newTourForm.control}
                  name="luxury"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Luxury Price</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsNewTourDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingTour}>
                  {isAddingTour ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tour
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
