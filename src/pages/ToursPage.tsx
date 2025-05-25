import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { LocationInput } from '@/components/LocationInput';
import { DateTimePicker } from '@/components/DateTimePicker';
import { GuestDetailsForm } from '@/components/GuestDetailsForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Clock, Users, Star, Car, Plane, Train, Camera } from 'lucide-react';
import { tourPackages, POPULAR_DESTINATIONS } from '@/lib/tourData';
import { Location, BookingRequest } from '@/types/api';
import { useToast } from '@/components/ui/use-toast';
import { getDistance } from '@/lib/distanceService';

export default function ToursPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [returnDate, setReturnDate] = useState<Date>(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);

  const calculatePrice = async () => {
    if (!selectedTour || !pickupLocation) {
      return;
    }

    setIsCalculatingPrice(true);
    try {
      const distance = await getDistance(
        pickupLocation.lat,
        pickupLocation.lng,
        17.6868, // Destination Latitude
        83.2185  // Destination Longitude
      );

      const basePrice = selectedTour.price;
      const distanceFactor = distance > 100 ? 1.2 : 1;
      const totalPrice = basePrice * distanceFactor;

      setTotalPrice(totalPrice);
    } catch (error) {
      console.error("Failed to calculate price:", error);
      toast({
        title: "Error",
        description: "Failed to calculate the total price. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  useEffect(() => {
    calculatePrice();
  }, [selectedTour, pickupLocation]);

  const handleLocationChange = (location: any) => {
    const formattedLocation: Location = {
      id: location.place_id || 'selected',
      name: location.description || location.main_text,
      address: location.description || location.main_text,
      lat: 17.6868,
      lng: 83.2185,
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      type: 'other',
      popularityScore: 50,
      description: location.description || location.main_text
    };
    setPickupLocation(formattedLocation);
  };

  const handleBookingSubmit = async (contactDetails: any) => {
    if (!selectedTour || !pickupLocation) {
      toast({
        title: "Error",
        description: "Please select a tour and pickup location.",
        variant: "destructive",
      });
      return;
    }

    const bookingRequest: BookingRequest = {
      pickupLocation: pickupLocation.name,
      dropLocation: selectedTour.destinations.join(', '),
      pickupDate: pickupDate.toISOString(),
      returnDate: returnDate.toISOString(),
      cabType: 'Sedan',
      distance: 150,
      tripType: 'Round Trip',
      tripMode: 'Tour',
      totalAmount: totalPrice,
      passengerName: contactDetails.name,
      passengerPhone: contactDetails.phone,
      passengerEmail: contactDetails.email,
      tourId: selectedTour.id
    };

    console.log('Booking Request:', bookingRequest);

    toast({
      title: "Booking Confirmed",
      description: "Your tour has been booked successfully!",
    });

    navigate('/bookings');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {!showBookingForm ? (
        <div>
          <Hero 
            title="Explore Amazing Tours"
            subtitle="Discover beautiful destinations with our curated tour packages"
            showSearchForm={false}
          />
          
          {/* Popular Destinations */}
          <section className="py-12 bg-white">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-8">Popular Destinations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {POPULAR_DESTINATIONS.map((destination) => (
                  <Card key={destination.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                        <Camera className="h-12 w-12 text-white" />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{destination.name}</h3>
                      <p className="text-gray-600 text-sm mb-3">{destination.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-500">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="text-sm">{destination.distance}</span>
                        </div>
                        <Badge variant="outline">{destination.type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Tour Packages */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-8">Tour Packages</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {tourPackages.map((tour) => (
                  <Card key={tour.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-48 bg-gradient-to-r from-green-500 to-blue-600 relative">
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                        <Camera className="h-12 w-12 text-white" />
                      </div>
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-white text-green-600">{tour.duration}</Badge>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-xl">{tour.name}</h3>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm font-medium">{tour.rating}</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{tour.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{tour.destinations.join(', ')}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{tour.duration}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="h-4 w-4 mr-2" />
                          <span>Up to {tour.maxGuests} guests</span>
                        </div>
                      </div>

                      <Separator className="my-4" />
                      
                      <div className="space-y-2 mb-4">
                        <h4 className="font-semibold text-sm">Includes:</h4>
                        <ScrollArea className="h-20">
                          <ul className="text-sm text-gray-600 space-y-1">
                            {tour.includes.map((item, index) => (
                              <li key={index} className="flex items-start">
                                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-green-600">₹{tour.price.toLocaleString()}</span>
                          <span className="text-sm text-gray-500 ml-1">per person</span>
                        </div>
                        <Button 
                          onClick={() => {
                            setSelectedTour(tour);
                            setShowBookingForm(true);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Book Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setShowBookingForm(false)}
              className="mb-4"
            >
              ← Back to Tours
            </Button>
            <h1 className="text-2xl font-bold">Book {selectedTour?.name}</h1>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tour Details</CardTitle>
                  <CardDescription>Selected tour package information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{selectedTour?.name}</h3>
                    <p className="text-gray-600">{selectedTour?.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Duration:</span>
                    <span>{selectedTour?.duration}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Price per person:</span>
                    <span className="text-green-600 font-bold">₹{selectedTour?.price?.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trip Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LocationInput
                    label="Pickup Location"
                    placeholder="Enter your pickup location"
                    value={pickupLocation?.name || ''}
                    onLocationChange={handleLocationChange}
                    isPickupLocation={true}
                  />
                  
                  <DateTimePicker
                    label="Tour Start Date"
                    date={pickupDate}
                    onDateChange={setPickupDate}
                    minDate={new Date()}
                  />

                  {selectedTour?.duration && selectedTour.duration.includes('day') && (
                    <DateTimePicker
                      label="Tour End Date"
                      date={returnDate}
                      onDateChange={setReturnDate}
                      minDate={pickupDate}
                    />
                  )}

                  {totalPrice > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Amount:</span>
                        <span className="text-2xl font-bold text-green-600">
                          ₹{totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <GuestDetailsForm
                onSubmit={handleBookingSubmit}
                totalPrice={totalPrice}
                bookingId={`tour-${selectedTour?.id}-${Date.now()}`}
                isSubmitting={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
