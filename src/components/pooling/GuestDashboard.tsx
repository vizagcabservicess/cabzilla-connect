
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide, PoolingBooking, RideRequest } from '@/types/pooling';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

import { GuestDashboardHeader } from './GuestDashboardHeader';
import { EnhancedGuestSearch } from './EnhancedGuestSearch';
import { EnhancedRideCard } from './EnhancedRideCard';
import { EnhancedWallet } from './EnhancedWallet';
import { EnhancedBookings } from './EnhancedBookings';

interface SearchParams {
  type: string;
  from: string;
  to: string;
  date: string;
  passengers: number;
  maxPrice?: number;
  sortBy: 'time' | 'price' | 'rating';
}

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { user } = usePoolingAuth();
  const [rides, setRides] = useState<PoolingRide[]>([]);
  const [bookings, setBookings] = useState<PoolingBooking[]>([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      const [userBookings, userTransactions] = await Promise.all([
        poolingAPI.bookings.getByUser(user.id),
        poolingAPI.wallet.getTransactions(user.id)
      ]);
      setBookings(userBookings);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);
    
    try {
      const searchResults = await poolingAPI.rides.search({
        type: params.type,
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers,
        maxPrice: params.maxPrice,
        sortBy: params.sortBy
      });
      setRides(searchResults);
      toast.success(`Found ${searchResults.length} rides`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search rides');
      setRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRideRequest = async (ride: PoolingRide) => {
    if (!user || !searchParams) return;

    try {
      const requestPayload: Omit<RideRequest, 'id' | 'requestedAt'> = {
        rideId: ride.id,
        guestId: user.id,
        guestName: user.name,
        guestPhone: user.phone || '',
        guestEmail: user.email,
        seatsRequested: searchParams.passengers,
        status: 'pending',
        requestMessage: `Request for ${searchParams.passengers} seat(s) from ${searchParams.from} to ${searchParams.to}`
      };

      await poolingAPI.requests.create(requestPayload);
      toast.success('Ride request sent! Wait for provider approval.');
      loadUserData(); // Refresh bookings
    } catch (error) {
      console.error('Failed to send ride request:', error);
      toast.error('Failed to send ride request');
    }
  };

  const handleLogout = () => {
    navigate('/pooling/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GuestDashboardHeader onLogout={handleLogout} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-8">
            {/* Search Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Your Ride</h2>
              <EnhancedGuestSearch onSearch={handleSearch} isLoading={isLoading} />
            </div>

            {/* Search Results */}
            {searchParams && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Available Rides
                  </h2>
                  {rides.length > 0 && (
                    <div className="text-sm text-gray-600">
                      {rides.length} rides found from {searchParams.from} to {searchParams.to}
                    </div>
                  )}
                </div>

                {isLoading && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Searching for rides...</p>
                    </CardContent>
                  </Card>
                )}

                {!isLoading && rides.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="text-gray-500 mb-4">
                        <Info className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No rides found</p>
                        <p className="text-sm">Try adjusting your search criteria or check back later.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!isLoading && rides.length > 0 && (
                  <div className="space-y-4">
                    {rides.map((ride) => (
                      <EnhancedRideCard
                        key={ride.id}
                        ride={ride}
                        onRequestRide={handleRideRequest}
                        requestedSeats={searchParams.passengers}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Welcome Message */}
            {!searchParams && (
              <Card>
                <CardContent className="text-center py-16">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Welcome to Pooling Platform
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                    Find and book affordable shared rides, car pools, and bus travel between cities. 
                    Search for available rides above to get started.
                  </p>
                  <Alert className="max-w-md mx-auto">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Start by searching for rides using the form above. You can filter by vehicle type, 
                      price, and departure time to find the perfect ride.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <EnhancedWallet 
              transactions={transactions} 
              onTransactionUpdate={loadUserData} 
            />
            <EnhancedBookings bookings={bookings} />
          </div>
        </div>
      </div>
    </div>
  );
}
