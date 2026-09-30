import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Button } from "@/components/ui/button";
import { TourPickupSearchWidget } from "@/components/tour/TourPickupSearchWidget";
import { BookingPaymentFooter } from "@/components/BookingPaymentFooter";
import { useToast } from "@/components/ui/use-toast";
import { Location } from "@/lib/locationData";
import { isWithinTourPickupRadius } from "@/lib/locationUtils";
import { coerceTripDate, dateTimeMinuteKey, addCalendarDaysKeepingTime, tourStayDays } from "@/lib/dateUtils";
import { minTourStartInstant } from "@/lib/tourScheduleTimes";
import { ChevronUp, ChevronDown, Edit2, AlertTriangle } from "lucide-react";
import { MobileNavigation } from "@/components/MobileNavigation";
import { TourListItem } from "@/types/tour";
import { tourDetailAPI } from "@/services/api/tourDetailAPI";
import { getTourUrl } from '@/utils/tourUrlUtils';
import { TourCard } from "@/components/tour/TourCard";
import { TourCatalogCard } from "@/components/tour/TourCatalogCard";
import { ToursCatalogView } from "@/components/tour/ToursCatalogView";
import { TourVehicleSelection } from "@/components/tour/TourVehicleSelection";
import { filterToursByCartIds, readTourCart, readTourCartCheckout, readTourCartPreferredVehicle, readTourCartTripExtras, removeTourFromCart, vehicleMatchesPreferred, writeTourCartCheckout, writeTourCartPreferredVehicle } from "@/lib/addTourToBookingWidget";
import { tourPriceForVehicle } from "@/lib/tourVehiclePrice";
import { resetPageScroll, smoothScrollToElement } from "@/lib/bookingWidgetScroll";
import { CabType } from "@/types/cab";
import { getVehicleData } from "@/services/vehicleDataService";
import {
  formatDepartureForTrack,
  SESSION_GUEST_TRACK_PHONE_KEY,
  trackGuestSearch,
  buildGuestSearchSummaryUrl,
} from "@/services/trackSearchAPI";
import { buildTourCartFareLinesForGuestTrack } from "@/lib/guestSearchFareLines";
import Footer from "@/components/Footer";
import { Helmet } from 'react-helmet-async';

type VehicleWithPricing = CabType & { price: number };

function staggeredTourDates(
  tours: Array<{ tourId: string; days?: number }>,
  start: Date
): Record<string, Date> {
  const next: Record<string, Date> = {};
  let cursor = start;
  for (const tour of tours) {
    next[tour.tourId] = new Date(cursor.getTime());
    cursor = addCalendarDaysKeepingTime(cursor, tourStayDays(tour.days));
  }
  return next;
}

function collidingTourDateIds(
  tours: Array<{ tourId: string }>,
  dates: Record<string, Date>,
  fallback?: Date
): Set<string> {
  const counts = new Map<string, string[]>();
  for (const tour of tours) {
    const key = dateTimeMinuteKey(dates[tour.tourId] ?? fallback);
    const ids = counts.get(key) || [];
    ids.push(tour.tourId);
    counts.set(key, ids);
  }
  const colliding = new Set<string>();
  for (const ids of counts.values()) {
    if (ids.length > 1) {
      ids.forEach((id) => colliding.add(id));
    }
  }
  return colliding;
}

const ToursPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const locationState = location.state as {
    pickupLocation?: Location;
    pickupDate?: Date;
    tourNotFound?: string;
    cartTourIds?: string[];
    proceedCheckout?: boolean;
    preferredVehicleId?: string;
    preferredVehicleName?: string;
  } | null;
  const cartTourIds = locationState?.cartTourIds ?? [];
  const isCartSearch = cartTourIds.length > 0;
  const isPickupStep = Boolean(locationState?.proceedCheckout) && isCartSearch;
  const cartTourKey = cartTourIds.join('|');
  
  const [pickupLocation, setPickupLocation] = useState<Location | null>(
    locationState?.pickupLocation || null
  );
  const [pickupDate, setPickupDate] = useState<Date | undefined>(() => {
    const fromNav = coerceTripDate(locationState?.pickupDate);
    if (fromNav) return fromNav;
    try {
      const raw = sessionStorage.getItem('pickupDate');
      if (!raw) return undefined;
      return coerceTripDate(JSON.parse(raw));
    } catch {
      return undefined;
    }
  });
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchInitiated, setSearchInitiated] = useState<boolean>(false);
  const [tours, setTours] = useState<TourListItem[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState<boolean>(false);
  const [showSearchForm, setShowSearchForm] = useState<boolean>(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [vehiclesByTourId, setVehiclesByTourId] = useState<Record<string, VehicleWithPricing>>({});
  const [datesByTourId, setDatesByTourId] = useState<Record<string, Date>>({});
  const [excludedTourIds, setExcludedTourIds] = useState<string[]>([]);
  const [isEditingPickup, setIsEditingPickup] = useState(false);
  const [tourPaymentMode, setTourPaymentMode] = useState<'partial' | 'full'>(() => {
    try {
      const stored = sessionStorage.getItem('paymentMode');
      return stored === 'full' ? 'full' : 'partial';
    } catch {
      return 'partial';
    }
  });
  const [fareSheetOpen, setFareSheetOpen] = useState(false);
  const tourPaybarRef = useRef<HTMLDivElement | null>(null);

  const persistTourPaymentMode = (mode: 'partial' | 'full') => {
    setTourPaymentMode(mode);
    try {
      sessionStorage.setItem('paymentMode', mode);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!locationState?.tourNotFound) return;

    toast({
      title: 'Tour not available',
      description: `${locationState.tourNotFound} is not available right now. Please choose from our active packages below.`,
      variant: 'destructive',
    });

    navigate('/tours', {
      replace: true,
      state: {
        pickupLocation: locationState?.pickupLocation,
        pickupDate: locationState?.pickupDate,
        cartTourIds: locationState?.cartTourIds,
      },
    });
  }, [locationState?.pickupLocation, locationState?.pickupDate, locationState?.tourNotFound, navigate, toast]);
  
  const handleSearchTours = useCallback(async () => {
    if (!pickupLocation) {
      toast({
        title: "No pickup location",
        description: "Please enter your pickup location",
        variant: "destructive",
      });
      return;
    }
    
    if (!isWithinTourPickupRadius(pickupLocation)) {
      toast({
        title: "Pickup too far for tours",
        description: "Tour pickup must be within 20 km of Vizag Taxi Hub. Please choose a closer location.",
        variant: "destructive",
      });
      return;
    }
    
    if (!pickupDate) {
      toast({
        title: "No date selected",
        description: "Please select a date for your tour",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    setIsLoadingTours(true);
    setSearchInitiated(true);
    setShowSearchForm(false);
    setIsSearchActive(true);
    resetPageScroll();
    requestAnimationFrame(() => {
      resetPageScroll();
    });
    
    try {
      const toursList = await tourDetailAPI.getTours();
      const scopedIds = locationState?.cartTourIds ?? [];
      const sessionCart = readTourCart();
      let scoped =
        scopedIds.length > 0 ? filterToursByCartIds(toursList, scopedIds, sessionCart) : toursList;
      if (scopedIds.length > 0 && scoped.length === 0 && sessionCart.length > 0) {
        scoped = filterToursByCartIds(
          toursList,
          sessionCart.map((item) => item.tourId),
          sessionCart
        );
      }
      setTours(scoped);
      if (scopedIds.length > 0 && scoped[0]) {
        const snapshot = readTourCartCheckout();
        const snapshotMatches =
          snapshot &&
          snapshot.cartTourIds.join('|') === scopedIds.join('|');
        const fallbackDate = coerceTripDate(pickupDate);
        const preferred =
          readTourCartPreferredVehicle() ||
          (locationState?.preferredVehicleId
            ? {
                id: locationState.preferredVehicleId,
                name: locationState.preferredVehicleName,
              }
            : null);
        const fleet = ((await getVehicleData(false, false).catch(() => [])) as CabType[]) || [];
        const preferredVehicle =
          (preferred &&
            fleet.find((vehicle) => vehicleMatchesPreferred(vehicle, preferred))) ||
          (preferred
            ? ({
                id: preferred.id,
                vehicleId: preferred.id,
                name: preferred.name || preferred.id,
              } as CabType)
            : null);
        setActiveTourId((current) => {
          if (current && scoped.some((tour) => tour.tourId === current)) return current;
          if (snapshotMatches && scoped.some((tour) => tour.tourId === snapshot.activeTourId)) {
            return snapshot.activeTourId;
          }
          return scoped[0].tourId;
        });
        setVehiclesByTourId((current) => {
          const pricedFromVehicle = (vehicle: CabType): Record<string, VehicleWithPricing> => {
            const next: Record<string, VehicleWithPricing> = {};
            for (const tour of scoped) {
              const price = tourPriceForVehicle(tour.pricing, vehicle);
              if (price > 0) {
                next[tour.tourId] = { ...vehicle, price };
              }
            }
            return next;
          };
          if (preferredVehicle) {
            const next = pricedFromVehicle(preferredVehicle);
            if (Object.keys(next).length > 0) return next;
          }
          const sample = Object.values(current)[0];
          if (sample) {
            const next = pricedFromVehicle(sample);
            return Object.keys(next).length > 0 ? next : current;
          }
          if (snapshotMatches && snapshot.vehiclesByTourId) {
            return snapshot.vehiclesByTourId as Record<string, VehicleWithPricing>;
          }
          return {};
        });
        setDatesByTourId((current) => {
          const fallback = fallbackDate;
          if (Object.keys(current).length > 0) {
            const next = { ...current };
            for (const tour of scoped) {
              if (!next[tour.tourId]) next[tour.tourId] = fallback;
            }
            if (collidingTourDateIds(scoped, next, fallback).size > 0) {
              return staggeredTourDates(scoped, fallback);
            }
            return next;
          }
          if (snapshotMatches && snapshot.datesByTourId) {
            const restored = Object.fromEntries(
              scoped.map((tour) => [
                tour.tourId,
                coerceTripDate(snapshot.datesByTourId[tour.tourId], fallback),
              ])
            );
            if (collidingTourDateIds(scoped, restored, fallback).size > 0) {
              return staggeredTourDates(scoped, fallback);
            }
            return restored;
          }
          return staggeredTourDates(scoped, fallback);
        });

        let guestPhone = '';
        try {
          guestPhone = sessionStorage.getItem(SESSION_GUEST_TRACK_PHONE_KEY)?.trim() || '';
        } catch {
          guestPhone = '';
        }
        if (guestPhone) {
          const drop = scoped.map((tour) => tour.tourName).join(' + ');
          const distanceKm = scoped.reduce((sum, tour) => {
            const km = Number(tour.distance);
            return sum + (Number.isFinite(km) && km > 0 ? km : 0);
          }, 0);
          const vehicleFares =
            fleet.length > 0 ? buildTourCartFareLinesForGuestTrack(fleet, scoped) : [];
          const preferredFare = preferredVehicle
            ? vehicleFares.find((line) =>
                vehicleMatchesPreferred(
                  { name: line.name },
                  preferred
                )
              )
            : null;
          const carsShown =
            vehicleFares.length > 0
              ? vehicleFares.map((line) => `${line.name}: ${line.fareText}`)
              : preferredVehicle
                ? [
                    `${preferredVehicle.name}: ${
                      preferredFare?.fareText || 'Quote ready'
                    }`,
                  ]
                : [];
          const tourSummaryUrl = buildGuestSearchSummaryUrl({
            tripType: 'tour',
            pickup: pickupLocation,
            pickupDate: coerceTripDate(pickupDate),
            tourHref: '/tours',
          });
          trackGuestSearch({
            guestPhone,
            pickup: pickupLocation.name,
            drop,
            tripType:
              scoped.length > 1 ? `Tour · ${scoped.length} packages` : 'Tour',
            departure: formatDepartureForTrack(coerceTripDate(pickupDate)),
            distanceKmOneWay: distanceKm > 0 ? Math.round(distanceKm) : undefined,
            carsShown,
            vehicleFares: vehicleFares.length > 0 ? vehicleFares : undefined,
            searchSummaryUrl: tourSummaryUrl,
          });
        }
      } else {
        setActiveTourId(null);
        setVehiclesByTourId({});
        setDatesByTourId({});
      }
      
      if (!toursList.length) {
        toast({
          title: "No tours available",
          description: "We couldn't find any tours available for your selected date",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading tours:", error);
      setTours([]);
      toast({
        title: "Error loading tours",
        description: "We encountered an error while loading tours. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTours(false);
      setIsSearching(false);
      resetPageScroll();
      requestAnimationFrame(() => {
        resetPageScroll();
      });
    }
  }, [pickupLocation, pickupDate, cartTourKey]);

  const navPickupKey =
    locationState?.pickupLocation?.id || locationState?.pickupLocation?.name || '';
  const navDateKey = locationState?.pickupDate
    ? coerceTripDate(locationState.pickupDate).toISOString()
    : '';

  // Load tours when arriving with pickup + date — never auto-search the pickup step
  useEffect(() => {
    if (!isCartSearch) return;
    if (!pickupLocation || !pickupDate) return;
    if (locationState?.proceedCheckout && !searchInitiated) return;
    void handleSearchTours();
  }, [isCartSearch, navPickupKey, navDateKey, cartTourKey, handleSearchTours]);

  useEffect(() => {
    if (isCartSearch) return;
    let cancelled = false;
    setIsLoadingTours(true);
    tourDetailAPI
      .getTours()
      .then((list) => {
        if (!cancelled) setTours(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setTours([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTours(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCartSearch]);

  useEffect(() => {
    if (!locationState?.proceedCheckout || !isCartSearch) return;
    setSearchInitiated(false);
    setShowSearchForm(true);
    setIsSearchActive(false);
    const timer = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.getElementById('tour-checkout-pickup')?.focus({ preventScroll: true });
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [locationState?.proceedCheckout, cartTourKey, isCartSearch]);

  const handleTourSelect = (tour: TourListItem) => {
    if (isCartSearch) {
      setActiveTourId(tour.tourId);
      return;
    }
    navigate(getTourUrl({ tourId: tour.tourId, tourName: tour.tourName }), {
      state: { pickupLocation, pickupDate }
    });
  };

  const includedTours = useMemo(
    () => tours.filter((tour) => !excludedTourIds.includes(tour.tourId)),
    [tours, excludedTourIds]
  );
  const activeTour = tours.find((tour) => tour.tourId === activeTourId) ?? null;
  const selectedVehicle =
    (activeTour && vehiclesByTourId[activeTour.tourId]) ||
    includedTours.map((tour) => vehiclesByTourId[tour.tourId]).find((vehicle) => Boolean(vehicle)) ||
    null;
  const dateForTour = (tourId: string) => coerceTripDate(datesByTourId[tourId] ?? pickupDate);
  const activeTourDate = activeTour ? dateForTour(activeTour.tourId) : pickupDate;
  const collidingDateIds = useMemo(
    () => collidingTourDateIds(includedTours, datesByTourId, pickupDate),
    [includedTours, datesByTourId, pickupDate]
  );
  const hasCollidingTourDates = collidingDateIds.size > 0;
  const tripExtras = readTourCartTripExtras();
  const airportTransfers = tripExtras?.airportTransfers || [];
  const airportExtra = Number(tripExtras?.additionalAirportFare) > 0
    ? Number(tripExtras?.additionalAirportFare)
    : airportTransfers.reduce((sum, transfer) => sum + (Number(transfer.fare) > 0 ? Number(transfer.fare) : 0), 0);
  const minTourDate = minTourStartInstant(airportTransfers);

  useEffect(() => {
    const fromAirport = airportTransfers.some((transfer) => transfer.direction === 'from-airport');
    if (!fromAirport || includedTours.length === 0) return;
    const needsShift = includedTours.some((tour) => {
      const date = datesByTourId[tour.tourId] ?? pickupDate;
      return !date || date.getTime() < minTourDate.getTime();
    });
    if (!needsShift && pickupDate && pickupDate.getTime() >= minTourDate.getTime()) return;
    const nextDates = staggeredTourDates(includedTours, minTourDate);
    setDatesByTourId(nextDates);
    setPickupDate(minTourDate);
    try {
      sessionStorage.setItem('pickupDate', JSON.stringify(minTourDate));
    } catch {
      /* ignore */
    }
  }, [airportTransfers, includedTours, minTourDate.getTime()]);

  const handleTourDateChange = (tourId: string, date: Date | undefined) => {
    if (!date) return;
    const nextDate = date.getTime() < minTourDate.getTime() ? minTourDate : date;
    if (nextDate.getTime() !== date.getTime()) {
      toast({
        title: "Tour date updated",
        description: "Tour cannot start before the airport pickup.",
      });
    }
    const nextDates = { ...datesByTourId, [tourId]: nextDate };
    const colliding = collidingTourDateIds(includedTours, nextDates, pickupDate);
    if (colliding.has(tourId)) {
      toast({
        title: "Same date & time",
        description: "Another selected tour already uses this slot. Pick a different date or time.",
        variant: "destructive",
      });
    }
    setDatesByTourId(nextDates);
    setActiveTourId(tourId);
  };

  const handlePickupLocationChange = (loc: Location | null) => {
    if (!loc) return;
    if (!isWithinTourPickupRadius(loc)) {
      toast({
        title: "Pickup too far for tours",
        description: "Tour pickup must be within 20 km of Vizag Taxi Hub. Please choose a closer location.",
        variant: "destructive",
      });
      return;
    }
    setPickupLocation({ ...loc, name: loc.name, isInVizag: loc.isInVizag !== false });
    setIsEditingPickup(false);
    try {
      sessionStorage.setItem('pickupLocation', JSON.stringify(loc));
    } catch {
      /* ignore */
    }
  };

  const handleVehicleSelect = (vehicle: VehicleWithPricing) => {
    writeTourCartPreferredVehicle({
      id: vehicle.id || vehicle.vehicleId || vehicle.name,
      name: vehicle.name,
    });
    setVehiclesByTourId(() => {
      const next: Record<string, VehicleWithPricing> = {};
      for (const tour of includedTours) {
        const price = tourPriceForVehicle(tour.pricing, vehicle);
        if (price > 0) {
          next[tour.tourId] = { ...vehicle, price };
        }
      }
      return next;
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!window.matchMedia('(min-width: 1024px)').matches) {
          setFareSheetOpen(true);
          return;
        }
        const fare = document.getElementById('tour-combined-fare');
        if (!fare) return;
        smoothScrollToElement(fare, 136);
      });
    });
  };

  const cartFareLines = useMemo(
    () =>
      includedTours.map((tour) => {
        const vehicle = vehiclesByTourId[tour.tourId];
        return {
          tourId: tour.tourId,
          tourName: tour.tourName,
          vehicleName: vehicle?.name ?? null,
          date: coerceTripDate(datesByTourId[tour.tourId] ?? pickupDate),
          price: vehicle?.price ?? 0,
          distance: tour.distance,
        };
      }),
    [includedTours, vehiclesByTourId, datesByTourId, pickupDate]
  );
  const combinedTotal = cartFareLines.reduce((sum, line) => sum + line.price, 0) + airportExtra;
  const pricedTourCount = cartFareLines.filter((line) => line.price > 0).length;
  const showTourPaybar =
    isCartSearch && searchInitiated && Boolean(selectedVehicle) && combinedTotal > 0;

  useLayoutEffect(() => {
    document.documentElement.dataset.vthBookingUi = 'results';
    return () => {
      delete document.documentElement.dataset.vthBookingUi;
    };
  }, []);

  useLayoutEffect(() => {
    if (!showTourPaybar) {
      document.documentElement.style.setProperty('--vth-chat-clearance', '0px');
      return;
    }
    const el = tourPaybarRef.current;
    if (!el) {
      document.documentElement.style.setProperty('--vth-chat-clearance', '0px');
      return;
    }
    const publish = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--vth-chat-clearance', `${Math.max(0, h)}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty('--vth-chat-clearance', '0px');
    };
  }, [showTourPaybar, combinedTotal, tourPaymentMode, cartFareLines.length, fareSheetOpen]);

  const handleEditTourSelection = () => {
    setFareSheetOpen(false);
    const editor = document.getElementById('tour-cart-editor');
    if (editor) {
      editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    handleModifySearch();
  };

  const handleContinueWithVehicle = () => {
    if (hasCollidingTourDates) {
      toast({
        title: "Tours share the same date & time",
        description: "Change one tour date so each package starts at a different time.",
        variant: "destructive",
      });
      return;
    }
    const checkoutTour =
      includedTours.find((tour) => tour.tourId === activeTourId) ?? includedTours[0];
    if (!checkoutTour) {
      toast({
        title: "Select a tour",
        description: "Tap Select now on at least one tour to continue.",
        variant: "destructive",
      });
      return;
    }
    const vehicle = vehiclesByTourId[checkoutTour.tourId];
    if (!vehicle) {
      toast({
        title: "Choose a vehicle",
        description: "Select a vehicle for this tour, then continue.",
        variant: "destructive",
      });
      return;
    }
    if (pickupLocation) {
      writeTourCartCheckout({
        pickupLocation,
        cartTourIds: includedTours.map((tour) => tour.tourId),
        activeTourId: checkoutTour.tourId,
        lines: cartFareLines.map((line) => ({
          tourId: line.tourId,
          tourName: line.tourName,
          dateIso: coerceTripDate(line.date).toISOString(),
          vehicleName: line.vehicleName,
          price: line.price,
          distance: line.distance,
        })),
        datesByTourId: Object.fromEntries(
          Object.entries(datesByTourId).map(([id, date]) => [id, coerceTripDate(date).toISOString()])
        ),
        vehiclesByTourId,
        additionalAirportFare: airportExtra,
        airportTransfers,
      });
    }
    navigate(
      `${getTourUrl({ tourId: checkoutTour.tourId, tourName: checkoutTour.tourName })}?step=guest`,
      {
        state: {
          pickupLocation,
          pickupDate: dateForTour(checkoutTour.tourId),
          selectedVehicle: vehicle,
          openGuestForm: true,
          tourId: checkoutTour.tourId,
          cartTourIds: includedTours.map((tour) => tour.tourId),
        },
      },
    );
  };

  const handleModifySearch = () => {
    setShowSearchForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShowAllPackages = () => {
    setShowSearchForm(false);
    setActiveTourId(null);
    setVehiclesByTourId({});
    setDatesByTourId({});
    setExcludedTourIds([]);
    navigate('/tours', {
      replace: true,
      state: { pickupLocation, pickupDate },
    });
  };

  const handleRemoveSelectedTour = (tour: TourListItem) => {
    const nextIds = cartTourIds.filter((id) => id !== tour.tourId);
    removeTourFromCart(tour.tourId, tour.tourName);
    setTours((current) => current.filter((item) => item.tourId !== tour.tourId));
    setVehiclesByTourId((current) => {
      const next = { ...current };
      delete next[tour.tourId];
      return next;
    });
    setDatesByTourId((current) => {
      const next = { ...current };
      delete next[tour.tourId];
      return next;
    });
    setExcludedTourIds((current) => current.filter((id) => id !== tour.tourId));
    toast({
      title: `${tour.tourName} removed`,
      description: nextIds.length > 0 ? 'It is no longer in your selected tours.' : 'Showing all tour packages.',
    });
    if (nextIds.length === 0) {
      handleShowAllPackages();
      return;
    }
    setActiveTourId((current) => (current === tour.tourId ? nextIds[0] : current));
    navigate('/tours', {
      replace: true,
      state: {
        pickupLocation,
        pickupDate,
        cartTourIds: nextIds,
      },
    });
  };

  const handleToggleListed = (tour: TourListItem) => {
    const isExcluded = excludedTourIds.includes(tour.tourId);
    if (isExcluded) {
      setExcludedTourIds((current) => current.filter((id) => id !== tour.tourId));
      const sample = selectedVehicle || Object.values(vehiclesByTourId)[0] || null;
      if (sample) {
        const price = tourPriceForVehicle(tour.pricing, sample);
        if (price > 0) {
          setVehiclesByTourId((current) => ({
            ...current,
            [tour.tourId]: { ...sample, price },
          }));
        }
      }
      setActiveTourId(tour.tourId);
      return;
    }
    setExcludedTourIds((current) => [...current, tour.tourId]);
    setVehiclesByTourId((current) => {
      const next = { ...current };
      delete next[tour.tourId];
      return next;
    });
  };

  const handleCloseSearchForm = () => {
    setShowSearchForm(false);
  };

  const buildTourCardProps = (tour: TourListItem) => {
    return {
      ...tour,
      inclusions: (tour as any).inclusions || [],
      sightseeingPlaces: (tour as any).sightseeingPlaces || [],
    };
  };

  const renderSearchForm = () => (
    <TourPickupSearchWidget
      pickupLocation={pickupLocation}
      onPickupLocationChange={setPickupLocation}
      pickupDate={pickupDate}
      onPickupDateChange={setPickupDate}
      isSearching={isSearching}
      onSearch={() => {
        void handleSearchTours();
      }}
      onClearFilters={() => {
        setPickupLocation(null);
        try {
          sessionStorage.removeItem('pickupLocation');
        } catch {
          /* ignore */
        }
      }}
      onShowAllPackages={isCartSearch ? handleShowAllPackages : undefined}
      selectedTourCount={cartTourIds.length}
      submitLabel={isPickupStep || isCartSearch ? 'Find Available Quotes' : 'Search Tours'}
    />
  );

  const combinedFareLines = (
    <ul className="max-h-28 space-y-2 overflow-y-auto sm:max-h-none">
      {cartFareLines.map((line) => (
        <li key={line.tourId} className="flex items-start justify-between gap-3 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-medium text-gray-900">{line.tourName}</span>
            <span className="block text-xs text-gray-500">
              {line.date
                ? line.date.toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Set a date'}
              {line.vehicleName ? ` · ${line.vehicleName}` : ''}
            </span>
          </span>
          <span className="shrink-0 font-semibold text-gray-900">
            {line.price > 0 ? `₹${line.price.toLocaleString('en-IN')}` : '—'}
          </span>
        </li>
      ))}
      {airportTransfers.map((transfer, index) => (
        <li key={`airport-${transfer.direction}-${index}`} className="flex items-start justify-between gap-3 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-medium text-gray-900">
              {transfer.direction === 'from-airport' ? 'Airport pickup' : 'Airport drop'}
            </span>
            <span className="block text-xs text-gray-500">
              {transfer.placeName || 'Vizag airport transfer'}
            </span>
          </span>
          <span className="shrink-0 font-semibold text-gray-900">
            {Number(transfer.fare) > 0 ? `₹${Number(transfer.fare).toLocaleString('en-IN')}` : airportExtra > 0 ? '' : '—'}
          </span>
        </li>
      ))}
      {airportExtra > 0 && airportTransfers.every((transfer) => !(Number(transfer.fare) > 0)) ? (
        <li className="flex items-start justify-between gap-3 text-sm">
          <span className="font-medium text-gray-900">Airport transfers</span>
          <span className="shrink-0 font-semibold text-gray-900">
            ₹{airportExtra.toLocaleString('en-IN')}
          </span>
        </li>
      ) : null}
    </ul>
  );
  
  const renderTourListing = () => (
    <div className={`mb-8 rounded-2xl bg-white p-4 shadow-lg md:p-8 ${showTourPaybar ? 'max-lg:mb-28' : ''}`}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900 md:text-xl">
            {isCartSearch ? `Your selected tours (${tours.length})` : 'Available Tour Packages'}
          </h2>
          {isCartSearch && (
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Tap Selected to leave a tour out, or the X to remove it. Each tour needs its own date and time.
            </p>
          )}
          {hasCollidingTourDates ? (
            <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Two tours cannot start at the same date and time. Change one of the highlighted dates to continue.
            </p>
          ) : null}
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {isCartSearch && (
            <Button
              type="button"
              variant="outline"
              onClick={handleShowAllPackages}
              className="min-w-0 flex-1 rounded-lg border-slate-200 px-4 py-2 font-semibold text-slate-700 sm:flex-none"
            >
              Show all packages
            </Button>
          )}
          <Button 
            onClick={handleModifySearch}
            className="min-w-0 flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 sm:flex-none"
          >
            Modify Search
          </Button>
        </div>
      </div>

      {tours.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="text-6xl mb-4">🏔️</div>
            <h3 className="text-xl font-semibold mb-2">No tours found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
      ) : isCartSearch ? (
        <div className="grid items-start gap-6 lg:grid-cols-12 max-lg:pb-8">
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:col-span-7">
            {tours.map((tour) => (
              <TourCard
                key={tour.tourId}
                tour={buildTourCardProps(tour)}
                selected={tour.tourId === activeTourId}
                listed={!excludedTourIds.includes(tour.tourId)}
                compact
                tourDate={dateForTour(tour.tourId)}
                dateConflict={collidingDateIds.has(tour.tourId)}
                onTourDateChange={(date) => handleTourDateChange(tour.tourId, date)}
                minDate={minTourDate}
                onClick={() => handleTourSelect(tour)}
                onRemove={() => handleRemoveSelectedTour(tour)}
                onToggleListed={() => handleToggleListed(tour)}
              />
            ))}
          </div>
          <aside id="tour-cart-editor" className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:sticky lg:top-24">
              <h3 className="truncate text-sm font-semibold text-gray-900">
                {activeTour ? activeTour.tourName : 'Select a tour'}
              </h3>
              {isEditingPickup ? (
                <div className="mb-3 mt-2 rounded-xl border border-slate-200 bg-white p-2.5">
                  <LocationInput
                    label="PICKUP"
                    placeholder="Enter pickup location"
                    location={pickupLocation || undefined}
                    onLocationChange={handlePickupLocationChange}
                    isPickupLocation={true}
                    tripType="tour"
                    variant="infield"
                  />
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-800"
                    onClick={() => setIsEditingPickup(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="mb-3 mt-1 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Pickup</p>
                    <p className="truncate text-sm font-medium text-gray-900">
                      {pickupLocation?.name || 'Set pickup location'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-blue-600"
                    title="Edit pickup location"
                    aria-label="Edit pickup location"
                    onClick={() => setIsEditingPickup(true)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              {airportTransfers.length > 0 || airportExtra > 0 ? (
                <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                    Airport transfers
                  </p>
                  {airportTransfers.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {airportTransfers.map((transfer, index) => (
                        <li key={`editor-airport-${index}`} className="text-sm text-slate-800">
                          {transfer.direction === 'from-airport' ? 'From airport' : 'To airport'}
                          {transfer.placeName ? ` · ${transfer.placeName}` : ''}
                          {Number(transfer.fare) > 0
                            ? ` · ₹${Number(transfer.fare).toLocaleString('en-IN')}`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      ₹{airportExtra.toLocaleString('en-IN')} extra
                    </p>
                  )}
                </div>
              ) : null}
              <div
                className={`mb-3 rounded-lg border px-2.5 py-1 ${
                  activeTour && collidingDateIds.has(activeTour.tourId)
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-transparent'
                }`}
              >
                <DateTimePicker
                  label="Tour date"
                  date={activeTourDate}
                  onDateChange={(date) => {
                    if (activeTour) handleTourDateChange(activeTour.tourId, date);
                  }}
                  minDate={minTourDate}
                  variant="infield"
                />
                {activeTour && collidingDateIds.has(activeTour.tourId) ? (
                  <p className="px-0.5 pb-1 text-[10px] font-medium text-amber-800">
                    Same date & time as another selected tour.
                  </p>
                ) : null}
              </div>
              {activeTour ? (
                <>
                  <TourVehicleSelection
                    pricing={activeTour.pricing}
                    selectedVehicle={selectedVehicle}
                    onVehicleSelect={handleVehicleSelect}
                    onBookNow={handleContinueWithVehicle}
                    tourDate={activeTourDate}
                    combinePricingFrom={includedTours}
                  />
                  <div
                    id="tour-combined-fare"
                    className="mt-4 hidden scroll-mt-32 rounded-xl border border-slate-200 bg-white p-3 lg:block"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Combined fare
                    </p>
                    {combinedFareLines}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-sm font-semibold text-gray-900">
                        Total{pricedTourCount > 1 ? ` · ${pricedTourCount} tours` : ''}
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        ₹{combinedTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="mt-3">
                      <BookingPaymentFooter
                        finalTotal={combinedTotal}
                        mode={tourPaymentMode}
                        onModeChange={persistTourPaymentMode}
                        onBookNow={handleContinueWithVehicle}
                        disabled={!selectedVehicle || includedTours.length === 0 || combinedTotal <= 0}
                        disclaimerVariant="muted"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Tap a package on the left to choose its vehicle.</p>
              )}
            </div>
          </aside>
        </div>
      ) : (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCatalogCard key={tour.tourId} tour={tour} />
          ))}
      </div>
      )}
    </div>
  );
  
  return (
    <>
      <Helmet>
        <title>Tour Packages - Vizag Taxi Hub | Best Tour Packages in Visakhapatnam</title>
        <meta name="description" content="Discover exciting tour packages from Visakhapatnam to Araku Valley, Simhachalam, Borra Caves, and more. Book guided tours, sightseeing trips, and holiday packages with professional drivers. Customizable tour packages with best prices." />
        <meta name="keywords" content="tour packages vizag, sightseeing visakhapatnam, holiday packages, guided tours vizag, tourist places around vizag, travel packages" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/tours" />
        <meta property="og:title" content="Tour Packages - Vizag Taxi Hub | Best Tour Packages in Visakhapatnam" />
        <meta property="og:description" content="Explore amazing tour packages in and around Visakhapatnam. Book guided tours, sightseeing trips, and holiday packages with Vizag Taxi Hub." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/tours" />
        <meta property="twitter:title" content="Tour Packages - Vizag Taxi Hub | Best Tour Packages in Visakhapatnam" />
        <meta property="twitter:description" content="Explore amazing tour packages in and around Visakhapatnam. Book guided tours and sightseeing trips." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://vizagtaxihub.com/tours" />
      </Helmet>
      
      <div className="flex min-h-screen max-w-[100%] flex-col overflow-x-clip bg-white">
        <Navbar />
        <main className="min-w-0 flex-1 overflow-x-clip">
          {isCartSearch ? (
            <section
              id="tour-results"
              className={`bg-gray-50 ${showTourPaybar ? 'pb-8 lg:pb-16' : 'pb-16'} pt-4 md:pt-5`}
            >
              <div className="mx-auto max-w-7xl px-4 md:px-6">
                {(!searchInitiated || showSearchForm) && (
                  <div className="mb-6">{renderSearchForm()}</div>
                )}
                {searchInitiated ? renderTourListing() : null}
              </div>
            </section>
          ) : (
            <ToursCatalogView tours={tours} loading={isLoadingTours} />
          )}
        </main>
        {showTourPaybar && (
          <div className="fixed inset-x-0 bottom-0 z-[60] max-lg:bottom-16 lg:hidden">
            <div
              ref={tourPaybarRef}
              className="border-t border-gray-200 bg-white px-3 pt-1.5 pb-2 shadow-[0_-8px_30px_rgba(15,23,42,0.12)]"
            >
              <div className="mb-1.5 flex items-center gap-1">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
                  aria-expanded={fareSheetOpen}
                  onClick={() => setFareSheetOpen((open) => !open)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Combined fare
                      {pricedTourCount > 1 ? ` · ${pricedTourCount} tours` : ''}
                    </span>
                    <span className="text-base font-bold text-blue-600">
                      ₹{combinedTotal.toLocaleString('en-IN')}
                    </span>
                  </span>
                  {fareSheetOpen ? (
                    <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                  ) : (
                    <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                  title="Edit tours, pickup, or vehicle"
                  aria-label="Edit tours, pickup, or vehicle"
                  onClick={handleEditTourSelection}
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
              {fareSheetOpen ? (
                <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  {combinedFareLines}
                  <p className="mt-2 text-[11px] leading-snug text-gray-500">
                    Pay 30% now to reserve, rest to driver. Toll and parking as per actual.
                  </p>
                </div>
              ) : null}
              <BookingPaymentFooter
                finalTotal={combinedTotal}
                mode={tourPaymentMode}
                onModeChange={persistTourPaymentMode}
                onBookNow={handleContinueWithVehicle}
                disabled={!selectedVehicle || includedTours.length === 0 || combinedTotal <= 0}
                disclaimerVariant="none"
              />
            </div>
          </div>
        )}
        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
};

export default ToursPage;
