import { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, IndianRupee, MapPin, Plane, Plus, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { DateTimePicker, type DateTimePickerHandle } from '@/components/DateTimePicker';
import { LocationInput } from '@/components/LocationInput';
import type { TourQuoteAirportTransfer } from '@/components/pdf/TourCartQuotationPDF';
import { calculateDistanceMatrix } from '@/lib/distanceService';
import { isAirportTransferOtherEnd, isVizagAirportLocation } from '@/lib/inferTripService';
import { getVizagAirportLocations, type Location } from '@/lib/locationData';
import { isSelectedMapLocation } from '@/lib/locationUtils';
import { cn } from '@/lib/utils';
import { earliestPickupInstant, planInstant, separateAirportAndTrip, type PlanWhen } from '@/lib/tourScheduleTimes';
import { getAirportFaresForVehicle } from '@/services/fareService';
import type { AirportFare, CabType } from '@/types/cab';
import { normalizeVehicleId } from '@/utils/safeStringUtils';

type AirportDirection = 'from-airport' | 'to-airport';

type AirportTransferLeg = {
  id: string;
  direction: AirportDirection;
  place?: Location;
  pickupDate: string;
  pickupTime: string;
  distanceKm: number;
  fare: number;
};

const airportLocations = getVizagAirportLocations();
const airportLocation =
  airportLocations.find((location) => location.id === 'vizag_airport') ?? airportLocations[0];

function shiftIsoDate(iso: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const date = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function tripEndDate(start: string, dayCount: number): string {
  return shiftIsoDate(start, Math.max(0, dayCount - 1));
}

/** True when the transfer falls on a day after the tour starts and before it ends. */
function isInsideTourDates(iso: string, start: string, dayCount: number): boolean {
  if (dayCount <= 1 || !/^\d{4}-\d{2}-\d{2}$/.test(iso) || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return false;
  }
  const startMs = new Date(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8, 10))).getTime();
  const endMs = new Date(
    Number(start.slice(0, 4)),
    Number(start.slice(5, 7)) - 1,
    Number(start.slice(8, 10)) + dayCount - 1
  ).getTime();
  const whenMs = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).getTime();
  return whenMs > startMs && whenMs < endMs;
}

function edgeDate(direction: AirportDirection, start: string, dayCount: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return '';
  return direction === 'to-airport' ? tripEndDate(start, dayCount) : start;
}

function newLeg(
  direction: AirportDirection,
  startDate: string,
  startTime: string,
  dayCount: number
): { leg: AirportTransferLeg; trip: PlanWhen } {
  const pickupDate = edgeDate(direction, startDate, dayCount);
  const separated = separateAirportAndTrip({
    direction,
    airport: { pickupDate, pickupTime: startTime },
    trip: { pickupDate: startDate, pickupTime: startTime },
    prefer: 'trip',
  });
  return {
    leg: {
      id: `airport-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      direction,
      pickupDate: separated.airport.pickupDate || pickupDate,
      pickupTime: separated.airport.pickupTime,
      distanceKm: 0,
      fare: 0,
    },
    trip: separated.trip,
  };
}

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Airport total shown on the booking widget vehicle card.
 * Same tiers as `useFare` (10 / 20 / 30 / 40 km) plus CabList's base + extra km.
 */
function bookingWidgetAirportFare(
  airportFares: AirportFare | null,
  vehicleId: string,
  distance: number
): number {
  if (distance <= 0) return 0;

  const normalizedCabId = normalizeVehicleId(vehicleId);
  let extraKmCharge = airportFares?.extraKmCharge;
  if (!extraKmCharge || Number.isNaN(extraKmCharge)) {
    extraKmCharge = normalizedCabId.includes('ertiga') ? 18 : 14;
  }

  let basePrice = 0;
  let extraDistanceFare = 0;
  if (distance <= 10) {
    basePrice = airportFares?.tier1Price || 1200;
  } else if (distance <= 20) {
    basePrice = airportFares?.tier2Price || 1800;
  } else if (distance <= 30) {
    basePrice = airportFares?.tier3Price || 2400;
  } else if (distance <= 40) {
    basePrice = airportFares?.tier4Price || 1500;
  } else {
    basePrice = airportFares?.tier4Price || 1500;
    extraDistanceFare = (distance - 40) * extraKmCharge;
  }

  const airportFee =
    typeof airportFares?.airportFee === 'number' && airportFares.airportFee > 0
      ? airportFares.airportFee
      : 0;
  return basePrice + airportFee + extraDistanceFare;
}

type TourAdditionalAirportTransfersProps = {
  vehicle: CabType | null;
  tripStartDate: string;
  tripStartTime: string;
  tripDayCount: number;
  initialTransfers?: TourQuoteAirportTransfer[];
  onFareChange: (fare: number) => void;
  onTransfersChange?: (transfers: TourQuoteAirportTransfer[]) => void;
  onTripScheduleChange?: (when: PlanWhen) => void;
};

const WHEN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dateFromFields(pickupDate: string, pickupTime: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) return undefined;
  const [year, month, day] = pickupDate.split('-').map(Number);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(pickupTime);
  const date = new Date(
    year,
    month - 1,
    day,
    timeMatch ? Number(timeMatch[1]) : 0,
    timeMatch ? Number(timeMatch[2]) : 0,
    0,
    0
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function fieldsFromDate(date: Date | undefined): { pickupDate: string; pickupTime: string } {
  if (!date || Number.isNaN(date.getTime())) return { pickupDate: '', pickupTime: '' };
  return {
    pickupDate: [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-'),
    pickupTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
}

function AirportTransferWhen({
  pickupDate,
  pickupTime,
  onChange,
}: {
  pickupDate: string;
  pickupTime: string;
  onChange: (next: { pickupDate: string; pickupTime: string }) => void;
}) {
  const pickerRef = useRef<DateTimePickerHandle>(null);
  const [showPicker, setShowPicker] = useState(false);
  const travelDate = dateFromFields(pickupDate, pickupTime);

  useEffect(() => {
    if (!showPicker) return;
    pickerRef.current?.open();
  }, [showPicker]);

  const openWhen = () => {
    if (showPicker) {
      window.setTimeout(() => pickerRef.current?.open(), 30);
      return;
    }
    setShowPicker(true);
  };
  const dateLabel = travelDate
    ? `${travelDate.getDate()} ${WHEN_MONTHS[travelDate.getMonth()]}, ${travelDate.getFullYear()}`
    : 'Pickup date';
  const timeLabel = travelDate
    ? (() => {
        const hours = travelDate.getHours();
        const suffix = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${String(travelDate.getMinutes()).padStart(2, '0')} ${suffix}`;
      })()
    : 'Pickup time';

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold text-slate-500">Date</p>
          <button
            type="button"
            onClick={openWhen}
            className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left"
          >
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <span className={cn('min-w-0 flex-1 truncate text-[13px] font-medium', travelDate ? 'text-slate-900' : 'text-slate-400')}>
              {dateLabel}
            </span>
          </button>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold text-slate-500">Pickup time</p>
          <button
            type="button"
            onClick={openWhen}
            className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left"
          >
            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            <span className={cn('min-w-0 flex-1 truncate text-[13px] font-medium', travelDate ? 'text-slate-900' : 'text-slate-400')}>
              {timeLabel}
            </span>
          </button>
        </div>
      </div>
      {showPicker ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 overflow-hidden opacity-0">
          <DateTimePicker
            ref={pickerRef}
            label="Airport transfer date and time"
            date={travelDate}
            onDateChange={(date) => onChange(fieldsFromDate(date))}
            minDate={earliestPickupInstant()}
            variant="infield"
            preferPopover
          />
        </div>
      ) : null}
    </div>
  );
}

function legsFromTransfers(transfers: TourQuoteAirportTransfer[] | undefined): AirportTransferLeg[] {
  if (!transfers?.length) return [];
  return transfers.map((transfer, index) => ({
    id: `airport-saved-${index}-${transfer.pickupDate || 'na'}`,
    direction: transfer.direction,
    pickupDate: transfer.pickupDate,
    pickupTime: transfer.pickupTime,
    distanceKm: Number(transfer.distanceKm) > 0 ? Number(transfer.distanceKm) : 0,
    fare: Number(transfer.fare) > 0 ? Number(transfer.fare) : 0,
    place: transfer.place,
  }));
}

export function TourAdditionalAirportTransfers({
  vehicle,
  tripStartDate,
  tripStartTime,
  tripDayCount,
  initialTransfers,
  onFareChange,
  onTransfersChange,
  onTripScheduleChange,
}: TourAdditionalAirportTransfersProps) {
  const [legs, setLegs] = useState<AirportTransferLeg[]>(() => legsFromTransfers(initialTransfers));
  const [sectionOpen, setSectionOpen] = useState(() => (initialTransfers?.length ? 'airport' : ''));
  const skipEmptyNotify = useRef(true);
  const [fareRow, setFareRow] = useState<AirportFare | null>(null);
  const vehicleId = vehicle?.id || vehicle?.vehicleId || vehicle?.name || '';

  const total = legs.reduce((sum, leg) => sum + (leg.fare > 0 ? leg.fare : 0), 0);

  useEffect(() => {
    onFareChange(total);
  }, [onFareChange, total]);

  useEffect(() => {
    if (skipEmptyNotify.current) {
      skipEmptyNotify.current = false;
      if (legs.length === 0) return;
    }
    onTransfersChange?.(
      legs.map((leg) => ({
        direction: leg.direction,
        placeName: (leg.place?.name || leg.place?.address || '').trim(),
        pickupDate: leg.pickupDate,
        pickupTime: leg.pickupTime,
        fare: leg.fare,
        distanceKm: leg.distanceKm,
        place: leg.place,
      }))
    );
  }, [legs, onTransfersChange]);

  useEffect(() => {
    if (!vehicleId) {
      setFareRow(null);
      return;
    }
    let cancelled = false;
    void getAirportFaresForVehicle(normalizeVehicleId(vehicleId) || vehicleId).then((row) => {
      if (!cancelled) setFareRow(row);
    });
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId || !fareRow || legs.length === 0) return;
    let cancelled = false;

    void (async () => {
      const next = await Promise.all(
        legs.map(async (leg) => {
          if (!isSelectedMapLocation(leg.place) || !airportLocation) {
            return leg;
          }
          const origin = leg.direction === 'from-airport' ? airportLocation : leg.place;
          const destination = leg.direction === 'from-airport' ? leg.place : airportLocation;
          const result = await calculateDistanceMatrix(origin, destination);
          const distanceKm = result.status === 'OK' ? result.distance : 0;
          const fare = distanceKm > 0 ? bookingWidgetAirportFare(fareRow, vehicleId, distanceKm) : 0;
          return { ...leg, distanceKm, fare };
        })
      );
      if (cancelled) return;
      const changed = next.some(
        (leg, index) => leg.fare !== legs[index]?.fare || leg.distanceKm !== legs[index]?.distanceKm
      );
      if (changed) setLegs(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [legs, vehicleId, fareRow]);

  useEffect(() => {
    let tripPatch: PlanWhen | null = null;
    setLegs((current) => {
      if (current.length === 0) return current;
      let tripDate = tripStartDate;
      let tripTime = tripStartTime;
      let changed = false;
      const next = current.map((leg) => {
        const pickupDate = isInsideTourDates(leg.pickupDate, tripStartDate, tripDayCount)
          ? edgeDate(leg.direction, tripStartDate, tripDayCount) || leg.pickupDate
          : leg.pickupDate;
        const separated = separateAirportAndTrip({
          direction: leg.direction,
          airport: { pickupDate, pickupTime: leg.pickupTime },
          trip: { pickupDate: tripDate, pickupTime: tripTime },
          prefer: 'trip',
        });
        tripDate = separated.trip.pickupDate || tripDate;
        tripTime = separated.trip.pickupTime || tripTime;
        if (
          separated.airport.pickupDate !== leg.pickupDate ||
          separated.airport.pickupTime !== leg.pickupTime
        ) {
          changed = true;
          return { ...leg, pickupDate: separated.airport.pickupDate, pickupTime: separated.airport.pickupTime };
        }
        return leg;
      });
      if (
        tripDate &&
        tripTime &&
        (tripDate !== tripStartDate || tripTime !== tripStartTime)
      ) {
        tripPatch = { pickupDate: tripDate, pickupTime: tripTime };
      }
      return changed ? next : current;
    });
    const patch: PlanWhen | null = tripPatch;
    if (!patch) return;
    const nextAt = planInstant(patch.pickupDate, patch.pickupTime);
    const currentAt = planInstant(tripStartDate, tripStartTime);
    if (!currentAt || (nextAt && nextAt.getTime() > currentAt.getTime())) {
      onTripScheduleChange?.(patch);
    }
  }, [tripStartDate, tripStartTime, tripDayCount, onTripScheduleChange]);

  const updateLeg = (id: string, patch: Partial<AirportTransferLeg>) => {
    setLegs((current) => current.map((leg) => (leg.id === id ? { ...leg, ...patch } : leg)));
  };

  const acceptPlace = (id: string, place: Location) => {
    if (!isSelectedMapLocation(place) || isVizagAirportLocation(place)) {
      updateLeg(id, { place: undefined, distanceKm: 0, fare: 0 });
      return;
    }
    if (!isAirportTransferOtherEnd(place)) {
      toast('This place is outside the airport transfer area. Choose Visakhapatnam, Vizianagaram, Srikakulam, or nearby.');
      updateLeg(id, { place: undefined, distanceKm: 0, fare: 0 });
      return;
    }
    updateLeg(id, { place, distanceKm: 0, fare: 0 });
  };

  const summary = legs.length === 0 ? 'Pickup or drop from Vizag airport' : total > 0 ? `${formatRupees(total)} extra` : `${legs.length} added`;

  const addLeg = () => {
    const created = newLeg('from-airport', tripStartDate, tripStartTime, tripDayCount);
    setLegs((current) => [...current, created.leg]);
    if (
      created.trip.pickupDate &&
      created.trip.pickupTime &&
      (created.trip.pickupDate !== tripStartDate || created.trip.pickupTime !== tripStartTime)
    ) {
      onTripScheduleChange?.(created.trip);
      toast('Tour time moved so the airport transfer stays 2 hours apart on the same day.');
    }
    setSectionOpen('airport');
  };

  const acceptWhen = (id: string, direction: AirportDirection, next: { pickupDate: string; pickupTime: string }) => {
    let pickupDate = next.pickupDate;
    let pickupTime = next.pickupTime;
    if (isInsideTourDates(pickupDate, tripStartDate, tripDayCount)) {
      toast('Airport transfer can’t be during the tour. Choose the first day, the last day, or a date outside the trip.');
      pickupDate = edgeDate(direction, tripStartDate, tripDayCount) || pickupDate;
    }
    const separated = separateAirportAndTrip({
      direction,
      airport: { pickupDate, pickupTime },
      trip: { pickupDate: tripStartDate, pickupTime: tripStartTime },
      prefer: 'airport',
    });
    updateLeg(id, separated.airport);
    if (separated.tripChanged && separated.trip.pickupDate && separated.trip.pickupTime) {
      onTripScheduleChange?.(separated.trip);
    }
    if (separated.airportChanged || separated.tripChanged) {
      const leadMoved =
        separated.airport.pickupTime !== pickupTime || separated.airport.pickupDate !== pickupDate;
      toast(
        leadMoved && !separated.tripChanged
          ? 'Pickup time must be at least 1.5 hours from now.'
          : 'Airport transfer and the tour need a 2 hour gap when they are on the same date.'
      );
    }
  };

  return (
    <Accordion type="single" collapsible value={sectionOpen} onValueChange={setSectionOpen} className="mb-2">
      <AccordionItem value="airport" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <AccordionTrigger className="h-11 rounded-none border-0 bg-white px-3 py-0 text-slate-400 hover:no-underline [&>svg]:text-slate-400">
          <span className="flex min-w-0 flex-1 items-center gap-2 pr-2">
            <Plane className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
            <span className="shrink-0 text-[13px] font-semibold text-slate-900">Airport Transfers</span>
            <span className="truncate text-[12px] font-normal text-slate-500">{summary}</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3">
          {legs.length === 0 ? (
            <button
              type="button"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 text-[12px] font-semibold text-blue-600 hover:bg-blue-50"
              onClick={addLeg}
            >
              <Plus className="h-3.5 w-3.5" />
              Add a transfer
            </button>
          ) : (
            <div className="space-y-3">
              {legs.map((leg, index) => {
                const fromAirport = leg.direction === 'from-airport';
                return (
                  <div key={leg.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-slate-800">Transfer {index + 1}</p>
                      <button
                        type="button"
                        className="rounded-full p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Remove airport transfer ${index + 1}`}
                        onClick={() => setLegs((current) => current.filter((item) => item.id !== leg.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="axis-trip-toggle mb-3">
                      <button
                        type="button"
                        className="axis-trip-toggle-btn inline-flex items-center justify-center gap-1.5 text-[12px]"
                        data-active={fromAirport ? 'true' : 'false'}
                        onClick={() => {
                          const pickupDate = edgeDate('from-airport', tripStartDate, tripDayCount) || leg.pickupDate;
                          const separated = separateAirportAndTrip({
                            direction: 'from-airport',
                            airport: { pickupDate, pickupTime: leg.pickupTime || tripStartTime },
                            trip: { pickupDate: tripStartDate, pickupTime: tripStartTime },
                            prefer: 'trip',
                          });
                          updateLeg(leg.id, {
                            direction: 'from-airport',
                            place: undefined,
                            distanceKm: 0,
                            fare: 0,
                            ...separated.airport,
                          });
                          if (separated.tripChanged) onTripScheduleChange?.(separated.trip);
                        }}
                      >
                        <Plane className="h-3.5 w-3.5" />
                        From Airport
                      </button>
                      <button
                        type="button"
                        className="axis-trip-toggle-btn inline-flex items-center justify-center gap-1.5 text-[12px]"
                        data-active={!fromAirport ? 'true' : 'false'}
                        onClick={() => {
                          const pickupDate = edgeDate('to-airport', tripStartDate, tripDayCount) || leg.pickupDate;
                          const separated = separateAirportAndTrip({
                            direction: 'to-airport',
                            airport: { pickupDate, pickupTime: leg.pickupTime || tripStartTime },
                            trip: { pickupDate: tripStartDate, pickupTime: tripStartTime },
                            prefer: 'trip',
                          });
                          updateLeg(leg.id, {
                            direction: 'to-airport',
                            place: undefined,
                            distanceKm: 0,
                            fare: 0,
                            ...separated.airport,
                          });
                          if (separated.tripChanged) onTripScheduleChange?.(separated.trip);
                        }}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        To Airport
                      </button>
                    </div>
                    <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
                      {fromAirport ? 'Drop location (Hotel / Address)' : 'Pickup location (Hotel / Address)'}
                    </p>
                    <LocationInput
                      id={`tour-airport-${leg.id}`}
                      label=""
                      placeholder={fromAirport ? 'Hotel or drop address' : 'Hotel or pickup address'}
                      location={leg.place}
                      onLocationChange={(place) => acceptPlace(leg.id, place)}
                      tripType="airport"
                      isPickupLocation={!fromAirport}
                      hideRestrictedAirportDrops={fromAirport}
                      variant="infield"
                      compact
                      hideSubtitle
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 [&_.ios-search-input-wrapper]:min-h-11 [&_.ios-search-input-wrapper]:items-center [&_.ios-search-input-wrapper]:py-0"
                    />
                    <div className="mt-3">
                      <AirportTransferWhen
                        pickupDate={leg.pickupDate}
                        pickupTime={leg.pickupTime}
                        onChange={(next) => acceptWhen(leg.id, leg.direction, next)}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <MapPin className="h-3 w-3" />
                          Distance
                        </p>
                        <p className="mt-1 text-[13px] font-semibold text-slate-800">
                          {leg.distanceKm > 0 ? `${Math.round(leg.distanceKm)} km` : '—'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <IndianRupee className="h-3 w-3" />
                          Estimated fare
                        </p>
                        <p className="mt-1 text-[13px] font-semibold text-blue-600">
                          {!vehicle
                            ? 'Select a vehicle'
                            : leg.fare > 0
                              ? `${formatRupees(leg.fare)} extra`
                              : leg.place
                                ? 'Calculating…'
                                : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-200 bg-white text-[12px] font-semibold text-blue-600 hover:bg-blue-50"
                onClick={addLeg}
              >
                <Plus className="h-3.5 w-3.5" />
                Add another transfer
              </button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
