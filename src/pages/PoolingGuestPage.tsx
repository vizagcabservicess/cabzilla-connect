
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { GuestSearch } from '@/components/pooling/guest/GuestSearch';
import { RideCard } from '@/components/pooling/RideCard';
import { RideRequestModal } from '@/components/pooling/guest/RideRequestModal';
import { useQuery } from '@tanstack/react-query';
import { guestPoolingAPI } from '@/services/api/guestPoolingAPI';
import { RideSearchFilters } from '@/types/poolingGuest';
import { PoolingRide } from '@/types/pooling';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PoolingGuestPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = usePoolingAuth();
  const [searchFilters, setSearchFilters] = useState<RideSearchFilters | null>(null);
  const [selectedRide, setSelectedRide] = useState<PoolingRide | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const { data: rides, isLoading, error } = useQuery({
    queryKey: ['guest-rides', searchFilters],
    queryFn: () => searchFilters ? guestPoolingAPI.searchRides(searchFilters) : Promise.resolve([]),
    enabled: !!searchFilters,
  });

  const handleSearch = (filters: RideSearchFilters) => {
    setSearchFilters(filters);
  };

  const handleRideRequest = (ride: PoolingRide) => {
    if (!isAuthenticated) {
      toast.error('Please login to request a ride');
      navigate('/pooling/auth');
      return;
    }
    setSelectedRide(ride);
    setIsRequestModalOpen(true);
  };

  const handleRequestSubmit = async (requestData: any) => {
    try {
      await guestPoolingAPI.submitRideRequest(requestData);
      setIsRequestModalOpen(false);
      setSelectedRide(null);
    } catch (error) {
      throw error;
    }
  };

  const handleViewDetails = (ride: PoolingRide) => {
    navigate(`/pooling/ride/${ride.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find & Book Rides
          </h1>
          <p className="text-gray-600">
            Search for available rides and request to join
          </p>
          {isAuthenticated && (
            <p className="text-sm text-blue-600 mt-2">
              Welcome back, {user?.name}! 
              <button 
                onClick={() => navigate('/pooling/guest/dashboard')}
                className="ml-2 underline hover:no-underline"
              >
                View Dashboard
              </button>
            </p>
          )}
        </div>

        {/* Search Component */}
        <div className="mb-8">
          <GuestSearch onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Results Section */}
        {searchFilters && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Available Rides from {searchFilters.from} to {searchFilters.to}
              </h2>
              {rides && (
                <span className="text-gray-600">
                  {rides.length} rides found
                </span>
              )}
            </div>

            {isLoading && (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Searching for rides...</p>
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
                <p className="text-sm text-gray-500">
                  Try adjusting your search filters or check back later for new rides.
                </p>
              </div>
            )}

            {rides && rides.length > 0 && (
              <div className="space-y-4">
                {rides.map((ride) => (
                  <RideCard
                    key={ride.id}
                    ride={ride}
                    onBook={handleRideRequest}
                    onViewDetails={handleViewDetails}
                    isGuest={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Default Content When No Search */}
        {!searchFilters && (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-4">Ready to find your next ride?</h3>
            <p className="text-gray-600 mb-8">
              Use the search form above to find available rides in your area.
            </p>
            {!isAuthenticated && (
              <div className="bg-blue-50 p-6 rounded-lg max-w-md mx-auto">
                <h4 className="font-semibold text-blue-900 mb-2">Join as a Guest</h4>
                <p className="text-blue-800 text-sm mb-4">
                  Sign up to request rides, track bookings, and communicate with providers.
                </p>
                <button 
                  onClick={() => navigate('/pooling/auth')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Sign Up / Login
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ride Request Modal */}
      <RideRequestModal
        ride={selectedRide}
        open={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false);
          setSelectedRide(null);
        }}
        onRequestSubmit={handleRequestSubmit}
      />
    </div>
  );
}
