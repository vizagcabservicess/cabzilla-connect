
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Image, List, CheckCircle, XCircle, MapPin, Upload } from 'lucide-react';
import { TourData, TourManagementRequest, TourGalleryItem, TourItineraryDay } from '@/types/api';
import { Vehicle } from '@/types/vehicle';
import { useToast } from "@/components/ui/use-toast";
import { getApiUrl } from '@/config/api';

interface TourFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tourData: TourManagementRequest) => void;
  tour?: TourData | null;
  vehicles: Vehicle[];
  isLoading?: boolean;
}

export const TourFormModal = ({ isOpen, onClose, onSubmit, tour, vehicles, isLoading = false }: TourFormModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<TourManagementRequest>({
    tourId: '',
    tourName: '',
    distance: 0,
    days: 1,
    timeDuration: '',
    description: '',
    imageUrl: '',
    pricing: {},
    gallery: [],
    inclusions: [],
    exclusions: [],
    itinerary: []
  });

  // State for gallery image input
  const [galleryImageUrl, setGalleryImageUrl] = useState('');
  const [galleryImageFile, setGalleryImageFile] = useState<File | null>(null);
  const [galleryAlt, setGalleryAlt] = useState('');
  const [galleryCaption, setGalleryCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    console.log('Tour data received in modal:', tour);
    if (tour) {
      setFormData({
        tourId: tour.tourId || '',
        tourName: tour.tourName || '',
        distance: typeof tour.distance === 'number' ? tour.distance : 0,
        days: typeof tour.days === 'number' ? tour.days : 1,
        timeDuration: tour.timeDuration || '',
        description: tour.description || '',
        imageUrl: tour.imageUrl || '',
        pricing: tour.pricing || {},
        gallery: tour.gallery || [],
        inclusions: tour.inclusions || [],
        exclusions: tour.exclusions || [],
        itinerary: tour.itinerary || []
      });
    } else {
      setFormData({
        tourId: '',
        tourName: '',
        distance: 0,
        days: 1,
        timeDuration: '',
        description: '',
        imageUrl: '',
        pricing: {},
        gallery: [],
        inclusions: [],
        exclusions: [],
        itinerary: []
      });
    }
  }, [tour]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty inclusions/exclusions before submit
    const cleanedFormData = {
      ...formData,
      inclusions: (formData.inclusions || []).filter(i => i && i.trim() !== ""),
      exclusions: (formData.exclusions || []).filter(e => e && e.trim() !== ""),
      gallery: formData.gallery || [],
      itinerary: formData.itinerary || [],
    };
    console.log('Submitting formData:', cleanedFormData);
    onSubmit(cleanedFormData);
  };

  const handlePricingChange = (vehicleId: string, price: string) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [vehicleId]: parseFloat(price) || 0
      }
    }));
  };

  // Upload image file to server and get URL
  const handleFileUpload = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const baseURL = getApiUrl();
      const response = await fetch(`${baseURL}/api/upload-image.php`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data && data.url) {
        return data.url;
      }
      throw new Error(data.error || 'Image upload failed');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Add gallery item from file or URL
  const addGalleryItem = async () => {
    let url = galleryImageUrl.trim();
    let alt = galleryAlt.trim();
    let caption = galleryCaption.trim();
    
    try {
      if (galleryImageFile) {
        url = await handleFileUpload(galleryImageFile);
      }
      
      if (!url) {
        toast({
          title: "Error",
          description: "Please provide an image URL or select a file",
          variant: "destructive"
        });
        return;
      }
      
      setFormData(prev => {
        const prevGallery = Array.isArray(prev.gallery) ? prev.gallery : [];
        return {
          ...prev,
          gallery: [...prevGallery, { url, alt, caption }]
        };
      });
      
      // Clear form
      setGalleryImageUrl('');
      setGalleryImageFile(null);
      setGalleryAlt('');
      setGalleryCaption('');
      
      toast({
        title: "Success",
        description: "Image added to gallery",
      });
    } catch (error) {
      // Error handling is done in handleFileUpload
    }
  };

  const updateGalleryItem = (index: number, field: keyof TourGalleryItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery?.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ) || []
    }));
  };

  const removeGalleryItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery?.filter((_, i) => i !== index) || []
    }));
  };

  const addInclusion = () => {
    setFormData(prev => ({
      ...prev,
      inclusions: [...(prev.inclusions || []), '']
    }));
  };

  const updateInclusion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions?.map((item, i) => i === index ? value : item) || []
    }));
  };

  const removeInclusion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions?.filter((_, i) => i !== index) || []
    }));
  };

  const addExclusion = () => {
    setFormData(prev => ({
      ...prev,
      exclusions: [...(prev.exclusions || []), '']
    }));
  };

  const updateExclusion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      exclusions: prev.exclusions?.map((item, i) => i === index ? value : item) || []
    }));
  };

  const removeExclusion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      exclusions: prev.exclusions?.filter((_, i) => i !== index) || []
    }));
  };

  const addItineraryDay = () => {
    setFormData(prev => ({
      ...prev,
      itinerary: [...(prev.itinerary || []), {
        day: (prev.itinerary?.length || 0) + 1,
        title: '',
        description: '',
        activities: []
      }]
    }));
  };

  const updateItineraryDay = (index: number, field: keyof TourItineraryDay, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary?.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ) || []
    }));
  };

  const removeItineraryDay = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <Dialog key={tour?.tourId || 'new'} open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tour ? 'Edit Tour' : 'Add New Tour'}</DialogTitle>
          <DialogDescription>
            Create a new tour package with dynamic pricing for all available vehicles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="inclusions">Inclusions</TabsTrigger>
              <TabsTrigger value="exclusions">Exclusions</TabsTrigger>
              <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tourId">Tour ID</Label>
                  <Input
                    id="tourId"
                    placeholder="e.g., araku_valley"
                    value={formData.tourId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, tourId: e.target.value }))}
                    required
                    disabled={!!tour}
                  />
                </div>
                <div>
                  <Label htmlFor="tourName">Tour Name</Label>
                  <Input
                    id="tourName"
                    placeholder="e.g., Araku Valley Tour"
                    value={formData.tourName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, tourName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    value={formData.distance?.toString() || '0'}
                    onChange={(e) => setFormData(prev => ({ ...prev, distance: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="days">Duration (days)</Label>
                  <Input
                    id="days"
                    type="number"
                    value={formData.days?.toString() || '1'}
                    onChange={(e) => setFormData(prev => ({ ...prev, days: parseInt(e.target.value) || 1 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="timeDuration">Time Duration</Label>
                  <Input
                    id="timeDuration"
                    type="text"
                    placeholder="e.g. 6 hours, Full Day"
                    value={formData.timeDuration || ''}
                    onChange={e => setFormData(prev => ({ ...prev, timeDuration: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="imageUrl">Main Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="/tours/tour.jpg"
                  value={formData.imageUrl || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the tour package..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Pricing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {vehicles.map((vehicle) => (
                      <div key={vehicle.vehicle_id}>
                        <Label htmlFor={`price-${vehicle.vehicle_id}`}>{vehicle.name} (₹)</Label>
                        <Input
                          id={`price-${vehicle.vehicle_id}`}
                          type="number"
                          placeholder="0"
                          value={formData.pricing[vehicle.vehicle_id] || ''}
                          onChange={(e) => handlePricingChange(vehicle.vehicle_id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Gallery Images</h3>
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>Upload Image File</Label>
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => setGalleryImageFile(e.target.files?.[0] || null)} 
                      />
                      <div className="text-center text-gray-500">OR</div>
                      <Label>Image URL</Label>
                      <Input 
                        type="text" 
                        placeholder="https://example.com/image.jpg" 
                        value={galleryImageUrl} 
                        onChange={e => setGalleryImageUrl(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Alt Text (Optional)</Label>
                      <Input 
                        type="text" 
                        placeholder="Describe the image" 
                        value={galleryAlt} 
                        onChange={e => setGalleryAlt(e.target.value)} 
                      />
                      <Label>Caption (Optional)</Label>
                      <Input 
                        type="text" 
                        placeholder="Image caption" 
                        value={galleryCaption} 
                        onChange={e => setGalleryCaption(e.target.value)} 
                      />
                      <Button 
                        type="button" 
                        onClick={addGalleryItem} 
                        disabled={isUploading || (!galleryImageFile && !galleryImageUrl.trim())}
                        className="w-full"
                      >
                        {isUploading ? (
                          <>
                            <Upload className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Image
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {formData.gallery?.length === 0 && (
                  <div className="text-gray-500 text-center py-4">No images added yet.</div>
                )}
                {formData.gallery?.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <img
                        src={item.url}
                        alt={item.alt || `Gallery ${index + 1}`}
                        className="w-24 h-16 object-cover rounded border"
                        onError={e => (e.currentTarget.src = 'https://via.placeholder.com/96x64?text=No+Image')}
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <Label>Alt Text</Label>
                          <Input
                            value={item.alt || ''}
                            onChange={e => updateGalleryItem(index, 'alt', e.target.value)}
                            placeholder="Image description"
                          />
                        </div>
                        <div>
                          <Label>Caption</Label>
                          <Input
                            value={item.caption || ''}
                            onChange={e => updateGalleryItem(index, 'caption', e.target.value)}
                            placeholder="Image caption"
                          />
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="icon" onClick={() => removeGalleryItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="inclusions" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">What's Included</h3>
                <Button type="button" onClick={addInclusion} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Inclusion
                </Button>
              </div>
              {(formData.inclusions || []).length === 0 && (
                <div className="text-gray-500 text-center py-4">No inclusions added yet.</div>
              )}
              {formData.inclusions?.map((inclusion, index) => (
                <div key={index} className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-2 flex-shrink-0" />
                  <Input
                    placeholder="What's included in this tour..."
                    value={inclusion}
                    onChange={(e) => updateInclusion(index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeInclusion(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="exclusions" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">What's Not Included</h3>
                <Button type="button" onClick={addExclusion} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exclusion
                </Button>
              </div>
              {(formData.exclusions || []).length === 0 && (
                <div className="text-gray-500 text-center py-4">No exclusions added yet.</div>
              )}
              {formData.exclusions?.map((exclusion, index) => (
                <div key={index} className="flex gap-2">
                  <XCircle className="h-5 w-5 text-red-500 mt-2 flex-shrink-0" />
                  <Input
                    placeholder="What's not included in this tour..."
                    value={exclusion}
                    onChange={(e) => updateExclusion(index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeExclusion(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="itinerary" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Tour Itinerary</h3>
                <Button type="button" onClick={addItineraryDay} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Day
                </Button>
              </div>
              {(formData.itinerary || []).length === 0 && (
                <div className="text-gray-500 text-center py-4">No itinerary days added yet.</div>
              )}
              {formData.itinerary?.map((day, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">Day {day.day}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItineraryDay(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label>Day Title</Label>
                        <Input
                          placeholder="e.g., Arrival and Local Sightseeing"
                          value={day.title}
                          onChange={(e) => updateItineraryDay(index, 'title', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Describe what happens on this day..."
                          value={day.description}
                          onChange={(e) => updateItineraryDay(index, 'description', e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Activities (one per line)</Label>
                        <Textarea
                          placeholder="Visit temple&#10;Lunch at local restaurant&#10;Evening at beach"
                          value={day.activities.join('\n')}
                          onChange={(e) => updateItineraryDay(index, 'activities', e.target.value.split('\n').filter(a => a.trim()))}
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading ? 'Saving...' : tour ? 'Update Tour' : 'Add Tour'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
