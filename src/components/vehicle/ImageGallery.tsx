import React, { useState } from 'react';
import { GalleryItem } from '@/types/cab';
import { getOptimizedImageUrl } from '@/utils/imageOptimization';

interface ImageGalleryProps {
  images: GalleryItem[];
  vehicleName: string;
  heroImage?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  vehicleName,
  heroImage,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const hasGalleryImages = images && images.length > 0;
  const mainImageUrl =
    (hasGalleryImages && images[selectedIndex]?.url) || heroImage;
  const altText = hasGalleryImages
    ? images[selectedIndex]?.alt || `${vehicleName} - Professional taxi service in Visakhapatnam`
    : `${vehicleName} - Professional taxi service in Visakhapatnam`;

  return (
    <div className="w-full overflow-hidden rounded-lg">
      {mainImageUrl ? (
        <>
          <div className="w-full overflow-hidden rounded-lg" style={{ aspectRatio: '16/10' }}>
            <img
              src={getOptimizedImageUrl(mainImageUrl)}
              alt={altText}
              width={800}
              height={500}
              className="w-full h-full object-cover rounded-lg"
              loading="eager"
              fetchPriority="high"
            />
          </div>
          {hasGalleryImages && images.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 ${
                    selectedIndex === idx ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={getOptimizedImageUrl(img.url)}
                    alt={img.alt || ''}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div
          className="w-full h-full rounded-lg animate-pulse bg-gray-200"
          style={{ aspectRatio: '16/10' }}
        />
      )}
    </div>
  );
};

export default ImageGallery;
