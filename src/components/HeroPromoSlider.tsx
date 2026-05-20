import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { cn } from '@/lib/utils';
import 'swiper/css';

const PROMO_SLIDES = [
  {
    id: 'urbania',
    label: 'Urbania now available!',
    to: '/vehicle/urbania',
    ariaLabel: 'Urbania van now available',
  },
  {
    id: 'carpool',
    label: 'Car pooling now available',
    to: '/shared-carpooling',
    ariaLabel: 'Shared car pooling now available',
  },
] as const;

type HeroPromoSliderProps = {
  className?: string;
  /** Hide Urbania slide on `/vehicle/urbania` embeds. */
  hideUrbaniaPromo?: boolean;
  /** `compact` = desktop tab row; `default` = mobile Hero strip. */
  size?: 'compact' | 'default';
};

export function HeroPromoSlider({
  className,
  hideUrbaniaPromo = false,
  size = 'default',
}: HeroPromoSliderProps) {
  const slides = useMemo(
    () => PROMO_SLIDES.filter((s) => !(s.id === 'urbania' && hideUrbaniaPromo)),
    [hideUrbaniaPromo],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiper, setSwiper] = useState<SwiperType | null>(null);

  if (slides.length === 0) return null;

  const compact = size === 'compact';
  const slide = slides[activeIndex] ?? slides[0];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 shadow-sm',
        compact ? 'max-w-[min(100%,20rem)] flex-shrink-0 px-3 py-1.5' : 'px-3 py-2.5 sm:px-4 sm:py-3',
        className,
      )}
      role="region"
      aria-label="Promotional offers"
      aria-live="polite"
    >
      <Swiper
        autoHeight
        slidesPerView={1}
        spaceBetween={0}
        allowTouchMove={slides.length > 1}
        grabCursor={slides.length > 1}
        speed={280}
        onSwiper={setSwiper}
        onSlideChange={(instance) => setActiveIndex(instance.activeIndex)}
        className="hero-promo-swiper w-full"
      >
        {slides.map((item) => (
          <SwiperSlide key={item.id} aria-label={item.ariaLabel}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <span
                  className={cn(
                    'shrink-0 rounded-md bg-white/95 font-extrabold uppercase tracking-wide text-blue-700',
                    compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px] sm:text-[11px]',
                  )}
                >
                  New
                </span>
                <p
                  className={cn(
                    'truncate font-semibold text-white',
                    compact ? 'text-xs' : 'text-[13px] leading-tight sm:text-sm md:text-base',
                  )}
                >
                  {item.label}
                </p>
              </div>
              <Link
                to={item.to}
                className={cn(
                  'shrink-0 rounded-lg bg-white font-bold text-blue-600 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-700',
                  compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs sm:px-4 sm:py-2',
                )}
              >
                Book →
              </Link>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {slides.length > 1 && (
        <div className="mt-1.5 flex justify-center gap-1" role="tablist" aria-label="Promo slides">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Show ${s.label}`}
              onClick={() => swiper?.slideTo(i)}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                i === activeIndex ? 'w-3 bg-white/90' : 'w-1 bg-white/40 hover:bg-white/60',
              )}
            />
          ))}
        </div>
      )}

      <span className="sr-only">{slide.ariaLabel}</span>
    </div>
  );
}
