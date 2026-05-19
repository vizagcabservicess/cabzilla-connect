import React, { useEffect, useMemo, useState } from 'react';
import { GalleryItem } from '@/types/cab';
import { getOptimizedImageUrl } from '@/utils/imageOptimization';

interface ImageGalleryProps {
  images: GalleryItem[];
  vehicleName: string;
  heroImage?: string;
}

function uniqueNonEmptyUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = raw?.trim();
    if (!u) continue;
    const opt = getOptimizedImageUrl(u);
    if (!opt || seen.has(opt)) continue;
    seen.add(opt);
    out.push(opt);
  }
  return out;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  vehicleName,
  heroImage,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [srcAttempt, setSrcAttempt] = useState(0);

  const validImages = useMemo(
    () => (images ?? []).filter((g) => typeof g?.url === 'string' && g.url.trim().length > 0),
    [images]
  );

  const hasGalleryImages = validImages.length > 0;

  const safeIndex = hasGalleryImages ? Math.min(selectedIndex, validImages.length - 1) : 0;

  const galleryPrimaryRaw = hasGalleryImages ? validImages[safeIndex]?.url?.trim() ?? '' : '';

  const resolvedMainRaw = (galleryPrimaryRaw || heroImage?.trim() || '').trim();

  const candidateUrls = useMemo(() => {
    const raw: string[] = [];
    if (resolvedMainRaw) raw.push(resolvedMainRaw);
    const hero = heroImage?.trim();
    if (hero && hero !== resolvedMainRaw) raw.push(hero);
    for (const g of validImages) {
      const u = g.url.trim();
      if (u) raw.push(u);
    }
    return uniqueNonEmptyUrls(raw);
  }, [resolvedMainRaw, heroImage, validImages]);

  useEffect(() => {
    if (selectedIndex > 0 && selectedIndex >= validImages.length) {
      setSelectedIndex(0);
    }
  }, [selectedIndex, validImages.length]);

  useEffect(() => {
    setSrcAttempt(0);
  }, [candidateUrls]);

  const displayMainSrc =
    candidateUrls.length > 0 && srcAttempt < candidateUrls.length
      ? candidateUrls[srcAttempt]
      : '';

  const altText = hasGalleryImages
    ? validImages[safeIndex]?.alt || `${vehicleName} - Professional taxi service in Visakhapatnam`
    : `${vehicleName} - Professional taxi service in Visakhapatnam`;

  const handleMainImageError = () => {
    setSrcAttempt((i) => {
      if (i + 1 < candidateUrls.length) return i + 1;
      return candidateUrls.length;
    });
  };

  return (
    <div className="w-full overflow-hidden rounded-lg">
      {displayMainSrc ? (
        <>
          <div className="w-full overflow-hidden rounded-lg" style={{ aspectRatio: '16/10' }}>
            <img
              key={`${displayMainSrc}-${srcAttempt}`}
              src={displayMainSrc}
              alt={altText}
              width={800}
              height={500}
              className="h-full w-full rounded-lg object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={handleMainImageError}
            />
          </div>
          {hasGalleryImages && validImages.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {validImages.map((img, idx) => (
                <button
                  key={`${img.url}-${idx}`}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded border-2 ${
                    safeIndex === idx ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={getOptimizedImageUrl(img.url)}
                    alt={img.alt || ''}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div
          className="h-full w-full animate-pulse rounded-lg bg-gray-200"
          style={{ aspectRatio: '16/10' }}
        />
      )}
    </div>
  );
};

export default ImageGallery;
