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
    <div className="grid grid-cols-4 gap-2">
      <div className="col-span-3">
        <img
          src={selectedImage}
          alt={vehicleName}
          className="w-full h-64 md:h-80 object-cover rounded-l-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = fallbackImage;
          }}
        />
      </div>
      <div className="space-y-2">
        {displayImages.slice(0, 4).map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={vehicleName}
            className={`w-full h-20 md:h-[104px] object-cover cursor-pointer rounded ${selectedImage === img ? 'ring-2 ring-blue-500' : ''}`}
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