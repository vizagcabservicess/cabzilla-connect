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
  Bookmark,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TourFare, FareUpdateRequest } from '@/types/api';
import { fareAPI, syncTourFaresTable } from '@/services/api';
import { reloadCabTypes } from '@/lib/cabData';
import { getVehicleData } from '@/services/vehicleDataService';
import { CabType } from '@/types/cab';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { vehicleIdMapping, getDynamicVehicleMapping, getAuthorizationHeader } from '@/config/api';

const initialVehicleMapping = {
  'sedan': 'Sedan',
  'ertiga': 'Ertiga',
  'innova': 'Innova',
  'tempo': 'Tempo Traveller', 
  'luxury': 'Luxury Sedan',
  
  'innova_crysta': 'Innova Crysta',
  'innova_hycross': 'Innova Hycross',
  'dzire_cng': 'Dzire CNG',
  'etios': 'Etios',
  'MPV': 'MPV'
};

let vehicleMapping = { ...initialVehicleMapping };

const createDynamicFormSchema = (vehicleColumns: string[]) => {
  const baseSchema = {
    tourId: z.string().min(1, { message: "Tour is required" }),
  };
  
  vehicleColumns.forEach(column => {
    baseSchema[column] = z.coerce.number().min(0, { message: "Price cannot be negative" });
  });
  
  return z.object(baseSchema);
};

const createDynamicNewTourFormSchema = (vehicleColumns: string[]) => {
  const baseSchema = {
    tourId: z.string().min(1, { message: "Tour ID is required" }),
    tourName: z.string().min(1, { message: "Tour name is required" }),
  };
  
  vehicleColumns.forEach(column => {
    baseSchema[column] = z.coerce.number().min(0, { message: "Price cannot be negative" });
  });
  
  return z.object(baseSchema);
};

export function FareManagement() {
  const [tourFares, setTourFares] = useState<TourFare[]>([]);
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [addTourDialogOpen, setAddTourDialogOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast: uiToast } = useToast();
  
  const [vehicleColumns, setVehicleColumns] = useState<string[]>([]);
  const [dynamicVehicleMap, setDynamicVehicleMap] = useState<Record<string, string>>({});
  
  const [dbVehicleIds, setDbVehicleIds] = useState(['sedan', 'ertiga', 'innova', 'tempo', 'luxury']);
  const [authStatus, setAuthStatus] = useState<{isValid: boolean; message: string}>({
    isValid: false,
    message: 'Checking authentication...'
  });
  
  const formSchema = createDynamicFormSchema(vehicleColumns.length > 0 ? vehicleColumns : dbVehicleIds);
  const newTourFormSchema = createDynamicNewTourFormSchema(vehicleColumns.length > 0 ? vehicleColumns : dbVehicleIds);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tourId: "",
    },
  });
  
  const newTourForm = useForm<z.infer<typeof newTourFormSchema>>({
    resolver: zodResolver(newTourFormSchema),
    defaultValues: {
      tourId: "",
      tourName: "",
    },
  });
  
  const checkAndRestoreAuth = () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (!token || token === 'null' || token === 'undefined') {
      console.log('No auth token found in localStorage, checking user object');
      if (user) {
        try {
          const userData = JSON.parse(user);
          if (userData && userData.token) {
            console.log('Found token in user object, restoring to localStorage');
            localStorage.setItem('authToken', userData.token);
            localStorage.setItem('isLoggedIn', 'true');
            setAuthStatus({
              isValid: true,
              message: 'Authentication restored from user data'
            });
            return userData.token;
          }
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      setAuthStatus({
        isValid: false,
        message: 'No valid authentication token found'
      });
      return null;
    }
    
    setAuthStatus({
      isValid: true,
      message: 'Authentication valid'
    });
    return token;
  };
  
  const syncVehiclesTourFares = async () => {
    try {
      setIsSyncing(true);
      
      const token = checkAndRestoreAuth();
      if (!token) {
        toast.error("Authentication required. Please log in again.");
        return false;
      }
      
      try {
        const testResponse = await fetch('/api/test.php', {
          headers: getAuthorizationHeader()
        });
        const testData = await testResponse.json();
        console.log("Auth test response:", testData);
        
        if (!testData.auth?.hasToken) {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            try {
              const userData = JSON.parse(userStr);
              if (userData && userData.token) {
                localStorage.setItem('authToken', userData.token);
                toast.info("Authentication token refreshed. Retrying sync...");
              }
            } catch (e) {
              console.error('Error refreshing token:', e);
            }
          }
        }
      } catch (testError) {
        console.error("Test API call failed:", testError);
      }
      
      toast.info("Syncing tour fares with vehicles...");
      
      const syncResult = await syncTourFaresTable();
      
      if (syncResult) {
        toast.success("Tour fares synchronized with vehicles successfully");
        
        const response = await fetch('/api/admin/db_setup_tour_fares.php', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            ...getAuthorizationHeader()
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Tour fares table structure:", data);
          
          if (data.data && data.data.existingColumns) {
            const fareColumns = data.data.existingColumns.filter(
              (col: string) => !['id', 'tour_id', 'tour_name', 'created_at', 'updated_at'].includes(col)
            );
            
            console.log("Available vehicle columns:", fareColumns);
            setVehicleColumns(fareColumns);
            setDbVehicleIds(fareColumns);
            
            const updatedDefaults: Record<string, any> = {
              tourId: form.getValues().tourId || "",
            };
            
            fareColumns.forEach(column => {
              updatedDefaults[column] = form.getValues()[column] || 0;
            });
            
            form.reset(updatedDefaults);
            
            const newTourDefaults: Record<string, any> = {
              tourId: newTourForm.getValues().tourId || "",
              tourName: newTourForm.getValues().tourName || "",
            };
            
            fareColumns.forEach(column => {
              newTourDefaults[column] = newTourForm.getValues()[column] || 0;
            });
            
            newTourForm.reset(newTourDefaults);
          }
          
          if (data.data?.addedColumns?.length > 0) {
            toast.success(`Added ${data.data.addedColumns.length} new vehicle columns to fare table: ${data.data.addedColumns.join(', ')}`);
          }
        }
        
        await fetchTourFares();
        return true;
      } else {
        toast.error("Failed to sync tour fares with vehicles");
        return false;
      }
    } catch (error) {
      console.error("Error syncing vehicles with tour fares:", error);
      toast.error("Error syncing vehicles with tour fares");
      return false;
    } finally {
      setIsSyncing(false);
    }
  };
  
  const initializeDynamicVehicleMapping = async () => {
    try {
      const mapping = await getDynamicVehicleMapping();
      setDynamicVehicleMap(mapping);
      
      const displayMapping = { ...initialVehicleMapping };
      
      Object.entries(mapping).forEach(([key, value]) => {
        if (!key.includes('_') && isNaN(Number(key))) {
          const displayName = key.charAt(0).toUpperCase() + key.slice(1);
          displayMapping[value] = displayName;
        }
      });
      
      vehicleMapping = displayMapping;
      console.log('Updated vehicle display mapping:', vehicleMapping);
    } catch (error) {
      console.error('Error initializing dynamic vehicle mapping:', error);
    }
  };
  
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        await initializeDynamicVehicleMapping();
        
        const vehicleData = await getVehicleData(true, true);
        console.log("Available vehicles for fare management:", vehicleData);
        setVehicles(vehicleData);
        
        await syncVehiclesTourFares();
        
        await fetchTourFares();
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setError("Failed to load vehicle types");
      }
    };
    
    fetchVehicles();
  }, []);
  
  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      console.log("Submitting fare update:", values);
      
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      await reloadCabTypes();
      
      const token = checkAndRestoreAuth();
      if (!token) {
        throw new Error("Authentication token is missing. Please log in again.");
      }
      
      const fareUpdateRequest: Record<string, any> = {
        tourId: values.tourId,
      };
      
      const columnsToUse = vehicleColumns.length > 0 ? vehicleColumns : dbVehicleIds;
      
      columnsToUse.forEach(column => {
        fareUpdateRequest[column] = values[column] || 0;
      });
      
      const selectedTour = tourFares.find(fare => fare.tourId === values.tourId);
      if (selectedTour) {
        fareUpdateRequest.tourName = selectedTour.tourName;
      }
      
      console.log("Prepared fare update request:", fareUpdateRequest);
      
      try {
        const testResponse = await fetch('/api/test.php', {
          headers: getAuthorizationHeader()
        });
        const testData = await testResponse.json();
        console.log("Test API response:", testData);
        setDebugInfo({
          test: testData,
          time: new Date().toISOString()
        });
        
        if (!testData.auth?.hasToken) {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            try {
              const userData = JSON.parse(userStr);
              if (userData && userData.token) {
                localStorage.setItem('authToken', userData.token);
                toast.info("Authentication token refreshed from user data");
              }
            } catch (e) {
              console.error('Error refreshing token:', e);
            }
          }
        }
      } catch (testError) {
        console.error("Test API call failed:", testError);
      }
      
      const data = await fareAPI.updateTourFares(fareUpdateRequest);
      console.log("Fare update response:", data);
      
      toast.success("Tour fare updated successfully");
      await fetchTourFares();
    } catch (error) {
      console.error("Error updating fare:", error);
      
      let errorMessage = "Failed to update fare";
      if (error && typeof error === 'object') {
        if ('response' in error && error.response) {
          if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.status === 403) {
            errorMessage = "Authorization failed. Please log out and log back in to refresh your session.";
          } else if (error.response.status === 500) {
            errorMessage = "Server error. Please check if all vehicle types exist in the database.";
          }
        } else if ('message' in error) {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      
      if (errorMessage.includes('Authentication') || errorMessage.includes('Authorization')) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            if (userData && userData.token) {
              localStorage.setItem('authToken', userData.token);
              toast.info("Authentication token refreshed. Please try again.");
            }
          } catch (e) {
            console.error('Error refreshing token:', e);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const onAddTourSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      console.log("Adding new tour:", values);
      
      const newTourData: Record<string, any> = {
        tourId: values.tourId,
        tourName: values.tourName,
      };
      
      const columnsToUse = vehicleColumns.length > 0 ? vehicleColumns : dbVehicleIds;
      
      columnsToUse.forEach(column => {
        newTourData[column] = values[column] || 0;
      });
      
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      await reloadCabTypes();
      
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error("Authentication token is missing. Please log in again.");
      }
      
      const data = await fareAPI.addTourFare(newTourData);
      console.log("New tour added:", data);
      
      toast.success("New tour added successfully");
      await fetchTourFares();
      setAddTourDialogOpen(false);
      newTourForm.reset();
    } catch (error) {
      console.error("Error adding tour:", error);
      
      let errorMessage = "Failed to add new tour";
      if (error && typeof error === 'object') {
        if ('response' in error && error.response) {
          if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.status === 403) {
            errorMessage = "Authorization failed. Please log out and log back in to refresh your session.";
          } else if (error.response.status === 500) {
            errorMessage = "Server error. Please check if all vehicle types exist in the database.";
          }
        } else if ('message' in error) {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteTour = async (tourId: string) => {
    if (!confirm("Are you sure you want to delete this tour? This action cannot be undone.")) {
      return;
    }
    
    try {
      setIsRefreshing(true);
      
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      await reloadCabTypes();
      
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error("Authentication token is missing. Please log in again.");
      }
      
      const data = await fareAPI.deleteTourFare(tourId);
      console.log("Tour deleted:", data);
      
      toast.success("Tour deleted successfully");
      await fetchTourFares();
    } catch (error) {
      console.error("Error deleting tour:", error);
      
      let errorMessage = "Failed to delete tour";
      if (error && typeof error === 'object') {
        if ('response' in error && error.response) {
          if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          }
        } else if ('message' in error) {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const fetchTourFares = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      console.log("Manually refreshing tour fares...");
      
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      await reloadCabTypes();
      
      const token = checkAndRestoreAuth();
      if (!token) {
        console.warn("No auth token found, fare operations may fail");
      }
      
      const data = await fareAPI.getTourFares();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log("Fetched tour fares:", data);
        
        const allColumns = new Set<string>();
        
        data.forEach(fare => {
          Object.keys(fare).forEach(key => {
            if (!['id', 'tourId', 'tourName'].includes(key) && typeof fare[key] === 'number') {
              allColumns.add(key);
            }
          });
        });
        
        if (allColumns.size > 0) {
          const columnsArray = Array.from(allColumns);
          console.log("Found vehicle columns in fare data:", columnsArray);
          
          if (columnsArray.length > vehicleColumns.length) {
            setVehicleColumns(columnsArray);
            setDbVehicleIds(columnsArray);
          }
        }
        
        const processedFares = data.map(fare => {
          const processedFare = { ...fare };
          
          const columnsToUse = vehicleColumns.length > 0 ? vehicleColumns : dbVehicleIds;
          columnsToUse.forEach(column => {
            if (typeof processedFare[column] === 'undefined') {
              processedFare[column] = 0;
            }
          });
          
          return processedFare;
        });
        
        setTourFares(processedFares);
        toast.success("Tour fares refreshed");
      } else {
        console.warn("Empty or invalid tour fares data:", data);
        setError("No tour fares data available. The API may be down or returned an empty result.");
      }
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
      const formValues: Record<string, any> = {
        tourId: selectedTour.tourId
      };
      
      const columnsToUse = vehicleColumns.length > 0 ? vehicleColumns : dbVehicleIds;
      
      columnsToUse.forEach(column => {
        formValues[column] = typeof selectedTour[column] !== 'undefined' ? selectedTour[column] : 0;
      });
      
      form.reset(formValues);
    }
  };
  
  const getVehicleDisplayName = (vehicleId: string) => {
    return vehicleMapping[vehicleId] || vehicleId.charAt(0).toUpperCase() + vehicleId.slice(1).replace(/_/g, ' ');
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
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={syncVehiclesTourFares} 
                  disabled={isSyncing}
                >
                  <Car className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Vehicles
                </Button>
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
            </div>
            {!authStatus.isValid && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center">
                  <span className="flex-1">{authStatus.message}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={checkAndRestoreAuth}
                    className="ml-2"
                  >
                    Retry Auth
                  </Button>
                </AlertDescription>
              </Alert>
            )}
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
                  {(vehicleColumns.length > 0 ? vehicleColumns : dbVehicleIds).map(column => (
                    <FormField
                      key={column}
                      control={form.control}
                      name={column as any} 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{getVehicleDisplayName(column)} Price</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
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
            
            {debugInfo && (
              <div className="mt-4 p-3 text-xs bg-gray-100 rounded overflow-auto max-h-40">
                <details>
                  <summary className="font-bold">Debug Info</summary>
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="all">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> All Tour Fares
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {tourFares.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tour fares available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Tour Name</th>
                      {(vehicleColumns.length > 0 ? vehicleColumns : dbVehicleIds).map(column => (
                        <th key={column} className="px-4 py-2 text-left">{getVehicleDisplayName(column)}</th>
                      ))}
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tourFares.map((fare) => (
                      <tr key={fare.tourId} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-2">{fare.tourName}</td>
                        {(vehicleColumns.length > 0 ? vehicleColumns : dbVehicleIds).map(column => (
                          <td key={`${fare.tourId}-${column}`} className="px-4 py-2">
                            ₹{fare[column] || 0}
                          </td>
                        ))}
                        <td className="px-4 py-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              form.setValue("tourId", fare.tourId);
                              handleTourSelect(fare.tourId);
                              const tabElement = document.querySelector('[data-value="update"]');
                              if (tabElement && tabElement instanceof HTMLElement) {
                                tabElement.click();
                              }
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                    name={"tourId" as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., araku_valley" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newTourForm.control}
                    name={"tourName" as const}
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
                </div>
                
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  {(vehicleColumns.length > 0 ? vehicleColumns : dbVehicleIds).map(column => (
                    <FormField
                      key={column}
                      control={newTourForm.control}
                      name={column as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{getVehicleDisplayName(column)} Price</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
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
    </Tabs>
  );
}
