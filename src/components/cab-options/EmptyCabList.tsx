
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Database, Car, Info, FileWarning, RotateCcw, FilePlus2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface EmptyCabListProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function EmptyCabList({ onRefresh, isRefreshing }: EmptyCabListProps) {
  const [isResetting, setIsResetting] = useState(false);
  
  const handleClearCache = () => {
    localStorage.removeItem('cachedVehicles');
    localStorage.removeItem('localVehicles');
    sessionStorage.clear();
    window.location.reload();
  };
  
  const handleHardReset = async () => {
    setIsResetting(true);
    try {
      // Add default vehicles to localStorage as fallback
      const defaultVehicles = [
        {
          id: 'sedan',
          name: 'Sedan',
          capacity: 4,
          luggageCapacity: 2,
          price: 4200,
          basePrice: 4200,
          pricePerKm: 14,
          image: '/cars/sedan.png',
          amenities: ['AC', 'Bottle Water', 'Music System'],
          description: 'Comfortable sedan suitable for 4 passengers.',
          ac: true,
          nightHaltCharge: 700,
          driverAllowance: 250,
          isActive: true,
          vehicleId: 'sedan'
        },
        {
          id: 'ertiga',
          name: 'Ertiga',
          capacity: 6,
          luggageCapacity: 3,
          price: 5400,
          basePrice: 5400,
          pricePerKm: 18,
          image: '/cars/ertiga.png',
          amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
          description: 'Spacious SUV suitable for 6 passengers.',
          ac: true,
          nightHaltCharge: 1000,
          driverAllowance: 250,
          isActive: true,
          vehicleId: 'ertiga'
        },
        {
          id: 'innova_crysta',
          name: 'Innova Crysta',
          capacity: 7,
          luggageCapacity: 4,
          price: 6000,
          basePrice: 6000,
          pricePerKm: 20,
          image: '/cars/innova.png',
          amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
          description: 'Premium SUV with ample space for 7 passengers.',
          ac: true,
          nightHaltCharge: 1000,
          driverAllowance: 250,
          isActive: true,
          vehicleId: 'innova_crysta'
        }
      ];
      
      // Save default vehicles to localStorage
      localStorage.setItem('localVehicles', JSON.stringify(defaultVehicles));
      console.log('Saved default vehicles to localStorage');
      
      // Initialize database tables if possible
      try {
        const initializeEndpoints = [
          '/api/admin/direct-fare-update.php?initialize=true',
          '/api/fares/initialize-db.php'
        ];
        
        const promises = initializeEndpoints.map(endpoint => 
          fetch(endpoint)
            .then(res => res.text())
            .catch(err => console.error(`Error initializing tables from ${endpoint}:`, err))
        );
        
        await Promise.all(promises);
        console.log('Initialized database tables');
      } catch (error) {
        console.error('Error initializing database tables:', error);
      }
      
      // Clear all caches
      localStorage.removeItem('cachedVehicles');
      sessionStorage.clear();
      
      // Show success toast
      toast.success('System reset and default vehicles restored. Reloading page...', { duration: 3000 });
      
      // Trigger the custom event
      window.dispatchEvent(new CustomEvent('vehicle-data-changed', {
        detail: { 
          operation: 'reset',
          timestamp: Date.now()
        }
      }));
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error during system reset:', error);
      toast.error('Failed to reset system. Try reloading the page manually.');
      setIsResetting(false);
    }
  };
  
  const goToDatabaseTroubleshooting = () => {
    // This would link to a new page with database troubleshooting tools
    toast.info('Opening troubleshooting tools...', { duration: 2000 });
  };
  
  return (
    <div className="p-8 text-center border rounded-lg bg-gray-50">
      <div className="flex justify-center mb-4">
        <div className="relative">
          <Car className="h-12 w-12 text-blue-500" />
          <AlertCircle className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1" />
        </div>
      </div>
      <h3 className="font-semibold text-lg mb-2">No Vehicles Available</h3>
      <p className="text-gray-500 mb-4">
        We couldn't find any vehicles matching your criteria. This may be due to a connection issue or because no vehicles have been configured yet.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3 mt-2">
        <Button 
          variant="outline"
          onClick={handleClearCache}
          className="flex items-center justify-center"
        >
          <Database className="h-4 w-4 mr-2" />
          Clear Cache & Reload
        </Button>
        <Button 
          variant="outline"
          onClick={handleHardReset}
          disabled={isResetting}
          className="flex items-center justify-center"
        >
          <RotateCcw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
          {isResetting ? 'Resetting...' : 'Reset & Add Default Vehicles'}
        </Button>
        <Button 
          variant="default"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Vehicles'}
        </Button>
      </div>
      
      <div className="mt-4">
        <Link to="/admin/vehicles/add">
          <Button 
            variant="secondary"
            className="flex items-center justify-center"
          >
            <FilePlus2 className="h-4 w-4 mr-2" />
            Create New Vehicle
          </Button>
        </Link>
      </div>
      
      <div className="mt-5 p-3 border border-yellow-300 bg-yellow-50 rounded-md">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-xs text-left text-yellow-800">
            <p className="font-semibold mb-1">Troubleshooting Tips:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Check if your PHP API server is running correctly</li>
              <li>Verify that your database connection is configured properly</li>
              <li>Make sure the vehicle_types and vehicle_pricing tables exist</li>
              <li>Try clicking "Reset & Add Default Vehicles" to create default vehicles</li>
              <li>The app will work in offline mode if your server is unavailable</li>
              <li>Check the console logs for more specific error details (F12)</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-4 text-xs text-gray-400">
        If problems persist, please check server logs for errors or contact support.
      </div>
    </div>
  );
}
