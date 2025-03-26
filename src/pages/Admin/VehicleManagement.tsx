
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddVehicleForm } from '@/components/admin/AddVehicleForm';
import { AirportFareManagement } from '@/components/admin/AirportFareManagement';
import { Car, Plus, RefreshCw } from 'lucide-react';
import { loadCabTypes, clearFareCache } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { fareService } from '@/services/fareService';

export function VehicleManagement() {
  const navigate = useNavigate();
  const [cabTypes, setCabTypes] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("vehicles");
  
  useEffect(() => {
    loadVehicles();
  }, []);
  
  const loadVehicles = async () => {
    setIsLoading(true);
    try {
      // Force cache refresh
      clearFareCache(true);
      localStorage.setItem('forceCacheRefresh', 'true');
      localStorage.setItem('fareDataLastRefreshed', Date.now().toString());
      
      const types = await loadCabTypes();
      setCabTypes(types);
      
      // Clear force refresh flag after a delay
      setTimeout(() => {
        localStorage.removeItem('forceCacheRefresh');
      }, 3000);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error("Failed to load vehicles");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = () => {
    loadVehicles();
    toast.success("Vehicles refreshed");
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vehicle Management</h1>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <Tabs 
        defaultValue="vehicles" 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="add">Add Vehicle</TabsTrigger>
          <TabsTrigger value="airport">Airport Pricing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="vehicles" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cabTypes.map((cab) => (
              <Card key={cab.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">{cab.name}</CardTitle>
                  <CardDescription>
                    ID: {cab.id} | Capacity: {cab.capacity} persons
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="relative h-40 bg-gray-100 rounded-md overflow-hidden">
                    <img 
                      src={cab.image} 
                      alt={cab.name} 
                      className="object-contain w-full h-full p-2"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/cars/sedan.png';
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                      {cab.ac ? 
                        <span className="text-xs font-medium text-green-600 px-2">AC</span> : 
                        <span className="text-xs font-medium text-gray-600 px-2">Non-AC</span>
                      }
                    </div>
                    <div className="absolute bottom-2 left-2 bg-white rounded-full p-1 shadow">
                      <span className="text-xs font-medium px-2">
                        {cab.luggageCapacity} Luggage
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Base Price:</span>
                      <span className="font-medium">₹{cab.price || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Price per Km:</span>
                      <span className="font-medium">₹{cab.pricePerKm || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Status:</span>
                      <span className={`font-medium ${cab.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {cab.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab("airport")}
                  >
                    Airport Pricing
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Here we could add an edit functionality in the future
                      toast.info("Edit functionality coming soon");
                    }}
                  >
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
            {/* Add New Vehicle Card */}
            <Card className="overflow-hidden border-dashed border-2 border-gray-300 flex flex-col items-center justify-center">
              <CardContent className="flex flex-col items-center justify-center h-full py-12">
                <Plus className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">Add New Vehicle</h3>
                <p className="text-gray-500 text-center mb-6">
                  Create a new vehicle for your fleet
                </p>
                <Button 
                  onClick={() => setActiveTab("add")}
                  variant="outline"
                >
                  <Car className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="add" className="mt-6">
          <AddVehicleForm 
            onSuccess={() => {
              loadVehicles();
              setTimeout(() => {
                setActiveTab("vehicles");
                toast.success("Vehicle added successfully");
              }, 500);
            }} 
          />
        </TabsContent>
        
        <TabsContent value="airport" className="mt-6">
          <AirportFareManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
