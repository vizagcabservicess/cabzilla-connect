
import { useState } from 'react';

interface ImageGalleryProps {
  images: string[];
  vehicleName: string;
}

const fallbackImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop';

export const ImageGallery = ({ images, vehicleName }: ImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<string>(images && images.length > 0 ? images[0] : fallbackImage);

  const displayImages = images && images.length > 0 ? images : [fallbackImage];

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="w-full">
        <img
          src={selectedImage}
          alt={vehicleName}
          className="w-full h-80 md:h-96 object-cover rounded-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = fallbackImage;
          }}
        />
      </div>
      
      {/* Vertical Thumbnails at Bottom */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {displayImages.slice(0, 6).map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`${vehicleName} view ${idx + 1}`}
            className={`w-20 h-20 md:w-24 md:h-24 object-cover cursor-pointer rounded flex-shrink-0 ${
              selectedImage === img ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-gray-300'
            }`}
            onClick={() => setSelectedImage(img)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = fallbackImage;
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;
