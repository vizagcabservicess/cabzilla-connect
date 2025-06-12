
import { useState } from 'react';
import { TourGalleryImage } from '@/types/tour';

interface TourGalleryProps {
  gallery: TourGalleryImage[];
  tourName: string;
  imageUrl?: string;
}

export const TourGallery = ({ gallery, tourName, imageUrl }: TourGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<string>(() => {
    if (gallery && gallery.length > 0) {
      return gallery[0].url;
    }
    return imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop';
  });

  const displayImages = gallery && gallery.length > 0 ? gallery : [
    {
      id: '1',
      url: imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      alt: tourName,
      caption: ''
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="col-span-3">
        <img
          src={selectedImage}
          alt={tourName}
          className="w-full h-64 md:h-80 object-cover rounded-l-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop';
          }}
        />
      </div>
      <div className="space-y-2">
        {displayImages.slice(0, 3).map((image, idx) => (
          <img
            key={image.id || idx}
            src={image.url}
            alt={image.alt || tourName}
            className={`w-full h-20 md:h-[104px] object-cover cursor-pointer rounded ${
              selectedImage === image.url ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedImage(image.url)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop';
            }}
          />
        ))}
      </div>
    </div>
  );
};
