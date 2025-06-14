import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  MapPin, 
  Calendar, 
  Image,
  RefreshCw
} from "lucide-react";
import { TourFormModal } from "./TourFormModal";
import { tourManagementAPI, TourData } from '@/services/api/tourManagementAPI';
import { vehicleAPI } from '@/services/api/vehicleAPI';
import { Vehicle } from '@/types/vehicle';
import { TourManagementRequest } from '@/types/api';

export default function TourManagement() {
  const [tours, setTours] = useState<TourData[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<TourData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTours();
    loadVehicles();
  }, []);

  const loadTours = async () => {
    try {
      setIsLoading(true);
      const toursData = await tourManagementAPI.getTours();
      setTours(toursData);
    } catch (error) {
      console.error('Error loading tours:', error);
      toast({
        title: "Error",
        description: "Failed to load tours",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const vehiclesData = await vehicleAPI.getVehicles();
      setVehicles(vehiclesData.vehicles || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast({
        title: "Error",
        description: "Failed to load vehicles",
        variant: "destructive",
      });
    }
  };

  const handleAddTour = () => {
    setSelectedTour(null);
    setIsModalOpen(true);
  };

  const handleEditTour = async (tour: TourData) => {
    setIsLoading(true);
    try {
      let fullTour = await tourManagementAPI.getTourById(tour.tourId);
      // If API returns an array, use the first item
      if (Array.isArray(fullTour)) {
        fullTour = fullTour[0] || tour;
      }
      console.log('Full tour loaded for edit:', fullTour);
      setSelectedTour(fullTour && fullTour.tourId ? fullTour : tour);
      setIsModalOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load full tour details',
        variant: 'destructive',
      });
      setSelectedTour(tour);
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTour = async (tourId: string) => {
    if (!confirm('Are you sure you want to delete this tour?')) return;

    try {
      await tourManagementAPI.deleteTour(tourId);
      toast({
        title: "Success",
        description: "Tour deleted successfully",
      });
      loadTours();
    } catch (error) {
      console.error('Error deleting tour:', error);
      toast({
        title: "Error",
        description: "Failed to delete tour",
        variant: "destructive",
      });
    }
  };

  const handleSubmitTour = async (tourData: TourManagementRequest) => {
    try {
      setIsSubmitting(true);
      
      if (selectedTour) {
        await tourManagementAPI.updateTour(tourData);
        toast({
          title: "Success",
          description: "Tour updated successfully",
        });
      } else {
        await tourManagementAPI.createTour(tourData);
        toast({
          title: "Success",
          description: "Tour created successfully",
        });
      }
      
      setIsModalOpen(false);
      loadTours();
    } catch (error) {
      console.error('Error saving tour:', error);
      toast({
        title: "Error",
        description: "Failed to save tour",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getMinPrice = (pricing: { [key: string]: number }) => {
    const prices = Object.values(pricing).filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tour Management</h2>
          <p className="text-gray-600">Manage tour packages with dynamic pricing for all vehicles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadTours} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleAddTour}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Tour
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tours.map((tour) => (
            <Card key={tour.id} className="group hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={tour.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop'}
                  alt={tour.tourName}
                  className="w-full h-48 object-cover rounded-t-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop';
                  }}
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={tour.isActive ? "default" : "secondary"}>
                    {tour.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-lg mb-1">{tour.tourName}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {tour.description || "No description available"}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {tour.distance} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {tour.days} day{tour.days > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatPrice(getMinPrice(tour.pricing))}
                    </div>
                    <div className="text-xs text-gray-500">Starting from</div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTour(tour)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTour(tour.tourId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tours.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tours found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first tour package</p>
            <Button onClick={handleAddTour}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Your First Tour
            </Button>
          </CardContent>
        </Card>
      )}

      <TourFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitTour}
        tour={selectedTour}
        vehicles={vehicles}
        isLoading={isSubmitting}
      />
    </div>
  );
}
