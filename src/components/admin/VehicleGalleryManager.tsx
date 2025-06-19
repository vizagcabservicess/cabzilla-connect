
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Upload, Link, Loader2, Image as ImageIcon } from 'lucide-react';
import { vehicleGalleryAPI, VehicleGalleryImage } from '@/services/api/vehicleGalleryAPI';
import { toast } from 'sonner';

interface VehicleGalleryManagerProps {
  vehicleId: string;
  onGalleryUpdate?: (images: VehicleGalleryImage[]) => void;
}

export const VehicleGalleryManager: React.FC<VehicleGalleryManagerProps> = ({ 
  vehicleId, 
  onGalleryUpdate 
}) => {
  const [images, setImages] = useState<VehicleGalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (vehicleId) {
      loadGallery();
    }
  }, [vehicleId]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const galleryImages = await vehicleGalleryAPI.getVehicleGallery(vehicleId);
      setImages(galleryImages);
      onGalleryUpdate?.(galleryImages);
    } catch (error) {
      console.error('Error loading gallery:', error);
      toast.error('Failed to load gallery images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const uploadedUrl = await vehicleGalleryAPI.uploadImage(file);
      
      if (uploadedUrl) {
        const newImage = await vehicleGalleryAPI.addGalleryImage({
          vehicle_id: vehicleId,
          url: uploadedUrl,
          alt_text: altText || file.name,
          caption: caption
        });

        if (newImage) {
          const updatedImages = [...images, newImage];
          setImages(updatedImages);
          onGalleryUpdate?.(updatedImages);
          setAltText('');
          setCaption('');
          toast.success('Image uploaded successfully');
        } else {
          toast.error('Failed to save image to gallery');
        }
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleUrlAdd = async () => {
    if (!imageUrl.trim()) {
      toast.error('Please enter an image URL');
      return;
    }

    try {
      setUploading(true);
      const newImage = await vehicleGalleryAPI.addGalleryImage({
        vehicle_id: vehicleId,
        url: imageUrl,
        alt_text: altText,
        caption: caption
      });

      if (newImage) {
        const updatedImages = [...images, newImage];
        setImages(updatedImages);
        onGalleryUpdate?.(updatedImages);
        setImageUrl('');
        setAltText('');
        setCaption('');
        toast.success('Image added successfully');
      } else {
        toast.error('Failed to add image to gallery');
      }
    } catch (error) {
      console.error('Error adding image:', error);
      toast.error('Failed to add image');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const success = await vehicleGalleryAPI.deleteGalleryImage(imageId);
      
      if (success) {
        const updatedImages = images.filter(img => img.id !== imageId);
        setImages(updatedImages);
        onGalleryUpdate?.(updatedImages);
        toast.success('Image deleted successfully');
      } else {
        toast.error('Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading gallery...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Vehicle Gallery</Label>
      
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="url">Image URL</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageFile">Choose Image File</Label>
            <Input
              id="imageFile"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="url" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={uploading}
            />
          </div>
          <Button 
            onClick={handleUrlAdd} 
            disabled={uploading || !imageUrl.trim()}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                Add Image
              </>
            )}
          </Button>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="altText">Alt Text (Optional)</Label>
          <Input
            id="altText"
            placeholder="Describe the image"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            disabled={uploading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="caption">Caption (Optional)</Label>
          <Input
            id="caption"
            placeholder="Image caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={uploading}
          />
        </div>
      </div>

      {images.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No images added yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <img
                src={image.url}
                alt={image.alt_text || 'Vehicle image'}
                className="w-full h-20 object-cover rounded border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=80&fit=crop';
                }}
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => image.id && handleDeleteImage(image.id)}
              >
                <X className="h-3 w-3" />
              </Button>
              {image.caption && (
                <p className="text-xs text-gray-600 mt-1 truncate">{image.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
