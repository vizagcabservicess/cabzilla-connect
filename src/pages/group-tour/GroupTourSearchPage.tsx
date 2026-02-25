import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HIGHLIGHT_TRUNCATE_LEN = 80;
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { groupTourAPI, type GroupTour } from '@/services/api/groupTourAPI';
import { toast } from 'sonner';
import { MapPin, Calendar, Users, Loader2, ArrowLeft, ChevronDown, ChevronUp, Check, X, Info, Camera, Car, Flag, IndianRupee, Share2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

export default function GroupTourSearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pickup = searchParams.get('pickup') || '';
  const dropoff = searchParams.get('dropoff') || '';
  const date = searchParams.get('date') || '';

  const [tours, setTours] = useState<GroupTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<Record<number, number>>({});
  const [galleryPopupTour, setGalleryPopupTour] = useState<GroupTour | null>(null);
  const [galleryPopupIndex, setGalleryPopupIndex] = useState(0);
  const [expandedHighlights, setExpandedHighlights] = useState<Record<string, boolean>>({});
  const [expandedItinerary, setExpandedItinerary] = useState<Record<string, boolean>>({});
  const [policyOpen, setPolicyOpen] = useState(false);
  const [activeTourId, setActiveTourId] = useState<number | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<Record<number, string>>({});
  const touchStartXRef = useRef<number>(0);

  // Auto-scroll gallery for the visible tour when it has multiple images
  useEffect(() => {
    if (!activeTourId || tours.length === 0) return;
    const tour = tours.find((t) => t.id === activeTourId);
    if (!tour) return;
    const featured = tour.featured_image_url;
    const gallery = tour.gallery_images ?? [];
    const images = featured && !gallery.includes(featured) ? [featured, ...gallery] : gallery.length > 0 ? gallery : (featured ? [featured] : []);
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setSelectedImageIndex((prev) => {
        const curr = prev[activeTourId] ?? 0;
        const next = (curr + 1) % images.length;
        return { ...prev, [activeTourId]: next };
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTourId, tours]);

  // Intersection Observer: which tour card is in view for the fixed rate card
  useEffect(() => {
    if (tours.length === 0) return;
    const cards = document.querySelectorAll('[data-tour-card]');
    if (cards.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topmost = visible.reduce((a, b) =>
          (a.boundingClientRect.top < b.boundingClientRect.top ? a : b)
        );
        const tourId = Number((topmost.target as HTMLElement).dataset.tourId);
        if (tourId) setActiveTourId(tourId);
      },
      { threshold: 0.1, rootMargin: '-100px 0px -40% 0px' }
    );
    cards.forEach((el) => observer.observe(el));
    setActiveTourId(tours[0].id);
    return () => observer.disconnect();
  }, [tours]);

  const fetchTours = useCallback(() => {
    if (!pickup || !dropoff || !date) return;
    groupTourAPI
      .searchTours(pickup, dropoff, date)
      .then(setTours)
      .catch((err) => {
        toast.error(err?.message || 'Failed to search tours');
        setTours([]);
      })
      .finally(() => setLoading(false));
  }, [pickup, dropoff, date]);

  useEffect(() => {
    if (!pickup || !dropoff || !date) {
      navigate('/group-tours');
      return;
    }
    setLoading(true);
    fetchTours();
  }, [pickup, dropoff, date, navigate, fetchTours]);

  // Refresh availability every 60s and when tab becomes visible (e.g. after completing a booking)
  useEffect(() => {
    if (!pickup || !dropoff || !date || tours.length === 0) return;
    const interval = setInterval(fetchTours, 60000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchTours();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pickup, dropoff, date, tours.length, fetchTours]);

  const handleSelectTour = (tour: GroupTour) => {
    navigate(`/group-tours/seat-selection/${tour.id}?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&date=${date}`);
  };

  const getGalleryImages = (tour: GroupTour): string[] => {
    const featured = tour.featured_image_url;
    const gallery = tour.gallery_images ?? [];
    if (featured && !gallery.includes(featured)) return [featured, ...gallery];
    return gallery.length > 0 ? gallery : (featured ? [featured] : []);
  };

  const getMainImage = (tour: GroupTour) => {
    const images = getGalleryImages(tour);
    if (images.length === 0) return null;
    const idx = selectedImageIndex[tour.id] ?? 0;
    return images[idx % images.length];
  };

  const toggleHighlight = (tourId: number, i: number) => {
    setExpandedHighlights((prev) => ({
      ...prev,
      [`${tourId}-${i}`]: !prev[`${tourId}-${i}`],
    }));
  };

  const toggleItineraryDay = (tourId: number, i: number) => {
    setExpandedItinerary((prev) => ({
      ...prev,
      [`${tourId}-${i}`]: !prev[`${tourId}-${i}`],
    }));
  };

  const galleryImages = galleryPopupTour ? getGalleryImages(galleryPopupTour) : [];
  const canPrev = galleryPopupIndex > 0;
  const canNext = galleryPopupIndex < galleryImages.length - 1 && galleryImages.length > 1;

  const pageTitle = pickup && dropoff
    ? `${pickup} to ${dropoff} Group Tours${date ? ` - ${date}` : ''} | Vizag Taxi Hub`
    : 'Group Tour Search | Vizag Taxi Hub';
  const pageDescription = pickup && dropoff
    ? `Book affordable group tours from ${pickup} to ${dropoff}. Compare tour packages, view availability, and save up to 60% on shared travel.`
    : 'Search and compare group tour packages from Vizag to popular destinations. Find availability, view tour details, and book seats at the best prices.';
  const canonicalUrl = `https://vizagtaxihub.com/group-tours/search${pickup && dropoff ? `?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}${date ? `&date=${date}` : ''}` : ''}`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="vizag group tours, group tour search, vizag to araku tour, shared travel vizag, affordable group tours, vizag taxi hub, tour packages vizag" />
        <meta name="author" content="Vizag Taxi Hub" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:site_name" content="Vizag Taxi Hub" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="/og-image.png" />
      </Helmet>
      {/* Gallery lightbox popup */}
      <Dialog open={!!galleryPopupTour} onOpenChange={(open) => !open && setGalleryPopupTour(null)}>
        <DialogContent
          className="max-w-2xl w-[90vw] max-h-[75vh] p-0 gap-0 overflow-hidden border-0 bg-black/95 [&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:top-3 [&>button]:right-3"
          showCloseButton={true}
        >
          {galleryPopupTour && galleryImages.length > 0 && (
            <div className="flex flex-col h-full">
              {/* Main image area */}
              <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black">
                <img
                  src={galleryImages[galleryPopupIndex]}
                  alt=""
                  className="max-w-full max-h-[55vh] w-auto h-auto object-contain"
                  referrerPolicy="no-referrer"
                />
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setGalleryPopupIndex((i) => Math.max(0, i - 1))}
                      disabled={!canPrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryPopupIndex((i) => Math.min(galleryImages.length - 1, i + 1))}
                      disabled={!canNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-sm">
                  {galleryPopupIndex + 1} / {galleryImages.length}
                </div>
              </div>
              {/* Thumbnail strip */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto justify-center border-t border-white/10">
                  {galleryImages.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setGalleryPopupIndex(i)}
                      className={`shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                        galleryPopupIndex === i ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-transparent hover:border-white/50'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fixed rate card - always visible on desktop while scrolling */}
      {!loading && tours.length > 0 && (() => {
        const tour = tours.find((t) => t.id === activeTourId) ?? tours[0];
        return (
          <div className="hidden md:block fixed right-6 top-24 z-30 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
            <p className="text-xl font-bold text-blue-700">
              Starting from ₹{(tour.price_from ?? tour.price_per_seat).toLocaleString('en-IN')}
              <span className="font-normal text-sm text-slate-500 ml-1">per seat</span>
            </p>
            <Button
              onClick={() => handleSelectTour(tour)}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
            >
              Select Seats
            </Button>
          </div>
        );
      })()}

      <Navbar />
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 pt-0 md:pt-20 pb-8 overflow-x-hidden">
      <div className={`container mx-auto px-4 ${!loading && tours.length > 0 ? 'md:pr-80' : ''}`}>
        {/* Back + Search results - desktop only; mobile: Back on gallery, route in info card */}
        <div className="hidden md:block">
          <Link
            to="/group-tours"
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 mb-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="rounded-xl p-2 mb-2 md:p-3 md:mb-4 bg-white border border-slate-200 shadow-sm">
            <h2 className="text-lg md:text-xl font-semibold text-slate-800">Search results</h2>
            <p className="text-slate-600 text-sm mt-0.5">{pickup} → {dropoff} • {date}</p>
          </div>
        </div>

        {/* Mobile sticky dark footer - Screenshot 2 style */}
        {!loading && tours.length > 0 && (() => {
          const activeTour = tours.find((t) => t.id === activeTourId) ?? tours[0];
          const price = activeTour.price_from ?? activeTour.price_per_seat;
          return (
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white px-4 py-4 safe-area-pb flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-300">Starting From</p>
                <p className="text-lg font-bold">
                  ₹{price.toLocaleString('en-IN')} per seat
                </p>
              </div>
              <Button
                onClick={() => handleSelectTour(activeTour)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 shrink-0"
              >
                CONTINUE
              </Button>
            </div>
          );
        })()}

        {/* Bottom padding when footer is visible on mobile */}
        {!loading && tours.length > 0 && <div className="md:hidden h-20" />}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-white/70 backdrop-blur border border-white/50">
            <p className="text-slate-600">No tours available for this route and date.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/group-tours')}
            >
              Search again
            </Button>
          </div>
        ) : (
          <div className="space-y-4 -mx-4 md:mx-0">
            {tours.map((tour) => (
              <div
                key={tour.id}
                data-tour-card
                data-tour-id={tour.id}
                className="rounded-none md:rounded-xl bg-white md:bg-white/80 backdrop-blur border-0 md:border border-slate-200 md:border-white/60 shadow-md md:shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="flex flex-col">
                  {/* Gallery - mobile: hero image; Desktop: grid */}
                  {(tour.featured_image_url || (tour.gallery_images?.length ?? 0) > 0) && (
                    <div className="w-full flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2 md:gap-1 md:aspect-[2/1] md:min-h-[260px] md:max-h-[420px] overflow-hidden rounded-none md:rounded-t-xl">
                      <div
                        className="relative h-[50vh] md:h-full md:row-span-2 md:col-span-1 bg-slate-200 overflow-hidden md:min-h-[200px] touch-pan-y"
                        onTouchStart={(e) => {
                          touchStartXRef.current = e.touches[0]?.clientX ?? 0;
                        }}
                        onTouchEnd={(e) => {
                          const endX = e.changedTouches[0]?.clientX ?? 0;
                          const startX = touchStartXRef.current;
                          const diff = startX - endX;
                          const imgs = getGalleryImages(tour);
                          if (imgs.length <= 1) return;
                          if (diff > 50) {
                            setSelectedImageIndex((prev) => ({
                              ...prev,
                              [tour.id]: Math.min(imgs.length - 1, (prev[tour.id] ?? 0) + 1),
                            }));
                          } else if (diff < -50) {
                            setSelectedImageIndex((prev) => ({
                              ...prev,
                              [tour.id]: Math.max(0, (prev[tour.id] ?? 0) - 1),
                            }));
                          }
                        }}
                      >
                        {/* Back button - Burj style overlay on gallery (mobile) */}
                        <Link
                          to="/group-tours"
                          className="absolute top-3 left-3 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center md:hidden"
                          aria-label="Back"
                        >
                          <ArrowLeft className="h-5 w-5 text-slate-800" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            const url = window.location.href;
                            const text = `${tour.title || tour.pickup_location + ' → ' + tour.dropoff_location} - ₹${(tour.price_from ?? tour.price_per_seat)?.toLocaleString('en-IN')} per seat`;
                            if (navigator.share) {
                              navigator.share({ title: 'Group Tour', text, url }).catch(() => {});
                            } else {
                              navigator.clipboard?.writeText(url);
                              toast.success('Link copied');
                            }
                          }}
                          className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center"
                          aria-label="Share"
                        >
                          <Share2 className="h-5 w-5 text-slate-800" />
                        </button>
                        {getMainImage(tour) && (
                          <img
                            key={selectedImageIndex[tour.id] ?? 0}
                            src={getMainImage(tour)!}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        {getGalleryImages(tour).length > 1 ? (
                          <>
                            {/* Prev/Next - desktop only; mobile uses dots */}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedImageIndex((prev) => ({
                                  ...prev,
                                  [tour.id]: Math.max(0, (prev[tour.id] ?? 0) - 1),
                                }))
                              }
                              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white items-center justify-center"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedImageIndex((prev) => ({
                                  ...prev,
                                  [tour.id]: Math.min(getGalleryImages(tour).length - 1, (prev[tour.id] ?? 0) + 1),
                                }))
                              }
                              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white items-center justify-center"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium hidden md:block">
                              {((selectedImageIndex[tour.id] ?? 0) + 1)} / {getGalleryImages(tour).length}
                            </div>
                          </>
                        ) : null}
                        {/* Mobile: carousel dots on image only, above info card overlap (Burj style) */}
                        {getGalleryImages(tour).length >= 1 && (
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 md:hidden">
                            {getGalleryImages(tour).map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setSelectedImageIndex((prev) => ({ ...prev, [tour.id]: i }))}
                                className={`w-2.5 h-2.5 rounded-full transition-colors drop-shadow-sm ${
                                  (selectedImageIndex[tour.id] ?? 0) === i
                                    ? 'bg-white'
                                    : 'bg-white/50'
                                }`}
                                aria-label={`View image ${i + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {/* 4-image grid on right (~1/3 width - Bhutan style) - direct grid children for equal height */}
                      {[0, 1, 2, 3].map((i) => {
                        const imgs = getGalleryImages(tour);
                        const url = imgs[i % imgs.length];
                        const isViewAll = i === 3 && imgs.length > 1;
                        const selected = (selectedImageIndex[tour.id] ?? 0) === Math.min(i, imgs.length - 1);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              if (isViewAll) {
                                setGalleryPopupTour(tour);
                                setGalleryPopupIndex(selectedImageIndex[tour.id] ?? 0);
                              } else {
                                setSelectedImageIndex((prev) => ({ ...prev, [tour.id]: Math.min(i, imgs.length - 1) }));
                              }
                            }}
                            className={`hidden md:block relative w-full h-full min-h-0 overflow-hidden rounded group ${selected ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            {url ? (
                              <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-slate-200" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                            {isViewAll && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
                                <Camera className="h-5 w-5 text-white" />
                                <span className="text-white text-xs font-medium">View All Images</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Tour details - Burj Khalifa style info card */}
                  <div className="w-full p-5 sm:p-6 bg-white md:border-t md:border-slate-100 rounded-t-3xl md:rounded-t-none rounded-b-xl -mt-12 md:mt-0 pt-8 md:pt-5 shadow-xl md:shadow-none relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                      <div className="flex-1 min-w-0">
                        {/* Title row: title left, badge right (Burj style) */}
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <div className="min-w-0">
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                              {tour.title?.trim() || `${tour.pickup_location} → ${tour.dropoff_location}`}
                            </h2>
                            <p className="text-sm text-slate-600 mt-1">
                              {tour.pickup_location} → {tour.dropoff_location}
                            </p>
                          </div>
                          <span className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-sm font-semibold">
                            Save up to 60%
                          </span>
                        </div>

                        {/* Key details list - Burj style with icons */}
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center gap-3 text-slate-600">
                            <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                            <span className="text-sm">{tour.pickup_location} → {tour.dropoff_location}</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-600">
                            <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                            <span className="text-sm">Journey Date: {tour.travel_date}</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-600">
                            <IndianRupee className="h-4 w-4 text-slate-500 shrink-0" />
                            <span className="text-sm">Fare starts at ₹{(tour.price_from ?? tour.price_per_seat).toLocaleString('en-IN')}/per seat</span>
                          </div>
                          {((tour as any).first_boarding_point_name || (tour as any).first_boarding_time) && (
                            <div className="flex items-center gap-3 text-slate-600">
                              <Clock className="h-4 w-4 text-slate-500 shrink-0" />
                              <span className="text-sm">{(tour as any).first_boarding_point_name || 'Boarding'}{(tour as any).first_boarding_time ? ` • ${(tour as any).first_boarding_time}` : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Navigation tabs - Burj style */}
                        <div className="mt-5 border-b border-slate-200">
                          <div className="flex gap-6 overflow-x-auto pb-px -mb-px [&::-webkit-scrollbar]:hidden">
                            {['overview', 'itinerary', 'highlights', 'inclusions'].map((tab) => {
                              const active = (activeInfoTab[tour.id] ?? 'overview') === tab;
                              return (
                                <button
                                  key={tab}
                                  type="button"
                                  onClick={() => setActiveInfoTab((prev) => ({ ...prev, [tour.id]: tab }))}
                                  className={`shrink-0 pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                                    active
                                      ? 'border-blue-600 text-blue-600'
                                      : 'border-transparent text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  {tab === 'inclusions' ? "What's included" : tab}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tab content */}
                        {(activeInfoTab[tour.id] ?? 'overview') === 'overview' && (
                          <div className="mt-5 pt-1">
                            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                              <div className="flex items-center gap-3">
                                <Car className="h-5 w-5 text-slate-500 shrink-0" />
                                <span>Transfer Included</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Camera className="h-5 w-5 text-slate-500 shrink-0" />
                                <span>Sightseeing Included</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-slate-500 shrink-0" />
                                <span>Pickup Included</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Flag className="h-5 w-5 text-slate-500 shrink-0" />
                                <span>Drop Included</span>
                              </div>
                            </div>
                            <p className="mt-4 text-sm text-slate-600">
                              {tour.available_seats} seats available • Group tour by Tempo Traveller
                            </p>
                          </div>
                        )}

                        {(activeInfoTab[tour.id] ?? 'overview') === 'itinerary' && (
                          <div className="mt-5 pt-1 space-y-3">
                            {(tour.itinerary?.length ?? 0) > 0 ? tour.itinerary?.map((item, i) => {
                              const key = `${tour.id}-${i}`;
                              const expanded = expandedItinerary[key];
                              return (
                                <div key={i} className="rounded-lg border border-slate-100 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => toggleItineraryDay(tour.id, i)}
                                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
                                  >
                                    {item.day ? (
                                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-600 text-white text-xs font-bold">
                                        DAY {item.day}
                                      </span>
                                    ) : null}
                                    <span className="flex-1 text-sm font-medium text-slate-800">{item.title}</span>
                                    {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                  </button>
                                  {item.description && (
                                    <p className={`px-3 pb-3 text-sm text-slate-600 ${expanded ? 'block' : 'hidden'}`}>{item.description}</p>
                                  )}
                                </div>
                              );
                            }) : (
                              <p className="text-sm text-slate-500 py-4">No itinerary available.</p>
                            )}
                          </div>
                        )}

                        {(activeInfoTab[tour.id] ?? 'overview') === 'highlights' && (
                          <div className="mt-5 pt-1">
                            {(tour.highlights?.length ?? 0) > 0 ? (
                            <ul className="space-y-2">
                              {tour.highlights?.slice(0, 10).map((h, i) => {
                                const isLong = h.length > HIGHLIGHT_TRUNCATE_LEN;
                                const expanded = expandedHighlights[`${tour.id}-${i}`];
                                const displayText = isLong && !expanded ? h.slice(0, HIGHLIGHT_TRUNCATE_LEN) + '...' : h;
                                return (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                    <span className="text-green-600 mt-0.5 shrink-0">✓</span>
                                    <span>
                                      {displayText}
                                      {isLong && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); toggleHighlight(tour.id, i); }}
                                          className="ml-1 text-blue-600 hover:text-blue-700 font-medium text-xs"
                                        >
                                          {expanded ? 'Read less' : 'Read more'}
                                        </button>
                                      )}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                            ) : (
                              <p className="text-sm text-slate-500 py-4">No highlights available.</p>
                            )}
                          </div>
                        )}

                        {(activeInfoTab[tour.id] ?? 'overview') === 'inclusions' && (
                          <div className="mt-5 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {(tour.inclusions?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-slate-800 mb-2">Inclusions</p>
                                <ul className="space-y-2">
                                  {tour.inclusions?.map((inc, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                      {inc}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {(tour.exclusions?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-slate-800 mb-2">Exclusions</p>
                                <ul className="space-y-2">
                                  {tour.exclusions?.map((exc, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                      <X className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                      {exc}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {((tour.inclusions?.length ?? 0) === 0 && (tour.exclusions?.length ?? 0) === 0) && (
                              <p className="text-sm text-slate-500 py-4 col-span-full">No inclusions/exclusions listed.</p>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Rate card - desktop only; mobile uses sticky footer */}
                      <div className="hidden md:flex flex-col shrink-0">
                        <p className="text-xl font-bold text-blue-700">
                          Starting from ₹{(tour.price_from ?? tour.price_per_seat).toLocaleString('en-IN')}
                          <span className="font-normal text-sm text-slate-500 ml-1">per seat</span>
                        </p>
                        <Button
                          onClick={() => handleSelectTour(tour)}
                          className="mt-3 bg-blue-600 hover:bg-blue-700 w-full"
                        >
                          Select Seats
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Related Tours - horizontal carousel when 2+ tours */}
        {!loading && tours.length >= 2 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Related Tours</h2>
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-slate-300">
                {tours.map((tour) => (
                  <div
                    key={tour.id}
                    className="flex-shrink-0 w-72 snap-center rounded-xl overflow-hidden bg-white/90 backdrop-blur border border-white/60 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <Link
                      to={`/group-tours/seat-selection/${tour.id}?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&date=${date}`}
                      className="block"
                    >
                      <div className="relative h-40 bg-slate-200">
                        {getGalleryImages(tour)[0] ? (
                          <img
                            src={getGalleryImages(tour)[0]}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-200" />
                        )}
                        <div className="absolute bottom-2 left-2 right-2 text-white text-sm font-medium drop-shadow-md">
                          {tour.pickup_location} → {tour.dropoff_location}
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {tour.travel_date} • {tour.available_seats} seats
                        </p>
                        <p className="text-lg font-bold text-blue-700 mt-1">
                          ₹{(tour.price_from ?? tour.price_per_seat).toLocaleString('en-IN')}
                          <span className="font-normal text-sm text-slate-500 ml-1">per seat</span>
                        </p>
                        <Button size="sm" className="w-full mt-3 bg-blue-600 hover:bg-blue-700">
                          Select Seats
                        </Button>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VEHICLE & BOOKING POLICY - expanded on desktop, accordion on mobile */}
        <div className="mt-8 rounded-xl overflow-hidden bg-white/80 backdrop-blur border border-white/60 shadow-sm">
          <button
            type="button"
            onClick={() => setPolicyOpen(!policyOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50/80 md:hover:bg-transparent transition-colors md:pointer-events-none"
          >
            <span className="flex items-center gap-2 font-semibold text-slate-800">
              <Info className="h-4 w-4 text-blue-600" />
              VEHICLE & BOOKING POLICY
            </span>
            <span className="md:hidden">{policyOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}</span>
          </button>
          <div className={`px-4 pb-4 pt-0 text-sm text-slate-600 space-y-3 border-t border-slate-100 ${policyOpen ? 'block' : 'hidden md:block'}`}>
            <p>We assign vehicles based on confirmed passengers:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>10–17:</strong> Tempo Traveller</li>
              <li><strong>7:</strong> Innova Crysta</li>
              <li><strong>5–6:</strong> Ertiga</li>
              <li><strong>1–4:</strong> Sedan</li>
            </ul>
            <p><strong>Minimum 4 bookings</strong> required. If fewer 24h before departure, we&apos;ll contact you. Choose: full refund, reschedule, or upgrade to private tour.</p>
          </div>
        </div>
      </div>
    </div>
      <Footer />
    </>
  );
}
