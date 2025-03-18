
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
import { 
  AlertCircle, 
  RefreshCw, 
  Save, 
  PlusCircle, 
  Trash2, 
  Edit, 
  Globe,
  Map,
  Car,
  Bookmark
} from "lucide-react";
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

const newTourFormSchema = z.object({
  tourId: z.string().min(1, { message: "Tour ID is required" }),
  tourName: z.string().min(1, { message: "Tour name is required" }),
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
  const [addTourDialogOpen, setAddTourDialogOpen] = useState(false);
  const { toast: uiToast } = useToast();
  
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
  
  const newTourForm = useForm<z.infer<typeof newTourFormSchema>>({
    resolver: zodResolver(newTourFormSchema),
    defaultValues: {
      tourId: "",
      tourName: "",
      sedan: 0,
      ertiga: 0,
      innova: 0,
      tempo: 0,
      luxury: 0,
    },
  });
  
  // Handle form submission
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
  
  const onAddTourSubmit = async (values: z.infer<typeof newTourFormSchema>) => {
    try {
      setIsLoading(true);
      console.log("Adding new tour:", values);
      
      // Call API to add new tour
      const data = await fareAPI.addTourFare(values);
      console.log("New tour added:", data);
      
      toast.success("New tour added successfully");
      await fetchTourFares();
      setAddTourDialogOpen(false);
      newTourForm.reset();
    } catch (error) {
      console.error("Error adding tour:", error);
      toast.error("Failed to add new tour");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteTour = async (tourId: string) => {
    // Confirm deletion
    if (!confirm("Are you sure you want to delete this tour? This action cannot be undone.")) {
      return;
    }
    
    try {
      setIsRefreshing(true);
      const data = await fareAPI.deleteTourFare(tourId);
      console.log("Tour deleted:", data);
      
      toast.success("Tour deleted successfully");
      await fetchTourFares();
    } catch (error) {
      console.error("Error deleting tour:", error);
      toast.error("Failed to delete tour");
    } finally {
      setIsRefreshing(false);
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

  return (
    <Tabs defaultValue="update">
      <TabsList>
        <TabsTrigger value="update" className="flex items-center gap-1">
          <Edit className="h-4 w-4" /> Update Tour Fares
        </TabsTrigger>
        <TabsTrigger value="all" className="flex items-center gap-1">
          <Globe className="h-4 w-4" /> View All Fares
        </TabsTrigger>
        <TabsTrigger value="add" className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4" /> Add New Tour
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="update">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" /> Update Tour Fares
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchTourFares} 
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
                
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1" disabled={isLoading}>
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
                  
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => handleDeleteTour(form.getValues().tourId)}
                    disabled={isLoading || !form.getValues().tourId}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Tour
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="add">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" /> Add New Tour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...newTourForm}>
              <form onSubmit={newTourForm.handleSubmit(onAddTourSubmit)} className="space-y-6">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <FormField
                    control={newTourForm.control}
                    name="tourId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour ID (unique identifier)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., araku-valley" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newTourForm.control}
                    name="tourName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour Name (display name)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Araku Valley Tour" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
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
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Adding Tour...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add New Tour
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
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" /> All Tour Fares
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchTourFares} 
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleTourSelect(fare.tourId)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteTour(fare.tourId)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </Tabs>
  );
}
