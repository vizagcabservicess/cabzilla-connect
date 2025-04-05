
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import { Loader2, AlertCircle, PlusCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fareAPI } from '@/services/api';
import { getVehicleData } from '@/services/vehicleDataService';

export function VehicleFareManagement() {
  const [activeTab, setActiveTab] = useState("local");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localFares, setLocalFares] = useState<any[]>([]);
  const [outstationFares, setOutstationFares] = useState<any[]>([]);
  const [airportFares, setAirportFares] = useState<any[]>([]);
  const [tourFares, setTourFares] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchFares = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load vehicles first
        const vehiclesData = await getVehicleData();
        setVehicles(vehiclesData);
        
        // Load tour fares
        try {
          const tourFaresData = await fareAPI.getTourFares();
          if (Array.isArray(tourFaresData)) {
            setTourFares(tourFaresData);
          } else {
            console.warn('Tour fares data is not an array:', tourFaresData);
            setTourFares([]);
          }
        } catch (tourErr) {
          console.error('Error loading tour fares:', tourErr);
          setTourFares([]);
        }
        
        // TODO: Add code to fetch local, outstation, and airport fares
        // For now, set mock data
        setLocalFares([
          { id: 'sedan_local', vehicle: 'Sedan', extraKmRate: 14, extraHourRate: 200, packages: [
            { hours: 4, km: 40, price: 1200 },
            { hours: 8, km: 80, price: 2200 },
            { hours: 12, km: 120, price: 3000 }
          ]},
          { id: 'ertiga_local', vehicle: 'Ertiga', extraKmRate: 16, extraHourRate: 250, packages: [
            { hours: 4, km: 40, price: 1500 },
            { hours: 8, km: 80, price: 2500 },
            { hours: 12, km: 120, price: 3500 }
          ]},
        ]);
        
        setOutstationFares([
          { 
            id: 'sedan_outstation', 
            vehicle: 'Sedan', 
            basePrice: 2500, 
            pricePerKm: 14, 
            roundTripBasePrice: 2250, 
            roundTripPricePerKm: 12,
            driverAllowance: 300,
            nightHaltCharge: 700
          },
          { 
            id: 'ertiga_outstation', 
            vehicle: 'Ertiga', 
            basePrice: 3200, 
            pricePerKm: 16, 
            roundTripBasePrice: 2880, 
            roundTripPricePerKm: 14,
            driverAllowance: 300,
            nightHaltCharge: 700
          },
        ]);
        
        setAirportFares([
          { 
            id: 'sedan_airport', 
            vehicle: 'Sedan', 
            pickup: 800, 
            drop: 800,
            tier1: 600,
            tier2: 800,
            tier3: 1000,
            tier4: 1200
          },
          { 
            id: 'ertiga_airport', 
            vehicle: 'Ertiga', 
            pickup: 1000, 
            drop: 1000,
            tier1: 800,
            tier2: 1000,
            tier3: 1200,
            tier4: 1500
          },
        ]);
      } catch (err) {
        console.error('Error loading fares:', err);
        setError('Failed to load fare data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFares();
  }, []);
  
  const handleTourFareUpdate = async (vehicleId: string, tourId: string, price: number) => {
    try {
      const updatedFare = tourFares.find(tf => tf.tourId === tourId);
      
      if (!updatedFare) {
        toast.error('Tour fare not found');
        return;
      }
      
      const updatedData = {
        ...updatedFare,
        [vehicleId]: price
      };
      
      await fareAPI.updateTourFare(updatedData);
      toast.success(`Updated ${vehicleId} price for ${tourId}`);
      
      // Refresh the data
      const tourFaresData = await fareAPI.getTourFares();
      if (Array.isArray(tourFaresData)) {
        setTourFares(tourFaresData);
      }
    } catch (error) {
      console.error('Error updating tour fare:', error);
      toast.error('Failed to update tour fare');
    }
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="local">Local Fares</TabsTrigger>
          <TabsTrigger value="outstation">Outstation Fares</TabsTrigger>
          <TabsTrigger value="airport">Airport Fares</TabsTrigger>
          <TabsTrigger value="tours">Tour Fares</TabsTrigger>
        </TabsList>
        
        <TabsContent value="local">
          <Card>
            <CardHeader>
              <CardTitle>Local Package Fares</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error} />
              ) : localFares.length === 0 ? (
                <EmptyState message="No local fare data available" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>4hrs/40km</TableHead>
                      <TableHead>8hrs/80km</TableHead>
                      <TableHead>12hrs/120km</TableHead>
                      <TableHead>Extra Km</TableHead>
                      <TableHead>Extra Hour</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localFares.map((fare) => (
                      <TableRow key={fare.id}>
                        <TableCell className="font-medium">{fare.vehicle}</TableCell>
                        <TableCell>
                          ₹{fare.packages.find((p: any) => p.hours === 4 && p.km === 40)?.price || 'N/A'}
                        </TableCell>
                        <TableCell>
                          ₹{fare.packages.find((p: any) => p.hours === 8 && p.km === 80)?.price || 'N/A'}
                        </TableCell>
                        <TableCell>
                          ₹{fare.packages.find((p: any) => p.hours === 12 && p.km === 120)?.price || 'N/A'}
                        </TableCell>
                        <TableCell>₹{fare.extraKmRate}/km</TableCell>
                        <TableCell>₹{fare.extraHourRate}/hr</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="outstation">
          <Card>
            <CardHeader>
              <CardTitle>Outstation Fares</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error} />
              ) : outstationFares.length === 0 ? (
                <EmptyState message="No outstation fare data available" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>One-way Base</TableHead>
                      <TableHead>One-way /km</TableHead>
                      <TableHead>Round Base</TableHead>
                      <TableHead>Round /km</TableHead>
                      <TableHead>Driver Allow.</TableHead>
                      <TableHead>Night Halt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstationFares.map((fare) => (
                      <TableRow key={fare.id}>
                        <TableCell className="font-medium">{fare.vehicle}</TableCell>
                        <TableCell>₹{fare.basePrice}</TableCell>
                        <TableCell>₹{fare.pricePerKm}</TableCell>
                        <TableCell>₹{fare.roundTripBasePrice}</TableCell>
                        <TableCell>₹{fare.roundTripPricePerKm}</TableCell>
                        <TableCell>₹{fare.driverAllowance}</TableCell>
                        <TableCell>₹{fare.nightHaltCharge}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="airport">
          <Card>
            <CardHeader>
              <CardTitle>Airport Fares</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error} />
              ) : airportFares.length === 0 ? (
                <EmptyState message="No airport fare data available" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Pickup</TableHead>
                      <TableHead>Drop</TableHead>
                      <TableHead>Tier 1</TableHead>
                      <TableHead>Tier 2</TableHead>
                      <TableHead>Tier 3</TableHead>
                      <TableHead>Tier 4</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {airportFares.map((fare) => (
                      <TableRow key={fare.id}>
                        <TableCell className="font-medium">{fare.vehicle}</TableCell>
                        <TableCell>₹{fare.pickup}</TableCell>
                        <TableCell>₹{fare.drop}</TableCell>
                        <TableCell>₹{fare.tier1}</TableCell>
                        <TableCell>₹{fare.tier2}</TableCell>
                        <TableCell>₹{fare.tier3}</TableCell>
                        <TableCell>₹{fare.tier4}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tours">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tour Fares</CardTitle>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Tour
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error} />
              ) : tourFares.length === 0 ? (
                <EmptyState message="No tour fare data available" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tour ID</TableHead>
                      {vehicles.slice(0, 3).map((vehicle) => (
                        <TableHead key={vehicle.id}>{vehicle.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tourFares.map((fare) => (
                      <TableRow key={fare.tourId}>
                        <TableCell className="font-medium">{fare.tourId}</TableCell>
                        {vehicles.slice(0, 3).map((vehicle) => (
                          <TableCell key={vehicle.id}>
                            ₹{fare[vehicle.id.toLowerCase()] || 'N/A'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-[40px] w-full rounded-md" />
      <Skeleton className="h-[40px] w-full rounded-md" />
      <Skeleton className="h-[40px] w-full rounded-md" />
      <Skeleton className="h-[40px] w-full rounded-md" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <p className="text-muted-foreground">{message}</p>
      <Button className="mt-4">
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Fare Data
      </Button>
    </div>
  );
}
