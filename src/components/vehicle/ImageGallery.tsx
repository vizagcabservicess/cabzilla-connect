
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  vehicleName: string;
}

const fallbackImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop';

export const ImageGallery = ({ images, vehicleName }: ImageGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  
  const displayImages = images && images.length > 0 ? images : [
    fallbackImage,
    'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1570294917816-eceb74fccfa9?w=800&h=600&fit=crop'
  ];

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <div className="space-y-4">
      {/* Main Image Slider */}
      <div className="relative w-full">
        <img
          src={displayImages[selectedImageIndex]}
          alt={vehicleName}
          className="w-full h-80 md:h-96 object-cover rounded-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = fallbackImage;
          }}
        />
        
        {/* Navigation Arrows */}
        <button
          onClick={prevImage}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={nextImage}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        
        {/* Image Counter */}
        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {selectedImageIndex + 1} / {displayImages.length}
        </div>
      </div>
      
      {/* Vertical Thumbnails at Bottom */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {displayImages.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`${vehicleName} view ${idx + 1}`}
            className={`w-20 h-20 md:w-24 md:h-24 object-cover cursor-pointer rounded flex-shrink-0 transition-all ${
              selectedImageIndex === idx 
                ? 'ring-2 ring-blue-500 opacity-100' 
                : 'hover:ring-1 hover:ring-gray-300 opacity-70 hover:opacity-100'
            }`}
            onClick={() => setSelectedImageIndex(idx)}
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
