
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  MapPin, 
  Calendar, 
  Image,
  RefreshCw,
  Copy,
  GripVertical,
} from "lucide-react";
import { cn } from '@/lib/utils';
import { TourFormModal } from "./TourFormModal";
import { tourManagementAPI, TourData } from '@/services/api/tourManagementAPI';
import { vehicleAPI } from '@/services/api/vehicleAPI';
import { Vehicle } from '@/types/vehicle';
import { TourManagementRequest } from '@/types/api';
import { startingTourPrice } from '@/lib/tourVehiclePrice';

export default function TourManagement() {
  const [tours, setTours] = useState<TourData[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<TourData | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const toursRef = useRef<TourData[]>([]);
  const { toast } = useToast();

  const tourKey = (tour: TourData) => String(tour.tourId || tour.id || '');

  useEffect(() => {
    toursRef.current = tours;
  }, [tours]);

  useEffect(() => {
    loadTours();
    loadVehicles();
  }, []);

  const loadTours = async () => {
    try {
      setIsLoading(true);
      const toursData = await tourManagementAPI.getTours();
      setTours(
        [...toursData].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
      );
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
    setFormMode('create');
    setIsModalOpen(true);
  };

  const handleEditTour = async (tour: TourData) => {
    console.log('Starting edit for tour:', tour.tourId);
    setIsLoading(true);
    try {
      // Fetch the complete tour data with all related information
      const fullTour = await tourManagementAPI.getTourById(tour.tourId);
      console.log('Full tour data received from API:', fullTour);
      
      if (fullTour) {
        // Ensure all arrays exist and are properly formatted
        const tourWithDefaults = {
          ...fullTour,
          gallery: Array.isArray(fullTour.gallery) ? fullTour.gallery : [],
          inclusions: Array.isArray(fullTour.inclusions) ? fullTour.inclusions : [],
          exclusions: Array.isArray(fullTour.exclusions) ? fullTour.exclusions : [],
          itinerary: Array.isArray(fullTour.itinerary) ? fullTour.itinerary : []
        };
        console.log('Setting tour data for modal:', tourWithDefaults);
        setSelectedTour(tourWithDefaults);
        setFormMode('edit');
      } else {
        console.log('No full tour data received, using original tour data');
        setSelectedTour(tour);
        setFormMode('edit');
      }
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error loading full tour details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load full tour details. Using basic data.',
        variant: 'destructive',
      });
      // Fallback to the basic tour data if detailed fetch fails
      setSelectedTour(tour);
      setFormMode('edit');
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const nextCloneTourId = (sourceId: string): string => {
    const base = String(sourceId || 'tour').replace(/_copy(?:_\d+)?$/i, '');
    const used = new Set(tours.map((item) => String(item.tourId || '').toLowerCase()));
    let candidate = `${base}_copy`;
    let n = 2;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${base}_copy_${n}`;
      n += 1;
    }
    return candidate;
  };

  const handleCloneTour = async (tour: TourData) => {
    setIsLoading(true);
    try {
      const fullTour = await tourManagementAPI.getTourById(String(tour.tourId || tour.id || ''));
      const source = fullTour || tour;
      const clonedId = nextCloneTourId(String(source.tourId || 'tour'));
      const sourceName = String(source.tourName || source.name || 'Tour').trim();
      setSelectedTour({
        ...source,
        id: '',
        tourId: clonedId,
        tourName: /copy/i.test(sourceName) ? sourceName : `${sourceName} (Copy)`,
        isActive: true,
      });
      setFormMode('clone');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error cloning tour:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tour details for clone.',
        variant: 'destructive',
      });
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
      
      if (formMode === 'edit') {
        await tourManagementAPI.updateTour(tourData);
        toast({
          title: "Success",
          description: "Tour updated successfully",
        });
      } else {
        await tourManagementAPI.createTour(tourData);
        toast({
          title: "Success",
          description: formMode === 'clone' ? "Tour cloned successfully" : "Tour created successfully",
        });
      }
      
      setIsModalOpen(false);
      setSelectedTour(null); // Reset selected tour
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

  const persistTourOrder = async (ordered: TourData[]) => {
    const tourIds = ordered.map(tourKey).filter(Boolean);
    if (tourIds.length === 0) return;
    setSavingOrder(true);
    try {
      await tourManagementAPI.reorderTours(tourIds);
      setTours(ordered.map((tour, index) => ({ ...tour, sortOrder: index + 1 })));
      toast({
        title: 'Order saved',
        description: 'This is the order guests will see on the website.',
      });
    } catch (error) {
      console.error('Error saving tour order:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tour order',
        variant: 'destructive',
      });
      loadTours();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragStart = (tourId: string) => {
    setDraggingId(tourId);
  };

  const handleDragOver = (overId: string) => {
    if (!draggingId || draggingId === overId) return;
    setTours((current) => {
      const from = current.findIndex((tour) => tourKey(tour) === draggingId);
      const to = current.findIndex((tour) => tourKey(tour) === overId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleDragEnd = () => {
    if (!draggingId) return;
    setDraggingId(null);
    void persistTourOrder(toursRef.current);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTour(null);
    setFormMode('create');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getMinPrice = (pricing: { [key: string]: number }) => {
    return startingTourPrice(pricing, vehicles);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tour Management</h2>
          <p className="text-gray-600">
            Manage tour packages with dynamic pricing for all vehicles. Drag cards to set which tour appears first.
            {savingOrder ? ' Saving order…' : ''}
          </p>
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
          {tours.map((tour, index) => (
            <Card
              key={tourKey(tour) || tour.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', tourKey(tour));
                handleDragStart(tourKey(tour));
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                handleDragOver(tourKey(tour));
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDragOver(tourKey(tour));
              }}
              onDragEnd={handleDragEnd}
              className={cn(
                'group cursor-grab hover:shadow-lg transition-shadow active:cursor-grabbing',
                draggingId === tourKey(tour) && 'opacity-60 ring-2 ring-blue-400'
              )}
            >
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
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-xs font-bold text-slate-800 shadow">
                    {index + 1}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow">
                    <GripVertical className="h-4 w-4" />
                  </span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={tour.isActive !== false ? "default" : "secondary"}>
                    {tour.isActive !== false ? "Active" : "Inactive"}
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
                  
                  <div
                    className="flex gap-1"
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    draggable={false}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTour(tour)}
                      disabled={isLoading}
                      title="Edit tour"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCloneTour(tour)}
                      disabled={isLoading}
                      title="Clone tour"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTour(tour.tourId)}
                      title="Delete tour"
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
        onClose={handleCloseModal}
        onSubmit={handleSubmitTour}
        tour={selectedTour}
        lockTourId={formMode === 'edit'}
        formTitle={formMode === 'edit' ? 'Edit Tour' : formMode === 'clone' ? 'Clone Tour' : 'Add New Tour'}
        vehicles={vehicles}
        isLoading={isSubmitting}
      />
    </div>
  );
}
