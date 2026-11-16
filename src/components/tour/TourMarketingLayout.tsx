import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Home, MapPin, Phone, Play, Route, Star, X } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { DateTimePicker } from '@/components/DateTimePicker';
import { LocationInput } from '@/components/LocationInput';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { CabType } from '@/types/cab';
import type { Location } from '@/lib/locationData';
import type { TourDetail, TourListItem } from '@/types/tour';
import { tourPriceForVehicle } from '@/lib/tourVehiclePrice';
import { isVehicleAvailableForDateRange } from '@/utils/vehicleAvailability';
import { getVehicleData } from '@/services/vehicleDataService';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import { getTourUrl } from '@/utils/tourUrlUtils';
import { responsiveUploadImage, showOriginalOnImageError, sizedUploadImage } from '@/lib/responsiveImage';
import { resolveSmartBudgetMediaUrl } from '@/lib/smartBudgetUpload';
import {
  SHARED_TOUR_TESTIMONIAL_VIDEOS,
  TOUR_TESTIMONIALS_YOUTUBE_URL,
  type TourMarketingContent,
  type TourMarketingVideo,
} from '@/components/tour/tourMarketingContent';
import { tourTestimonialVideosAPI } from '@/services/api/tourTestimonialVideosAPI';

type PricedVehicle = CabType & { price: number };

function isDayHeading(time: string | undefined): boolean {
  return Boolean(time && /^day\s+\d+/i.test(time.trim()));
}

/** Keep each "Day N" block intact. One-day tours stay a single list. */
function groupStopsByDay(stops: TourMarketingContent['stops']): TourMarketingContent['stops'][] {
  const groups: TourMarketingContent['stops'][] = [];
  for (const stop of stops) {
    if (groups.length === 0 || isDayHeading(stop.time)) groups.push([stop]);
    else groups[groups.length - 1].push(stop);
  }
  return groups;
}

export interface TourMarketingLayoutProps {
  tour: TourDetail;
  content: TourMarketingContent;
  pickup: Location;
  pickupDate: Date;
  selectedVehicle: PricedVehicle | null;
  onPickupChange: (location: Location) => void;
  onDateChange: (date: Date) => void;
  onVehicleSelect: (vehicle: PricedVehicle) => void;
  tripMode: 'one-way' | 'round-trip';
  onTripModeChange: (mode: 'one-way' | 'round-trip') => void;
  onBook: () => void;
}

const GROUPS: Array<{ id: string; name: string; test: RegExp; sub: string }> = [
  { id: 'sedan', name: 'Sedan / Hatchback', test: /dzire|aura|glanza|amaze|etios|sedan|hatch/i, sub: 'Dzire, Aura or Glanza' },
  { id: 'ertiga', name: 'Ertiga', test: /ertiga/i, sub: '6 seats' },
  { id: 'innova', name: 'Innova Crysta', test: /innova|crysta/i, sub: '7 seats' },
  { id: 'urbania', name: 'Force Urbania', test: /urbania/i, sub: '16 seats' },
  { id: 'tempo', name: 'Tempo Traveller', test: /tempo/i, sub: '12 to 17 seats' },
];

function rupee(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Last calendar day the cab is out, inclusive. A 3-day tour starting the 25th uses the 25th, 26th and 27th. */
function tourStayEnd(start: Date, days: number): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(0, Math.floor(days) - 1));
  return end;
}

export function TourMarketingLayout({
  tour,
  content,
  pickup,
  pickupDate,
  selectedVehicle,
  onPickupChange,
  onDateChange,
  onVehicleSelect,
  tripMode,
  onTripModeChange,
  onBook,
}: TourMarketingLayoutProps) {
  const [offers, setOffers] = useState<PricedVehicle[]>([]);
  const [fleetReady, setFleetReady] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [testimonialVideos, setTestimonialVideos] = useState<TourMarketingVideo[]>(
    SHARED_TOUR_TESTIMONIAL_VIDEOS,
  );
  const [videoCanScrollLeft, setVideoCanScrollLeft] = useState(false);
  const [videoCanScrollRight, setVideoCanScrollRight] = useState(false);
  const photoTouchX = useRef(0);
  const videoScrollerRef = useRef<HTMLDivElement>(null);
  const [moreTours, setMoreTours] = useState<TourListItem[]>([]);
  /** Apply each tour’s default hour once per slug (session often keeps another tour’s 4/5/7 AM). */
  const appliedPickupHourKey = useRef<string | null>(null);
  const bookingCardRef = useRef<HTMLDivElement>(null);
  const [bookingInView, setBookingInView] = useState(true);
  const pickupHour = content.defaultPickupHour;
  const stops = content.stops;
  const dayGroups = groupStopsByDay(stops);
  const multiDay = dayGroups.length > 1;
  const twoDayColumns = dayGroups.length === 2;
  const stopMid = Math.ceil(stops.length / 2);
  const stopColumns = multiDay
    ? dayGroups
    : [stops.slice(0, stopMid), stops.slice(stopMid)].filter((column) => column.length > 0);

  useEffect(() => {
    setPlayingVideoId(null);
  }, [content.slug, tour.tourId]);

  useEffect(() => {
    let cancelled = false;
    const slug = content.slug;
    tourTestimonialVideosAPI
      .listPublic(slug)
      .then((rows) => {
        if (cancelled) return;
        const matched = rows.filter(
          (row) => !row.tourTags?.length || row.tourTags.includes(slug),
        );
        setTestimonialVideos(
          matched.map((row) => ({
            id: row.youtubeId,
            quote: row.quote,
            name: row.name,
            tourLabel: row.tourLabel,
            duration: row.duration,
            posterUrl: row.posterUrl,
            youtubeUrl: row.youtubeUrl,
          })),
        );
      })
      .catch(() => {
        /* keep SHARED_TOUR_TESTIMONIAL_VIDEOS fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [content.slug]);

  useEffect(() => {
    const node = videoScrollerRef.current;
    if (!node) return;
    const syncScrollEdges = () => {
      const max = node.scrollWidth - node.clientWidth;
      setVideoCanScrollLeft(node.scrollLeft > 2);
      setVideoCanScrollRight(max > 2 && node.scrollLeft < max - 2);
    };
    syncScrollEdges();
    node.addEventListener('scroll', syncScrollEdges, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncScrollEdges) : null;
    ro?.observe(node);
    window.addEventListener('resize', syncScrollEdges);
    return () => {
      node.removeEventListener('scroll', syncScrollEdges);
      ro?.disconnect();
      window.removeEventListener('resize', syncScrollEdges);
    };
  }, [testimonialVideos]);

  useEffect(() => {
    const key = `${content.slug}:${pickupHour}`;
    if (appliedPickupHourKey.current === key) return;
    appliedPickupHourKey.current = key;

    const now = new Date();
    const next = new Date(pickupDate);
    next.setHours(pickupHour, 0, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
      next.setHours(pickupHour, 0, 0, 0);
    }
    if (
      next.getHours() === pickupDate.getHours() &&
      next.getMinutes() === pickupDate.getMinutes() &&
      next.getDate() === pickupDate.getDate() &&
      next.getMonth() === pickupDate.getMonth() &&
      next.getFullYear() === pickupDate.getFullYear()
    ) {
      return;
    }
    onDateChange(next);
    // Only re-run when the tour (or its default hour) changes — not on every date edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional once-per-slug default
  }, [content.slug, pickupHour, onDateChange]);

  useEffect(() => {
    let cancelled = false;
    tourDetailAPI
      .getTours()
      .then((list) => {
        if (cancelled) return;
        const exclude = content.relatedExcludeNamePattern;
        const others = (list || []).filter((item) => {
          if (item.tourId === tour.tourId) return false;
          if (exclude && exclude.test(item.tourName || '')) return false;
          if (exclude && exclude.test(item.tourId || '')) return false;
          return true;
        });
        setMoreTours(others.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setMoreTours([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tour.tourId, content.relatedExcludeNamePattern]);

  useEffect(() => {
    let cancelled = false;
    getVehicleData(false, false)
      .then((fleet) => {
        if (cancelled) return;
        const stayEnd = tourStayEnd(pickupDate, Number(tour.days) || 1);
        const priced = (fleet || [])
          .map((vehicle) => ({ ...vehicle, price: tourPriceForVehicle(tour.pricing, vehicle) }))
          .filter((vehicle) => vehicle.price > 0)
          .filter((vehicle) => isVehicleAvailableForDateRange(vehicle, pickupDate, stayEnd));
        const used = new Set<string>();
        const rows: PricedVehicle[] = [];
        for (const group of GROUPS) {
          const matches = priced.filter((vehicle) => group.test.test(vehicle.name || ''));
          if (matches.length === 0) continue;
          const price = matches[0].price;
          const samePrice = matches.every((vehicle) => vehicle.price === price);
          if (samePrice) {
            const preferred = matches.find((vehicle) => /dzire/i.test(vehicle.name || '')) || matches[0];
            const seats = Math.max(1, Number(preferred.capacity) || 1);
            matches.forEach((vehicle) => used.add(vehicle.id));
            rows.push({
              ...preferred,
              name: matches.length > 1 ? group.name : preferred.name,
              description: matches.length > 1 ? `${group.sub} · ${seats} seats` : `${seats} seats`,
            });
          } else {
            for (const vehicle of matches) {
              used.add(vehicle.id);
              const seats = Math.max(1, Number(vehicle.capacity) || 1);
              rows.push({ ...vehicle, description: `${seats} seats` });
            }
          }
        }
        for (const vehicle of priced) {
          if (!used.has(vehicle.id)) rows.push(vehicle);
        }
        setOffers(rows);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      })
      .finally(() => {
        if (!cancelled) setFleetReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tour.pricing, tour.days, pickupDate]);

  useEffect(() => {
    if (!fleetReady || offers.length === 0) return;
    const stillListed = selectedVehicle && offers.some((offer) => offer.id === selectedVehicle.id);
    if (!stillListed) onVehicleSelect(offers[0]);
  }, [fleetReady, offers, selectedVehicle, onVehicleSelect]);

  useEffect(() => {
    const node = bookingCardRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setBookingInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const photos = useMemo(() => {
    const items: Array<{ url: string; alt: string }> = [];
    const seen = new Set<string>();
    const skip = new Set((content.skipCoverFiles || []).map((name) => name.toLowerCase()));
    const add = (url: string | undefined, alt: string) => {
      const clean = String(url || '').trim();
      const file = (clean.split('?')[0].split('/').pop() || '').toLowerCase();
      if (!clean || seen.has(clean) || skip.has(file)) return;
      seen.add(clean);
      items.push({ url: resolveSmartBudgetMediaUrl(clean) || clean, alt });
    };
    add(tour.imageUrl, content.coverAlt);
    for (const image of tour.gallery || []) add(image.url, image.alt || image.caption || tour.tourName);
    return items;
  }, [tour, content.coverAlt, content.skipCoverFiles]);

  const active = offers.find((offer) => offer.id === selectedVehicle?.id) || offers[0];
  const seats = Math.max(1, Number(active?.capacity) || 4);
  const perPerson = active ? Math.round(active.price / seats) : 0;
  const fromOffer = offers.find((offer) => /sedan|hatch/i.test(offer.name)) || offers[0];
  const fromEach = fromOffer
    ? Math.round(fromOffer.price / Math.max(1, Number(fromOffer.capacity) || 1))
    : 1250;

  const askWhatsApp = () => {
    const vehicleBit = active ? ` in a ${active.name}` : '';
    const filled = content.whatsAppMessage
      .replace('{vehicle}', vehicleBit)
      .replace('{date}', format(pickupDate, 'd MMM yyyy'));
    window.open(`https://wa.me/919966363662?text=${encodeURIComponent(filled)}`, '_blank', 'noopener,noreferrer');
  };

  const distanceLabel = `${tour.distance || content.heroChips.distanceFallbackKm} km${
    content.heroChips.distanceSuffix ? ` ${content.heroChips.distanceSuffix}` : ''
  }`;

  return (
    <div className="bg-white text-slate-900 antialiased md:pb-16">
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-2 md:px-6 md:pt-3">
        {/* 1. Compact Hero */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link to="/" className="text-slate-500 no-underline hover:text-slate-800">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/tours" className="text-slate-500 no-underline hover:text-slate-800">Tours</Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-slate-800">{content.breadcrumbLabel}</span>
        </nav>

        {photos.length > 0 ? (
          <div className="mt-3 flex snap-x gap-2 overflow-x-auto md:hidden">
            {photos.slice(0, 3).map((photo, index, shown) => (
              <button
                key={photo.url}
                type="button"
                onClick={() => {
                  setPhotoIndex(index);
                  setPhotosOpen(true);
                }}
                className="relative h-[200px] w-[88%] shrink-0 snap-center overflow-hidden rounded-2xl bg-slate-100"
              >
                <img
                  {...responsiveUploadImage(photo.url, '88vw')}
                  data-full={photo.url}
                  onError={showOriginalOnImageError}
                  alt={photo.alt}
                  className="h-full w-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index === 0 ? 'high' : 'low'}
                />
                {index === shown.length - 1 ? (
                  <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-white">
                    View all {photos.length} photos
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-2">
          <h1 className="m-0 text-[1.125rem] font-semibold leading-snug tracking-[-0.015em] text-slate-900 sm:text-2xl md:text-[27px] lg:whitespace-nowrap">
            {content.headline}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium leading-none text-slate-700 sm:gap-2 sm:text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 sm:gap-1.5 sm:px-3">
              <Clock className="h-3 w-3 text-[#0B57D0] sm:h-3.5 sm:w-3.5" aria-hidden />
              {content.heroChips.duration}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 sm:gap-1.5 sm:px-3">
              <Route className="h-3 w-3 text-[#0B57D0] sm:h-3.5 sm:w-3.5" aria-hidden />
              {distanceLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 sm:gap-1.5 sm:px-3">
              <MapPin className="h-3 w-3 text-[#0B57D0] sm:h-3.5 sm:w-3.5" aria-hidden />
              {content.heroChips.stopsLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 sm:px-3">
              {content.heroChips.pickupNote}
            </span>
          </div>
        </div>

        {/* 2. Two-column main area: Left (Gallery + 3 sections) + Right compact sticky booking card */}
        <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="w-full lg:sticky lg:top-[152px] lg:order-2 lg:w-[350px] lg:shrink-0 lg:self-start">
            <div ref={bookingCardRef} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.18)]">
              <div className="border-b border-slate-100 pb-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[22px] font-semibold leading-none tracking-tight text-slate-900">
                    {active ? rupee(active.price) : rupee(fromOffer?.price || 5000)}
                    <span className="ml-1.5 text-xs font-normal text-slate-500">total for cab</span>
                  </div>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                    Private tour
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-slate-500">
                  {active ? `${active.name} · ${seats} seats · ${rupee(perPerson)}/person` : `Private AC cab · ${rupee(fromEach)}/person`}
                </div>
              </div>

              <h2 className="sr-only">Book this tour</h2>

              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">Trip type</p>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                  {([
                    ['one-way', 'One way'],
                    ['round-trip', 'Round trip'],
                  ] as const).map(([mode, label]) => {
                    const on = tripMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onTripModeChange(mode)}
                        className={`h-8 rounded-md text-[13px] font-medium ${on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="[&_label]:!mb-1 [&_label]:!text-xs [&_label]:!font-medium [&_label]:!text-slate-600 [&_[role=combobox]]:!h-9 [&_[role=combobox]]:!min-h-0 [&_[role=combobox]]:!rounded-lg [&_[role=combobox]]:!border-slate-200 [&_button]:!h-9 [&_button]:!min-h-0 [&_button]:!rounded-lg [&_button]:!border-slate-200 [&_button]:!py-0 [&_button]:!px-2.5 [&_button_span]:!text-[13px] [&_button_span]:!font-medium [&_button_span]:!text-slate-800">
                <DateTimePicker
                  label="Travel date & pickup time"
                  date={pickupDate}
                  onDateChange={(date) => {
                    if (date) onDateChange(date);
                  }}
                  minDate={new Date()}
                  variant="desktop"
                  preferPopover
                />
              </div>

              <div className="[&_label]:!mb-1 [&_label]:!text-xs [&_label]:!font-medium [&_label]:!text-slate-600 [&_.ios-search-input-wrapper]:!h-9 [&_.ios-search-input-wrapper]:!min-h-0 [&_.ios-search-input-wrapper]:!rounded-lg [&_.ios-search-input-wrapper]:!border-slate-200 [&_.ios-search-input-wrapper]:!px-2.5 [&_svg.lucide-map-pin]:!mr-2 [&_input]:!h-8 [&_input]:!pl-0 [&_input]:!pr-8 [&_input]:!text-[13px] [&_input]:!font-medium [&_input]:!text-slate-800 [&_button]:!text-[13px] [&_button]:!font-medium [&_button_span]:!text-[13px] [&_button_span]:!font-medium">
                <LocationInput
                  label="Pickup address in Vizag"
                  placeholder="Hotel, area or landmark"
                  location={pickup}
                  onLocationChange={onPickupChange}
                  isPickupLocation
                  tripType="tour"
                  variant="desktop"
                />
              </div>

              <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
                <legend className="mb-1 text-xs font-medium text-slate-600">Select vehicle</legend>
                {!fleetReady ? <div className="text-xs text-slate-500">Loading vehicles…</div> : null}
                {fleetReady && offers.length === 0 ? (
                  <p className="text-xs text-slate-500">No vehicles are free on these dates.</p>
                ) : null}
                {offers.map((offer) => {
                  const on = active?.id === offer.id;
                  const offerSeats = Math.max(1, Number(offer.capacity) || 1);
                  return (
                    <button
                      key={offer.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onVehicleSelect(offer)}
                      className={`flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-2.5 text-left transition ${on ? 'border-[#0B57D0] bg-blue-50/70' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${on ? 'border-[#0B57D0]' : 'border-slate-300'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-[#0B57D0]' : 'bg-transparent'}`} />
                        </span>
                        <span className="truncate text-[13px] font-medium text-slate-800">{offer.name}</span>
                        <span className="shrink-0 text-[11.5px] text-slate-400">({offerSeats} seats)</span>
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-slate-900">{rupee(offer.price)}</span>
                    </button>
                  );
                })}
              </fieldset>

              <Button
                type="button"
                className="mt-0.5 h-10 rounded-xl bg-[#0B57D0] text-[14px] font-medium hover:bg-[#08409A]"
                onClick={onBook}
                disabled={!active}
              >
                Continue to book →
              </Button>

              <button
                type="button"
                onClick={askWhatsApp}
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline"
              >
                <FaWhatsapp className="h-3.5 w-3.5 text-[#25D366]" aria-hidden />
                Need a custom plan? Ask on WhatsApp
              </button>
            </div>
          </aside>

          {/* Left column: Gallery + 3 focused sections */}
          <div className="flex min-w-0 flex-1 flex-col lg:order-1">
            {photos.length > 0 ? (
              <div className="mb-7 hidden grid-cols-3 grid-rows-2 gap-2 overflow-hidden rounded-2xl ring-1 ring-slate-900/5 md:grid md:h-[310px]">
                {photos.slice(0, 3).map((photo, index, shown) => (
                  <button
                    key={photo.url}
                    type="button"
                    onClick={() => {
                      setPhotoIndex(index);
                      setPhotosOpen(true);
                    }}
                    className={`group relative min-h-[150px] overflow-hidden bg-slate-100 ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                  >
                    <img
                      {...responsiveUploadImage(photo.url, index === 0 ? '(min-width: 1024px) 640px, 70vw' : '(min-width: 1024px) 280px, 30vw')}
                      data-full={photo.url}
                      onError={showOriginalOnImageError}
                      alt={photo.alt}
                      className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={index === 0 ? 'high' : 'low'}
                    />
                    {index === shown.length - 1 ? (
                      <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-white shadow-md backdrop-blur">
                        View all {photos.length} photos
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {testimonialVideos.length > 0 ? (
            <section
              aria-labelledby="tour-testimonial-videos"
              className="relative mb-7 rounded-2xl bg-[#EEF4FB] px-4 py-5 md:px-5 md:py-6"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B57D0] text-white shadow-sm">
                    <Play className="h-4 w-4 fill-current" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2
                      id="tour-testimonial-videos"
                      className="m-0 text-lg font-semibold tracking-[-0.01em] text-[#0B3A7A] md:text-xl"
                    >
                      Tour Testimonial Videos
                    </h2>
                    <p className="mt-0.5 text-[13px] leading-snug text-slate-500">
                      Real stories from our guests who traveled with Vizag Taxi Hub.
                    </p>
                  </div>
                </div>
                <a
                  href={TOUR_TESTIMONIALS_YOUTUBE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-medium text-[#0B57D0] no-underline hover:underline"
                >
                  View All Testimonials →
                </a>
              </div>

              <div className="relative md:px-5">
                <button
                  type="button"
                  aria-label="Previous testimonials"
                  disabled={!videoCanScrollLeft}
                  onClick={() => {
                    const node = videoScrollerRef.current;
                    if (!node) return;
                    const card = node.querySelector('article');
                    const step = card ? card.getBoundingClientRect().width + 16 : node.clientWidth * 0.7;
                    node.scrollBy({ left: -step, behavior: 'smooth' });
                  }}
                  className="absolute left-0 top-[34%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0B57D0] shadow-md disabled:pointer-events-none disabled:opacity-30 md:flex"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Next testimonials"
                  disabled={!videoCanScrollRight}
                  onClick={() => {
                    const node = videoScrollerRef.current;
                    if (!node) return;
                    const card = node.querySelector('article');
                    const step = card ? card.getBoundingClientRect().width + 16 : node.clientWidth * 0.7;
                    node.scrollBy({ left: step, behavior: 'smooth' });
                  }}
                  className="absolute right-0 top-[34%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0B57D0] shadow-md disabled:pointer-events-none disabled:opacity-30 md:flex"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>

                <div
                  ref={videoScrollerRef}
                  className="flex snap-x gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-4 [&::-webkit-scrollbar]:hidden"
                >
                  {testimonialVideos.map((video) => {
                    const poster =
                      (video.posterUrl
                        ? resolveSmartBudgetMediaUrl(video.posterUrl) || video.posterUrl
                        : '') || `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
                    return (
                      <article
                        key={video.id}
                        className="flex w-[78%] min-w-0 shrink-0 snap-start flex-col sm:w-[55%] md:w-[min(280px,42%)]"
                      >
                        <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-200">
                          <button
                            type="button"
                            onClick={() => setPlayingVideoId(video.id)}
                            className="group absolute inset-0 block w-full"
                            aria-label={`Play testimonial from ${video.name}`}
                          >
                            <img
                              src={poster}
                              alt=""
                              className="h-full w-full object-cover"
                              width={480}
                              height={360}
                              loading="lazy"
                              decoding="async"
                              fetchPriority="low"
                              onError={(event) => {
                                const img = event.currentTarget;
                                const id = video.id;
                                if (img.src.includes('/hqdefault.jpg')) {
                                  img.src = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
                                  return;
                                }
                                if (img.src.includes('/mqdefault.jpg')) {
                                  img.src = `https://img.youtube.com/vi/${id}/sddefault.jpg`;
                                }
                              }}
                            />
                            <span className="absolute inset-0 bg-slate-900/20 transition group-hover:bg-slate-900/30" />
                            <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#0B57D0] shadow-md">
                              <Play className="h-4 w-4 fill-current" aria-hidden />
                            </span>
                            {video.duration ? (
                              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                                {video.duration}
                              </span>
                            ) : null}
                          </button>
                        </div>
                        <p className="mt-2.5 min-h-[2.5rem] line-clamp-2 text-[13px] font-semibold leading-snug text-[#0B3A7A]">
                          “{video.quote}”
                        </p>
                        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[12px] text-slate-600">
                          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                          <span className="max-w-[45%] truncate font-semibold text-slate-800">{video.name}</span>
                          <span className="shrink-0 text-slate-300" aria-hidden>
                            |
                          </span>
                          <span className="min-w-0 truncate text-slate-500">{video.tourLabel}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
            ) : null}

            <Dialog
              open={Boolean(playingVideoId)}
              onOpenChange={(open) => {
                if (!open) setPlayingVideoId(null);
              }}
            >
              <DialogContent className="max-w-3xl gap-3 border-slate-200 p-4 sm:rounded-2xl">
                <DialogTitle className="pr-8 text-base font-semibold text-slate-900">
                  {testimonialVideos.find((video) => video.id === playingVideoId)?.quote ||
                    'Tour testimonial'}
                </DialogTitle>
                {playingVideoId ? (
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                    <iframe
                      key={playingVideoId}
                      title="Tour testimonial video"
                      src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1&playsinline=1&rel=0`}
                      className="absolute inset-0 h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                ) : null}
                {playingVideoId ? (
                  <a
                    href={
                      testimonialVideos.find((video) => video.id === playingVideoId)?.youtubeUrl ||
                      `https://www.youtube.com/watch?v=${playingVideoId}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[#0B57D0] hover:underline"
                  >
                    Open on YouTube →
                  </a>
                ) : null}
              </DialogContent>
            </Dialog>

            {/* Section 1: Day Plan (Route + Stops) */}
            <section id="itinerary" className="border-b border-slate-200 pb-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="m-0 text-lg font-semibold tracking-[-0.01em] text-slate-900">{content.itineraryTitle}</h2>
                <span className="text-xs text-slate-400">{content.itinerarySubtitle}</span>
              </div>

              {content.routeStrip && content.routeStrip.length > 0 ? (
                <div
                  className="my-4 hidden rounded-xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-200/70 md:block"
                  aria-label="Tour route overview"
                >
                  <div className="grid grid-cols-4">
                    {content.routeStrip.map((node, index, nodes) => (
                      <div key={`${node.place}-${index}`} className="relative flex flex-col items-center text-center">
                        {index < nodes.length - 1 ? (
                          <span className="absolute left-1/2 top-[5px] h-px w-full bg-slate-300" aria-hidden />
                        ) : null}
                        <span
                          className={`relative z-10 block h-2.5 w-2.5 rounded-full ring-4 ring-slate-50 ${
                            index === 0 || index === nodes.length - 1 ? 'bg-[#0B57D0]' : 'bg-amber-500'
                          }`}
                          aria-hidden
                        />
                        <span className="mt-1.5 block truncate px-1 text-xs font-medium text-slate-800">{node.place}</span>
                        <span className="block truncate px-1 text-[11px] text-slate-500">{node.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                className={
                  twoDayColumns
                    ? 'mt-5 grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2'
                    : multiDay
                      ? 'mt-5 flex flex-col gap-5'
                      : 'mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2'
                }
              >
                {stopColumns.map((colStops, colIdx) => (
                  <ol key={colIdx} className="m-0 flex list-none flex-col p-0">
                    {colStops.map((stop, rowIdx) => {
                      const priorCount = stopColumns
                        .slice(0, colIdx)
                        .reduce((count, column) => count + column.length, 0);
                      const globalIdx = priorCount + rowIdx;
                      const lastInCol = rowIdx === colStops.length - 1;
                      const lastOverall = globalIdx === stops.length - 1;
                      const numberSource = multiDay ? colStops.slice(0, rowIdx) : stops.slice(0, globalIdx);
                      const number = numberSource.filter((item) => !item.time).length + 1;
                      return (
                        <li key={`${stop.title}-${globalIdx}`} className="flex gap-3">
                          <div className="flex w-5 shrink-0 flex-col items-center">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                                stop.time ? 'bg-[#0B57D0] text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {stop.time ? (
                                lastOverall ? (
                                  <Check className="h-3 w-3" aria-hidden />
                                ) : (
                                  <Home className="h-3 w-3" aria-hidden />
                                )
                              ) : (
                                number
                              )}
                            </span>
                            {lastInCol ? null : <span className="min-h-[12px] w-px flex-1 bg-slate-200" />}
                          </div>
                          <div className={lastInCol ? 'min-w-0' : 'min-w-0 pb-3'}>
                            {stop.time ? <div className="text-[11px] font-medium text-[#0B57D0]">{stop.time}</div> : null}
                            <div className="text-sm font-medium leading-snug text-slate-800">{stop.title}</div>
                            {stop.detail ? <div className="text-xs text-slate-500">{stop.detail}</div> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ))}
              </div>
            </section>

            {/* Section 2: Inclusions & Exclusions */}
            <section id="inclusions" className="border-b border-slate-200 py-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="m-0 text-lg font-semibold tracking-[-0.01em] text-slate-900">{content.inclusionsTitle}</h2>
                <span className="text-xs text-slate-500">{content.inclusionsSubtitle}</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-emerald-800">Included in the fare</h3>
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13px] leading-snug text-slate-700">
                    {content.included.map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/35 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white">
                      <X className="h-3 w-3" aria-hidden />
                    </span>
                    <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-amber-900">Extra / not included</h3>
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13px] leading-snug text-slate-700">
                    {content.excluded.map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 px-4 py-2.5 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200/70">
                <strong className="font-medium text-slate-700">Please note: </strong>
                {content.policyNote}
              </div>
            </section>

            {/* Section 3: Good to know & FAQs */}
            <section id="faq" className="pt-8">
              <h2 className="m-0 mb-3 text-lg font-semibold tracking-[-0.01em] text-slate-900">Good to know &amp; FAQs</h2>

              <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {content.goodToKnow.map((chip) => (
                  <div key={chip.label} className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">{chip.label}</div>
                    <div className="mt-0.5 text-[13px] font-medium text-slate-800">{chip.value}</div>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-4">
                {content.faqs.map((item, idx) => (
                  <details key={item.q} open={idx === 0} className="group py-3.5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-800">
                      <span>{item.q}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{item.a}</div>
                  </details>
                ))}
              </div>
            </section>

            <section id="reviews" className="border-t border-slate-200 py-8">
              <h2 className="m-0 text-lg font-semibold tracking-[-0.01em] text-slate-900">Reviews</h2>
              <p className="mt-1 text-xs text-slate-500">4.9 on Google · from travellers who booked with Vizag Taxi Hub</p>
              <div className="mt-4 flex snap-x gap-3 overflow-x-auto md:grid md:grid-cols-3 md:overflow-visible">
                {content.reviews.map((review) => (
                  <figure key={review.name} className="w-[80%] shrink-0 snap-start rounded-xl border border-slate-200 p-4 md:w-auto">
                    <div className="flex gap-0.5 text-amber-400" aria-label="5 stars">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star key={index} className="h-3.5 w-3.5 fill-current" aria-hidden />
                      ))}
                    </div>
                    <blockquote className="mt-2 text-[13px] leading-relaxed text-slate-700">{review.text}</blockquote>
                    <figcaption className="mt-3 text-xs font-medium text-slate-500">{review.name} · Google</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* 4. Full-width More Tours at the bottom */}
        <section aria-labelledby="more-tours" className="mt-12 border-t border-slate-200 pt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="more-tours" className="m-0 text-lg font-semibold tracking-[-0.01em] text-slate-900">More tours from Vizag</h2>
            <Link to="/tours" className="shrink-0 text-sm font-medium text-[#0B57D0] no-underline hover:underline">View all tours →</Link>
          </div>
          {moreTours.length > 0 ? (
            <div className="flex snap-x gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible lg:grid-cols-4">
              {moreTours.map((item) => (
                <Link
                  key={item.tourId}
                  to={getTourUrl(item)}
                  className="group flex w-[72%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 no-underline transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_32px_-18px_rgba(15,23,42,0.3)] md:w-auto"
                >
                  <span className="block h-36 overflow-hidden bg-slate-100">
                    <img
                      {...responsiveUploadImage(resolveSmartBudgetMediaUrl(item.imageUrl) || item.imageUrl, '(min-width: 1024px) 280px, 72vw')}
                      data-full={resolveSmartBudgetMediaUrl(item.imageUrl) || item.imageUrl}
                      onError={showOriginalOnImageError}
                      alt={item.tourName}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  </span>
                  <span className="flex flex-1 flex-col justify-between p-4">
                    <span className="block text-[15px] font-medium leading-snug text-slate-900">{item.tourName}</span>
                    <span className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                      <span>{item.timeDuration || `${item.days} day${item.days > 1 ? 's' : ''}`} · {item.distance} km</span>
                      {item.minPrice > 0 ? <span className="font-semibold text-slate-900">From {rupee(item.minPrice)}</span> : null}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {active && !bookingInView ? (
        <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#E2E8F0] bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
          <div className="flex items-center gap-2">
            <a href="tel:+919966363662" aria-label="Call" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700">
              <Phone className="h-4 w-4" aria-hidden />
            </a>
            <a
              href="https://wa.me/919966363662"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[#25D366]"
            >
              <FaWhatsapp className="h-5 w-5" aria-hidden />
            </a>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-[#475569]">{active.name}</div>
              <div className="text-lg font-semibold leading-none">{rupee(active.price)}</div>
            </div>
            <Button type="button" className="h-11 shrink-0 rounded-xl bg-[#0B57D0] px-4 font-medium hover:bg-[#08409A]" onClick={onBook}>Book now</Button>
          </div>
        </div>
      ) : null}

      <Dialog open={photosOpen} onOpenChange={setPhotosOpen}>
        <DialogContent
          showClose={false}
          overlayClassName="bg-black"
          className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-black p-0 shadow-none"
        >
          <DialogTitle className="sr-only">Tour photos</DialogTitle>
          {photosOpen && photos[photoIndex] ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
                <p className="text-sm font-medium">
                  {photoIndex + 1} / {photos.length}
                </p>
                <button
                  type="button"
                  onClick={() => setPhotosOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"
                  aria-label="Close photos"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div
                className="relative flex min-h-0 flex-1 items-center justify-center px-3"
                onTouchStart={(event) => {
                  photoTouchX.current = event.touches[0]?.clientX ?? 0;
                }}
                onTouchEnd={(event) => {
                  const diff = photoTouchX.current - (event.changedTouches[0]?.clientX ?? 0);
                  if (diff > 40) setPhotoIndex((index) => Math.min(photos.length - 1, index + 1));
                  else if (diff < -40) setPhotoIndex((index) => Math.max(0, index - 1));
                }}
              >
                <img
                  key={photos[photoIndex].url}
                  src={sizedUploadImage(photos[photoIndex].url, 1600)}
                  data-full={photos[photoIndex].url}
                  onError={showOriginalOnImageError}
                  alt={photos[photoIndex].alt}
                  className="max-h-full max-w-full object-contain"
                  decoding="async"
                  fetchPriority="high"
                />
                {photos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      disabled={photoIndex === 0}
                      onClick={() => setPhotoIndex((index) => Math.max(0, index - 1))}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      disabled={photoIndex === photos.length - 1}
                      onClick={() => setPhotoIndex((index) => Math.min(photos.length - 1, index + 1))}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                ) : null}
              </div>
              <p className="truncate px-4 pt-2 text-center text-xs text-white/80">{photos[photoIndex].alt}</p>
              <div className="flex gap-2 overflow-x-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                {photos.map((photo, index) => (
                  <button
                    key={photo.url}
                    type="button"
                    aria-label={`Show photo ${index + 1}`}
                    onClick={() => setPhotoIndex(index)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white/10 ring-2 ${index === photoIndex ? 'ring-white' : 'ring-transparent opacity-70'}`}
                  >
                    <img
                      src={sizedUploadImage(photo.url, 400)}
                      data-full={photo.url}
                      onError={showOriginalOnImageError}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
