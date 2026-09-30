import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { resolveSmartBudgetMediaUrl } from '@/lib/smartBudgetUpload';
import { TourGalleryImage } from '@/types/tour';
import { cn } from '@/lib/utils';

interface TourGalleryProps {
  gallery: TourGalleryImage[];
  tourName: string;
  imageUrl?: string;
  overlay?: ReactNode;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop';

function imageKey(url: string): string {
  return url.trim().split('?')[0].replace(/\/+$/, '').toLowerCase();
}

export const TourGallery = ({ gallery, tourName, imageUrl, overlay }: TourGalleryProps) => {
  const displayImages = useMemo(() => {
    const items: TourGalleryImage[] = [];
    const seen = new Set<string>();
    const add = (item: Pick<TourGalleryImage, 'url' | 'alt' | 'caption'> & { id?: string }) => {
      const url = String(item.url || '').trim();
      const key = imageKey(url);
      if (!url || seen.has(key)) return;
      seen.add(key);
      items.push({
        id: item.id || key,
        url,
        alt: item.alt || tourName,
        caption: item.caption || '',
      });
    };

    if (imageUrl?.trim()) {
      add({ id: 'main-banner', url: imageUrl, alt: tourName });
    }
    for (const item of gallery || []) {
      add(item);
    }
    if (items.length === 0) {
      add({ id: 'fallback', url: FALLBACK_IMAGE, alt: tourName });
    }
    return items;
  }, [gallery, imageUrl, tourName]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartXRef = useRef(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [displayImages]);

  const selected = displayImages[Math.min(selectedIndex, displayImages.length - 1)] || displayImages[0];
  const src = (url: string) => resolveSmartBudgetMediaUrl(url) || FALLBACK_IMAGE;
  const canPrev = selectedIndex > 0;
  const canNext = selectedIndex < displayImages.length - 1;

  return (
    <>
      <div className="flex w-full flex-col overflow-hidden md:aspect-[2/1] md:min-h-[260px] md:max-h-[420px] md:grid md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2 md:gap-1">
        <div
          className="relative h-[50vh] min-h-[280px] overflow-hidden bg-slate-200 touch-pan-y md:col-span-1 md:row-span-2 md:h-full md:min-h-[200px]"
          onTouchStart={(event) => {
            touchStartXRef.current = event.touches[0]?.clientX ?? 0;
          }}
          onTouchEnd={(event) => {
            if (displayImages.length <= 1) return;
            const endX = event.changedTouches[0]?.clientX ?? 0;
            const diff = touchStartXRef.current - endX;
            if (diff > 50) {
              setSelectedIndex((index) => Math.min(displayImages.length - 1, index + 1));
            } else if (diff < -50) {
              setSelectedIndex((index) => Math.max(0, index - 1));
            }
          }}
        >
          {overlay}
          <img
            key={selected?.id || selectedIndex}
            src={src(selected?.url || FALLBACK_IMAGE)}
            alt={selected?.alt || tourName}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
          {displayImages.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => setSelectedIndex((index) => Math.max(0, index - 1))}
                className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 md:flex"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => setSelectedIndex((index) => Math.min(displayImages.length - 1, index + 1))}
                className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 md:flex"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-2 hidden rounded bg-black/60 px-2 py-1 text-xs font-medium text-white md:block">
                {selectedIndex + 1} / {displayImages.length}
              </div>
              <div className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 md:hidden">
                {displayImages.map((image, index) => (
                  <button
                    key={image.id || index}
                    type="button"
                    aria-label={`View image ${index + 1}`}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      'h-2.5 w-2.5 rounded-full drop-shadow-sm transition-colors',
                      selectedIndex === index ? 'bg-white' : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        {[0, 1, 2, 3].map((slot) => {
          const image = displayImages[slot % displayImages.length];
          const isViewAll = slot === 3 && displayImages.length > 1;
          const selectedSlot = selectedIndex === Math.min(slot, displayImages.length - 1);
          return (
            <button
              key={`tile-${slot}`}
              type="button"
              onClick={() => {
                if (isViewAll) {
                  setLightboxOpen(true);
                  return;
                }
                setSelectedIndex(Math.min(slot, displayImages.length - 1));
              }}
              className={cn(
                'group relative hidden h-full min-h-0 w-full overflow-hidden rounded md:block',
                selectedSlot && !isViewAll ? 'ring-2 ring-blue-500' : ''
              )}
            >
              {image ? (
                <img
                  src={src(image.url)}
                  alt={image.alt || tourName}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
              ) : (
                <div className="h-full w-full bg-slate-200" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {isViewAll ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
                  <Camera className="h-5 w-5 text-white" />
                  <span className="text-xs font-medium text-white">View All Images</span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-h-[75vh] w-[90vw] max-w-2xl gap-0 overflow-hidden border-0 bg-black/95 p-0 [&>button]:right-3 [&>button]:top-3 [&>button]:text-white [&>button]:hover:bg-white/20"
          showClose
        >
          <div className="flex h-full flex-col">
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
              <img
                src={src(selected?.url || FALLBACK_IMAGE)}
                alt={selected?.alt || tourName}
                className="h-auto max-h-[55vh] w-auto max-w-full object-contain"
              />
              {displayImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    disabled={!canPrev}
                    onClick={() => setSelectedIndex((index) => Math.max(0, index - 1))}
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    disabled={!canNext}
                    onClick={() => setSelectedIndex((index) => Math.min(displayImages.length - 1, index + 1))}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              ) : null}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                {selectedIndex + 1} / {displayImages.length}
              </div>
            </div>
            {displayImages.length > 1 ? (
              <div className="flex justify-center gap-2 overflow-x-auto border-t border-white/10 p-3">
                {displayImages.map((image, index) => (
                  <button
                    key={image.id || index}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      'h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors',
                      selectedIndex === index
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-transparent hover:border-white/50'
                    )}
                  >
                    <img src={src(image.url)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
