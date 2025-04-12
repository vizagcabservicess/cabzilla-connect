
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CabType } from '@/types/cab';
import { useToast } from '@/components/ui/use-toast';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  handleSelectCab: (cab: CabType) => void;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  getFareDetails: (cab: CabType) => string;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  handleSelectCab,
  cabFares,
  isCalculatingFares,
  getFareDetails
}) => {
  const { toast } = useToast();
  const [faresReady, setFaresReady] = useState(false);
  
  // Add debugging info to track when fares are ready
  useEffect(() => {
    if (!isCalculatingFares && Object.keys(cabFares).length > 0) {
      console.log('CabList: Fares are ready:', cabFares);
      
      if (!faresReady) {
        setFaresReady(true);
      }
    }
  }, [isCalculatingFares, cabFares, faresReady]);
  
  const displayPrice = (cabId: string): React.ReactNode => {
    // For debugging
    console.log(`CabList: Displaying price for cab ${cabId}:`, cabFares[cabId]);
    
    if (isCalculatingFares) {
      return <Skeleton className="h-5 w-20 bg-gray-200" />;
    }
    
    const amount = cabFares[cabId] || 0;
    if (amount <= 0) {
      return <span className="text-gray-600">Price unavailable</span>;
    }
    
    return (
      <div className="flex items-baseline">
        <span className="text-2xl font-bold text-blue-600">₹{amount.toLocaleString('en-IN')}</span>
      </div>
    );
  };
  
  const sortedCabTypes = [...cabTypes].sort((a, b) => {
    const fareA = cabFares[a.id] || 0;
    const fareB = cabFares[b.id] || 0;
    return fareA - fareB;
  });

  return (
    <div className="space-y-6">
      <div className="text-lg font-semibold">Available Cabs</div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCabTypes.map((cab) => (
          <Card 
            key={cab.id}
            className={cn(
              "cursor-pointer hover:shadow-md transition-all",
              selectedCabId === cab.id ? "ring-2 ring-blue-500 shadow-lg" : "hover:border-blue-200"
            )}
            onClick={() => {
              // Add additional validation to ensure fare is valid
              const fare = cabFares[cab.id] || 0;
              if (fare <= 0) {
                toast({
                  title: "Price unavailable",
                  description: `Cannot select ${cab.name} as pricing information is not available.`,
                  variant: "destructive"
                });
                return;
              }
              
              // Dispatch a fare event for debugging
              window.dispatchEvent(new CustomEvent('fare-selected', {
                detail: {
                  cabId: cab.id,
                  cabName: cab.name,
                  fare: fare,
                  timestamp: Date.now()
                }
              }));
              
              handleSelectCab(cab);
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{cab.name}</CardTitle>
                
                <div className="text-right">
                  {displayPrice(cab.id)}
                  <CardDescription className="text-xs text-gray-500 mt-1">
                    {getFareDetails(cab)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pb-2">
              <div className="flex items-center text-sm text-gray-700">
                <span className="mr-4">{cab.capacity} persons</span>
                <span>{cab.luggageCapacity} bags</span>
              </div>
            </CardContent>
            
            <CardFooter className="pt-0">
              <div className="flex w-full justify-between items-center text-xs text-gray-600">
                <div className="flex items-center">
                  {cab.ac && <span className="mr-2">AC</span>}
                  {cab.amenities && cab.amenities.length > 0 && (
                    <span>+{cab.amenities.length} amenities</span>
                  )}
                </div>
                
                <div>
                  {selectedCabId === cab.id && (
                    <span className="text-blue-600 font-semibold">Selected</span>
                  )}
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CabList;
