import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { PoolingSearch } from '@/components/pooling/PoolingSearch';
import { RideCard } from '@/components/pooling/RideCard';
import { RideDetailsModal } from '@/components/pooling/RideDetailsModal';
import { Button } from '@/components/ui/button';
import { Plus, Car, Bus, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide, PoolingSearchRequest } from '@/types/pooling';
import { useNavigate } from 'react-router-dom';

const PoolingPage = () => {
  const navigate = useNavigate();
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

  const handleBookRide = (ride: PoolingRide) => {
    navigate(`/pooling/book/${ride.id}`);
  };

  const handleViewDetails = (ride: PoolingRide) => {
    setSelectedRide(ride);
    setIsDetailsModalOpen(true);
  };

  const handleCreateRide = () => {
    navigate('/pooling/create');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
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
          <Button onClick={handleCreateRide} className="mt-4 md:mt-0">
            <Plus className="mr-2 h-4 w-4" />
            Offer a Ride
          </Button>
        </div>

        {/* Search Component */}
        <div className="mb-8">
          <PoolingSearch onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Results Section */}
        {searchParams && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Available Rides from {searchParams.from} to {searchParams.to}
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
                <Button onClick={handleCreateRide} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Be the first to offer a ride
                </Button>
              </div>
            )}

            {rides && rides.length > 0 && (
              <div className="space-y-4">
                {rides.map((ride) => (
                  <RideCard
                    key={ride.id}
                    ride={ride}
                    onBook={handleBookRide}
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
              Search for available rides or offer your own to start sharing rides with others.
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
        onBook={handleBookRide}
      />
    </div>
  );
};

export default PoolingPage;
