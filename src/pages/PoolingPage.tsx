
import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { EnhancedPoolingSearch } from '@/components/pooling/EnhancedPoolingSearch';
import { EnhancedRideCard } from '@/components/pooling/EnhancedRideCard';
import { RideDetailsModal } from '@/components/pooling/RideDetailsModal';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Car, Bus, Users, Info, LogIn, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide, PoolingSearchRequest, RideRequest } from '@/types/pooling';
import { useNavigate } from 'react-router-dom';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';

const PoolingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, canCreateRide, logout } = usePoolingAuth();
  const [searchParams, setSearchParams] = useState<PoolingSearchRequest | null>(null);
  const [selectedRide, setSelectedRide] = useState<PoolingRide | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const { data: rides, isLoading, error } = useQuery({
    queryKey: ['pooling-rides', searchParams],
    queryFn: () => searchParams ? poolingAPI.searchRides(searchParams) : Promise.resolve([]),
    enabled: !!searchParams,
  });

  const handleSearch = (params: PoolingSearchRequest) => {
    setSearchParams(params);
  };

  const handleRideRequest = async (rideId: number, request: Omit<RideRequest, 'id' | 'requestedAt'>) => {
    if (!isAuthenticated) {
      toast.error('Please login to request a ride');
      navigate('/pooling/login');
      return;
    }

    try {
      // In a real app, this would call an API to send the request
      console.log('Sending ride request:', { rideId, request });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Ride request sent successfully!');
    } catch (error) {
      console.error('Failed to send ride request:', error);
      toast.error('Failed to send ride request. Please try again.');
    }
  };

  const handleViewDetails = (ride: PoolingRide) => {
    setSelectedRide(ride);
    setIsDetailsModalOpen(true);
  };

  const handleCreateRide = () => {
    if (!isAuthenticated) {
      toast.error('Please login to create a ride');
      navigate('/pooling/login');
      return;
    }

    if (user?.role !== 'provider') {
      toast.error('Only providers can create rides');
      return;
    }

    if (!canCreateRide()) {
      toast.error('Providers need minimum ₹500 wallet balance to create rides');
      return;
    }

    navigate('/pooling/provider');
  };

  const handleLogin = () => {
    navigate('/pooling/login');
  };

  const handleDashboard = () => {
    switch (user?.role) {
      case 'admin':
        navigate('/pooling/admin');
        break;
      case 'provider':
        navigate('/pooling/provider');
        break;
      default:
        // Guest users stay on main pooling page
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-blue-600">Pooling Platform</h1>
            </div>
            <div className="flex items-center space-x-3">
              {!isAuthenticated ? (
                <>
                  <Button variant="outline" onClick={handleLogin}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                  <Button onClick={handleLogin}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sign Up
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-600">
                    Welcome, {user.name} ({user.role})
                  </div>
                  {user.role !== 'guest' && (
                    <Button variant="outline" onClick={handleDashboard}>
                      Dashboard
                    </Button>
                  )}
                  <Button variant="outline" onClick={logout}>
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Ride Sharing & Bus Booking
            </h1>
            <p className="text-gray-600">
              Find affordable car pools and bus rides between major cities
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            {isAuthenticated && user?.role === 'provider' && (
              <Button onClick={handleCreateRide} disabled={!canCreateRide()}>
                <Plus className="mr-2 h-4 w-4" />
                Offer a Ride
              </Button>
            )}
          </div>
        </div>

        {/* Wallet Balance Alert for Providers */}
        {isAuthenticated && user?.role === 'provider' && !canCreateRide() && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              You need a minimum wallet balance of ₹500 to create rides. 
              Current balance: ₹{user.walletBalance || 0}
            </AlertDescription>
          </Alert>
        )}

        {/* Search Component */}
        <div className="mb-8">
          <EnhancedPoolingSearch onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Results Section */}
        {searchParams && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Available {searchParams.type} rides from {searchParams.from} to {searchParams.to}
              </h2>
              {rides && (
                <span className="text-gray-600">
                  {rides.length} rides found
                </span>
              )}
            </div>

            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Searching for rides...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-600">
                  Error loading rides. {error instanceof Error ? error.message : 'Please try again.'}
                </p>
              </div>
            )}

            {rides && rides.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No rides found for your search criteria.</p>
                {isAuthenticated && user?.role === 'provider' && canCreateRide() && (
                  <Button onClick={handleCreateRide} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Be the first to offer a ride
                  </Button>
                )}
              </div>
            )}

            {rides && rides.length > 0 && (
              <div className="space-y-4">
                {rides.map((ride) => (
                  <EnhancedRideCard
                    key={ride.id}
                    ride={ride}
                    onRequestSent={handleRideRequest}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Default Content When No Search */}
        {!searchParams && (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-4">Ready to start your journey?</h3>
            <p className="text-gray-600 mb-8">
              Search for available rides or {isAuthenticated && user?.role === 'provider' ? 'offer your own' : 'join as a provider'} to start sharing rides with others.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <Car className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Car Pooling</h4>
                <p className="text-sm text-gray-600">Share rides with fellow travelers and split costs</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <Bus className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Bus Travel</h4>
                <p className="text-sm text-gray-600">Book seats on scheduled bus routes</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Shared Taxis</h4>
                <p className="text-sm text-gray-600">Join others for door-to-door taxi rides</p>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="mt-8">
                <Button onClick={handleLogin} size="lg">
                  Join Pooling Platform
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ride Details Modal */}
      <RideDetailsModal
        ride={selectedRide}
        open={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRide(null);
        }}
        onBook={() => {}} // Will be handled by request system
      />
    </div>
  );
};

export default PoolingPage;
