import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { ArrowRight } from 'lucide-react';
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
  /** `compact` = desktop tab row; `default` = classic mobile Hero strip. */
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
        'relative flex-shrink-0 overflow-hidden',
        compact
          ? 'premium-promo-pill max-w-[min(100%,18rem)]'
          : 'w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2.5 shadow-sm sm:px-4 sm:py-3',
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
            {compact ? (
              <div className="flex items-center gap-2.5">
                <span className="premium-promo-new shrink-0">NEW</span>
                <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#0047AB]">
                  {item.label}
                </p>
                <span className="shrink-0 text-blue-300" aria-hidden>
                  |
                </span>
                <Link
                  to={item.to}
                  className="premium-promo-cta inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-[#0066FF] transition-opacity hover:opacity-90"
                >
                  Book Now
                  <ArrowRight className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  <span className="shrink-0 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-blue-700 sm:text-[11px]">
                    New
                  </span>
                  <p className="truncate text-[13px] font-semibold leading-tight text-white sm:text-sm md:text-base">
                    {item.label}
                  </p>
                </div>
                <Link
                  to={item.to}
                  className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-blue-600 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-700 sm:px-4 sm:py-2"
                >
                  Book →
                </Link>
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>

      {slides.length > 1 && (
        <div
          className={cn('flex justify-center gap-1', compact ? 'mt-1' : 'mt-1.5')}
          role="tablist"
          aria-label="Promo slides"
        >
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Show ${s.label}`}
              onClick={() => swiper?.slideTo(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                compact
                  ? cn(
                      'h-0.5',
                      i === activeIndex ? 'w-2.5 bg-[#0066FF]/90' : 'w-1 bg-[#0066FF]/30 hover:bg-[#0066FF]/45',
                    )
                  : cn(
                      'h-1',
                      i === activeIndex ? 'w-3 bg-white/90' : 'w-1 bg-white/40 hover:bg-white/60',
                    ),
              )}
            />
          ))}
        </div>
      )}

      <span className="sr-only">{slide.ariaLabel}</span>
    </div>
  );
}
