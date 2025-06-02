import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide, PoolingSearchRequest, PoolingBooking, PoolingType } from '@/types/pooling';
import { toast } from 'sonner';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { BookingModal } from '../components/pooling/BookingModal';

export default function GuestDashboardPage() {
  const navigate = useNavigate();
  const { user } = usePoolingAuth();
  const [searchParams, setSearchParams] = useState<PoolingSearchRequest | null>(null);
  const [rides, setRides] = useState<PoolingRide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState<PoolingRide | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Simple search form state
  const [form, setForm] = useState<{
    type: PoolingType;
    from: string;
    to: string;
    date: string;
    passengers: number;
  }>({
    type: 'car',
    from: '',
    to: '',
    date: '',
    passengers: 1,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from || !form.to || !form.date) {
      toast.error('Please fill all fields');
      return;
    }
    setIsLoading(true);
    setSearchParams({ ...form, type: form.type as PoolingType, sortBy: 'time' });
    try {
      const results = await poolingAPI.rides.search({
        ...form,
        type: form.type as PoolingType,
        passengers: Number(form.passengers),
        sortBy: 'time',
      });
      setRides(results);
    } catch (err) {
      toast.error('Failed to fetch rides');
      setRides([]);
    }
    setIsLoading(false);
  };

  const handleBookRide = (ride: PoolingRide) => {
    setSelectedRide(ride);
    setIsBookingModalOpen(true);
  };

  const handleBookingComplete = async () => {
    setIsBookingModalOpen(false);
    setSelectedRide(null);
    // Refresh rides after booking
    if (searchParams) {
      setIsLoading(true);
      try {
        const results = await poolingAPI.rides.search({
          ...searchParams,
          passengers: Number(form.passengers),
        });
        setRides(results);
      } catch {
        setRides([]);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 py-8">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-xl text-center mb-8">
        <h1 className="text-2xl font-bold mb-4">Welcome to the Pooling Platform</h1>
        <p className="mb-4">You are logged in as a <span className="font-semibold text-blue-600">Guest</span>.</p>
        <p className="mb-4">You can now search for rides, book seats, and manage your pooling bookings.</p>
        <p className="text-gray-500">If you want to offer rides, please register as a provider.</p>
      </div>

      {/* Ride Search Form */}
      <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow w-full max-w-xl mb-8">
        <div className="flex flex-wrap gap-4 mb-4">
          <select name="type" value={form.type} onChange={handleInputChange} className="border rounded p-2 flex-1">
            <option value="car">Car</option>
            <option value="shared-taxi">Shared Taxi</option>
            <option value="bus">Bus</option>
          </select>
          <input
            name="from"
            value={form.from}
            onChange={handleInputChange}
            placeholder="From (City)"
            className="border rounded p-2 flex-1"
            required
          />
          <input
            name="to"
            value={form.to}
            onChange={handleInputChange}
            placeholder="To (City)"
            className="border rounded p-2 flex-1"
            required
          />
        </div>
        <div className="flex gap-4 mb-4">
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleInputChange}
            className="border rounded p-2 flex-1"
            required
          />
          <input
            type="number"
            name="passengers"
            value={form.passengers}
            min={1}
            max={10}
            onChange={handleInputChange}
            className="border rounded p-2 w-24"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? 'Searching...' : 'Search Rides'}
        </button>
      </form>

      {/* Search Results */}
      {searchParams && (
        <div className="w-full max-w-2xl">
          <h2 className="text-lg font-semibold mb-4 text-center">
            {rides.length > 0
              ? `Available rides from ${searchParams.from} to ${searchParams.to}`
              : 'No rides found for your search.'}
          </h2>
          {isLoading && <div className="text-center">Loading rides...</div>}
          <div className="space-y-4">
            {rides.map((ride) => (
              <div key={ride.id} className="border rounded-lg p-4 bg-white shadow flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-bold text-blue-700">{ride.fromLocation} → {ride.toLocation}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(ride.departureTime).toLocaleString()} | {ride.type}
                  </div>
                  <div className="text-sm text-gray-600">
                    Provider: {ride.providerName} ({ride.providerPhone})
                  </div>
                  <div className="text-sm text-gray-600">
                    ₹{ride.pricePerSeat} per seat | {ride.availableSeats} seats left
                  </div>
                </div>
                <button
                  className="mt-4 md:mt-0 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  onClick={() => handleBookRide(ride)}
                >
                  Book
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {isBookingModalOpen && selectedRide && user && (
        <BookingModal
          ride={selectedRide}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onBookingComplete={handleBookingComplete}
          user={user}
        />
      )}
    </div>
  );
}