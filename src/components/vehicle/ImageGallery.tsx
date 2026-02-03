import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryItem } from '@/types/cab';
import { getOptimizedImageUrl } from '@/utils/imageOptimization';

interface ImageGalleryProps {
  images: GalleryItem[];
  vehicleName: string;
  /** Hero image shown immediately (e.g. from vehicle data) while gallery loads */
  heroImage?: string;
}

const fallbackImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop';

export const ImageGallery = ({ images, vehicleName, heroImage }: ImageGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  
  // Use gallery images if available; else use hero image; else fallbacks
  const displayImages: GalleryItem[] =
    images && images.length > 0
      ? images
      : heroImage
        ? [{ url: heroImage, alt: vehicleName }]
        : [
            { url: fallbackImage, alt: 'Fallback image 1' },
            { url: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=800&h=600&fit=crop', alt: 'Fallback image 2' },
            { url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop', alt: 'Fallback image 3' },
            { url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop', alt: 'Fallback image 4' },
            { url: 'https://images.unsplash.com/photo-1570294917816-eceb74fccfa9?w=800&h=600&fit=crop', alt: 'Fallback image 5' }
          ];

  const hasMultipleImages = displayImages.length > 1;

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <div className="space-y-4">
      {/* Main Image - explicit dimensions to prevent CLS, aspect-ratio reserved */}
      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: '16/10' }}
      >
        <img
          src={getOptimizedImageUrl(displayImages[selectedImageIndex].url)}
          alt={displayImages[selectedImageIndex].alt || vehicleName}
          width={800}
          height={500}
          className="w-full h-full object-cover rounded-lg"
          loading="eager"
          fetchPriority="high"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const originalUrl = displayImages[selectedImageIndex].url;
            if (target.src !== originalUrl) {
              target.src = originalUrl;
            } else {
              target.src = fallbackImage;
            }
          }}
        />

        {/* Carousel UI only when multiple images */}
        {hasMultipleImages && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {selectedImageIndex + 1} / {displayImages.length}
            </div>
          </>
        )}

        {displayImages[selectedImageIndex].caption && (
          <div className="absolute bottom-4 left-4 right-16 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
            {displayImages[selectedImageIndex].caption}
          </div>
        )}
      </div>

      {/* Thumbnails only when multiple images */}
      {hasMultipleImages && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((img, idx) => (
            <img
              key={idx}
              src={getOptimizedImageUrl(img.url)}
              alt={img.alt || `${vehicleName} view ${idx + 1}`}
              width={96}
              height={96}
              loading="lazy"
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
      )}
    </div>
  );
};

export default ImageGallery;
