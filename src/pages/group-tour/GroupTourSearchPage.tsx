import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HIGHLIGHT_TRUNCATE_LEN = 80;
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { groupTourAPI, type GroupTour } from '@/services/api/groupTourAPI';
import { toast } from 'sonner';
import { MapPin, Calendar, Users, Loader2, ArrowLeft, ChevronDown, ChevronUp, Check, X, Info, Camera, Car, Flag } from 'lucide-react';
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
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
  const [policyOpen, setPolicyOpen] = useState(false);
  const [activeTourId, setActiveTourId] = useState<number | null>(null);

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

  const toggleAccordion = (key: string) => {
    setExpandedAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 pt-24 pb-8">
      <div className={`container mx-auto px-4 ${!loading && tours.length > 0 ? 'md:pr-80' : ''}`}>
        <Link
          to="/group-tours"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div
          className="rounded-xl p-3 mb-4 border border-white/50 shadow-md"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.5) 100%)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Search results</h2>
          <p className="text-slate-600 text-sm">
            {pickup} → {dropoff} • {date}
          </p>
        </div>

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
          <div className="space-y-4">
            {tours.map((tour) => (
              <div
                key={tour.id}
                data-tour-card
                data-tour-id={tour.id}
                className="rounded-xl bg-white/80 backdrop-blur border border-white/60 shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col">
                  {/* Full-width gallery: main image left + 4-grid right (overflow-hidden here only - not on card, so sticky works) */}
                  {(tour.featured_image_url || (tour.gallery_images?.length ?? 0) > 0) && (
                    <div className="w-full flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2 md:gap-1 md:aspect-[2/1] md:min-h-[260px] md:max-h-[420px] overflow-hidden rounded-t-xl">
                      <div className="relative h-48 md:h-full md:row-span-2 md:col-span-1 bg-slate-200 overflow-hidden">
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
                        {getGalleryImages(tour).length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedImageIndex((prev) => ({
                                  ...prev,
                                  [tour.id]: Math.max(0, (prev[tour.id] ?? 0) - 1),
                                }))
                              }
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
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
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium">
                              {((selectedImageIndex[tour.id] ?? 0) + 1)} / {getGalleryImages(tour).length}
                            </div>
                          </>
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
                      {/* Mobile thumbnails below gallery (desktop uses 4-grid) */}
                      {getGalleryImages(tour).length > 1 && (
                        <div className="md:hidden flex gap-1.5 p-2 overflow-x-auto">
                          {getGalleryImages(tour).map((url, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedImageIndex((prev) => ({ ...prev, [tour.id]: i }))}
                              className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                                (selectedImageIndex[tour.id] ?? 0) === i ? 'border-blue-500' : 'border-transparent'
                              }`}
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Tour details below gallery */}
                  <div className="w-full p-4 sm:p-5 border-t border-slate-100 rounded-b-xl">
                    <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                      <div className="flex-1 min-w-0">
                        {/* Tour title - large & prominent */}
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 leading-tight flex items-center gap-2">
                          <MapPin className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 shrink-0" />
                          {tour.title?.trim() || `${tour.pickup_location} → ${tour.dropoff_location}`}
                        </h2>
                        {tour.title?.trim() && (
                          <p className="text-sm text-slate-600 mt-1">{tour.pickup_location} → {tour.dropoff_location}</p>
                        )}
                        {/* Journey Date, Seats Availability & Starting Location & Time */}
                        <div className="mt-4 space-y-2">
                          <p className="flex items-center gap-2 text-slate-600 text-sm">
                            <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                            <span>Journey Date: {tour.travel_date}</span>
                          </p>
                          <p className="flex items-center gap-2 text-slate-600 text-sm">
                            <Users className="h-4 w-4 text-slate-500 shrink-0" />
                            <span>Seats Availability: {tour.available_seats} seats available</span>
                          </p>
                          {((tour as any).first_boarding_point_name || (tour as any).first_boarding_time) && (
                            <p className="flex items-center gap-2 text-slate-600 text-sm">
                              <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                              <span>Starting Location & Time: {(tour as any).first_boarding_point_name || 'Boarding'}{(tour as any).first_boarding_time ? ` • ${(tour as any).first_boarding_time}` : ''}</span>
                            </p>
                          )}
                        </div>
                        {/* Inclusions summary - Transfer, Sightseeing, Pickup, Drop (2x2 layout) */}
                        <div className="mt-5 pt-5 border-t border-slate-100">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                            <div className="flex items-center gap-3">
                              <Car className="h-5 w-5 text-slate-600 shrink-0" />
                              <span className="text-sm text-slate-600">Transfer Included</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Camera className="h-5 w-5 text-slate-600 shrink-0" />
                              <span className="text-sm text-slate-600">Sightseeing Included</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <MapPin className="h-5 w-5 text-slate-600 shrink-0" />
                              <span className="text-sm text-slate-600">Pickup Included</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Flag className="h-5 w-5 text-slate-600 shrink-0" />
                              <span className="text-sm text-slate-600">Drop Included</span>
                            </div>
                          </div>
                        </div>
                        {/* Itinerary - accordion on mobile, expanded on desktop */}
                        {(tour.itinerary?.length ?? 0) > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1.5">Itinerary</p>
                            <div className="space-y-1.5">
                              {tour.itinerary?.map((item, i) => {
                                const key = `${tour.id}-${i}`;
                                const expanded = expandedItinerary[key];
                                return (
                                  <div
                                    key={i}
                                    className="rounded-md bg-slate-50 border border-slate-100 p-2.5"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleItineraryDay(tour.id, i)}
                                      className="w-full flex items-center gap-3 text-left md:cursor-default"
                                    >
                                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-700/90 text-white text-xs font-bold">
                                        DAY {item.day}
                                      </span>
                                      <span className="flex-1 text-sm font-medium text-slate-800">{item.title}</span>
                                      <span className="md:hidden shrink-0">
                                        {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                      </span>
                                    </button>
                                    {item.description && (
                                      <p className={`mt-2 ml-0 md:ml-14 text-sm text-slate-600 ${expanded ? 'block' : 'hidden md:block'}`}>{item.description}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* Package highlights - expanded on desktop, accordion on mobile */}
                        {(tour.highlights?.length ?? 0) > 0 && (
                          <div className="mt-3 rounded-md border border-slate-200 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleAccordion(`highlights-${tour.id}`)}
                              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 md:hover:bg-slate-50 transition-colors text-left md:pointer-events-none"
                            >
                              <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">Package highlights</span>
                              <span className="md:hidden shrink-0">
                                {expandedAccordions[`highlights-${tour.id}`] === true ? (
                                  <ChevronUp className="h-4 w-4 text-slate-500" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-500" />
                                )}
                              </span>
                            </button>
                            <div className={`px-3 py-2.5 bg-white border-t border-slate-100 ${expandedAccordions[`highlights-${tour.id}`] === true ? 'block' : 'hidden md:block'}`}>
                              <ul className="space-y-1">
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
                            </div>
                          </div>
                        )}
                        {/* What's inside the package - expanded on desktop, accordion on mobile */}
                        {((tour.inclusions?.length ?? 0) > 0 || (tour.exclusions?.length ?? 0) > 0) && (
                          <div className="mt-3 rounded-md border border-slate-200 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleAccordion(`package-${tour.id}`)}
                              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 md:hover:bg-slate-50 transition-colors text-left md:pointer-events-none"
                            >
                              <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">What&apos;s inside the package?</span>
                              <span className="md:hidden shrink-0">
                                {expandedAccordions[`package-${tour.id}`] === true ? (
                                  <ChevronUp className="h-4 w-4 text-slate-500" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-500" />
                                )}
                              </span>
                            </button>
                            <div className={`px-3 py-2.5 bg-white border-t border-slate-100 ${expandedAccordions[`package-${tour.id}`] === true ? 'block' : 'hidden md:block'}`}>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(tour.inclusions?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="text-sm font-bold text-slate-800 mb-2">Inclusions</p>
                                    <ul className="space-y-1.5">
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
                                    <p className="text-sm font-bold text-slate-800 mb-2">Exclusions</p>
                                    <ul className="space-y-1.5">
                                      {tour.exclusions?.map((exc, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                          <X className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                          {exc}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Rate card - inline on mobile/tablet; fixed card on desktop (md+) */}
                      <div className="flex flex-col sm:flex-row md:hidden items-stretch sm:items-center justify-between gap-2 sm:gap-3 shrink-0 mt-4 pt-4 border-t border-slate-100 sm:border-t-0 sm:mt-0 sm:pt-0">
                        <p className="text-xl font-bold text-blue-700">
                          Starting from ₹{(tour.price_from ?? tour.price_per_seat).toLocaleString('en-IN')}
                          <span className="font-normal text-sm text-slate-500 ml-1">per seat</span>
                        </p>
                        <Button
                          onClick={() => handleSelectTour(tour)}
                          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto md:w-full"
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
