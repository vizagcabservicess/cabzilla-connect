import type { CSSProperties } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const SESSION_KEY = 'urbaniaSeatShareCampaignDismissed';
const ROUTE_STOPS = [
  'Tuni',
  'Rajahmundry',
  'Vijayawada',
  'Guntur',
  'Ongole',
  'Nellore',
  'Tirupathi',
  'Vellore',
  'Kerala',
] as const;

const TRIP_DATE_LABEL = '20-04-2026';
const DEPARTURE_LABEL = '05:00 AM';

const BLUE = '#185FA5';
const AMBER = '#BA7517';
const MID_BLUE = '#378ADD';
const LINE_BASE = '#B5D4F4';

type StopName = (typeof ROUTE_STOPS)[number];

function buildAlertMessage(params: {
  name: string;
  phone: string;
  pickup: string;
  dropOff: string;
  seats: number;
}): string {
  return [
    'New Seat Booking Alert!',
    `Name: ${params.name}`,
    `Phone: ${params.phone}`,
    `Pickup: ${params.pickup}`,
    `Drop-off: ${params.dropOff}`,
    `Seats: ${params.seats}`,
    `Date: ${TRIP_DATE_LABEL}`,
    `Departure: ${DEPARTURE_LABEL}`,
  ].join('\n');
}

async function postSeatShareBooking(body: {
  name: string;
  phone: string;
  pickup: string;
  dropOff: string;
  seats: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const directUrl = import.meta.env.VITE_WHATSAPP_API_URL as string | undefined;
  const token = import.meta.env.VITE_ACCESS_TOKEN as string | undefined;
  const tokenAlt = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN as string | undefined;
  const phoneNumberId = import.meta.env.VITE_BUSINESS_PHONE_NUMBER_ID as string | undefined;
  const phoneNumberIdAlt = import.meta.env.VITE_WHATSAPP_BUSINESS_PHONE_NUMBER_ID as string | undefined;
  const recipient =
    (import.meta.env.VITE_RECIPIENT_WHATSAPP_NUMBER as string | undefined) ||
    (import.meta.env.VITE_WHATSAPP_RECIPIENT_NUMBER as string | undefined);
  const accessToken = token || tokenAlt;
  const businessPhoneNumberId = phoneNumberId || phoneNumberIdAlt;
  const proxyUrl = (import.meta.env.VITE_SEAT_SHARE_BOOKING_ENDPOINT as string | undefined) || '/api/urbania-seat-share-booking.php';

  const message = buildAlertMessage(body);

  if (directUrl && accessToken && businessPhoneNumberId && recipient) {
    const url = directUrl.replace(/\/$/, '') + `/${businessPhoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient.replace(/\D/g, ''),
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[]; error?: { message?: string } };
    if (res.ok && data.messages?.[0]?.id) {
      return { ok: true };
    }
    return { ok: false, message: data.error?.message || res.statusText || 'WhatsApp request failed' };
  }

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, message }),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
  if (res.ok && data.status === 'success') {
    return { ok: true };
  }
  return { ok: false, message: data.message || 'Could not send booking. Please try again.' };
}

type DotKind = 'idle' | 'pickup' | 'drop' | 'between';

function RouteStopDot({ kind }: { kind: DotKind }) {
  const outer: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
  };

  if (kind === 'idle') {
    outer.border = '2px solid #B5D4F4';
    outer.background = '#ffffff';
  } else if (kind === 'pickup') {
    outer.border = `2px solid ${BLUE}`;
    outer.background = BLUE;
  } else if (kind === 'drop') {
    outer.border = `2px solid ${AMBER}`;
    outer.background = AMBER;
  } else {
    outer.border = `2px solid ${MID_BLUE}`;
    outer.background = MID_BLUE;
  }

  return (
    <div style={outer} aria-hidden>
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: '#ffffff',
        }}
      />
    </div>
  );
}

/** Trailing control: no tag for in-range (between pickup and drop). */
function stopTrailingKind(
  i: number,
  pickupIndex: number | null,
  dropIndex: number | null,
): 'pickup' | 'drop' | 'click' | null {
  if (pickupIndex !== null && i === pickupIndex) return 'pickup';
  if (dropIndex !== null && i === dropIndex) return 'drop';
  if (
    pickupIndex !== null &&
    dropIndex !== null &&
    i > pickupIndex &&
    i < dropIndex
  ) {
    return null;
  }
  return 'click';
}

function stopNameColor(dot: DotKind): string {
  if (dot === 'pickup' || dot === 'between') return BLUE;
  if (dot === 'drop') return AMBER;
  return '#171717';
}

export function UrbaniaSeatShareCampaignModal() {
  const [visible, setVisible] = useState(false);
  const [pickupIndex, setPickupIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [seats, setSeats] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    name: string;
    phone: string;
    pickup: StopName;
    dropOff: StopName;
    seats: number;
  } | null>(null);

  const routeWrapRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [routeLines, setRouteLines] = useState<{
    baseTop: number;
    baseHeight: number;
    fillTop: number;
    fillHeight: number;
    showFill: boolean;
  }>({ baseTop: 0, baseHeight: 0, fillTop: 0, fillHeight: 0, showFill: false });

  const setRowRef = useCallback((i: number, el: HTMLLIElement | null) => {
    rowRefs.current[i] = el;
  }, []);

  const measureRouteLines = useCallback(() => {
    const wrap = routeWrapRef.current;
    if (!wrap) return;
    const first = rowRefs.current[0];
    const last = rowRefs.current[ROUTE_STOPS.length - 1];
    if (!first || !last) return;

    const w = wrap.getBoundingClientRect();
    const fr = first.getBoundingClientRect();
    const lr = last.getBoundingClientRect();
    const firstCenterY = fr.top + fr.height / 2 - w.top;
    const lastCenterY = lr.top + lr.height / 2 - w.top;
    const baseTop = Math.min(firstCenterY, lastCenterY);
    const baseHeight = Math.max(Math.abs(lastCenterY - firstCenterY), 0);

    let fillTop = 0;
    let fillHeight = 0;
    let showFill = false;
    if (pickupIndex !== null && dropIndex !== null) {
      const pe = rowRefs.current[pickupIndex];
      const de = rowRefs.current[dropIndex];
      if (pe && de) {
        const pr = pe.getBoundingClientRect();
        const dr = de.getBoundingClientRect();
        const pc = pr.top + pr.height / 2 - w.top;
        const dc = dr.top + dr.height / 2 - w.top;
        fillTop = Math.min(pc, dc);
        fillHeight = Math.max(Math.abs(dc - pc), 0);
        showFill = true;
      }
    }

    setRouteLines((prev) => {
      if (
        prev.baseTop === baseTop &&
        prev.baseHeight === baseHeight &&
        prev.fillTop === fillTop &&
        prev.fillHeight === fillHeight &&
        prev.showFill === showFill
      ) {
        return prev;
      }
      return { baseTop, baseHeight, fillTop, fillHeight, showFill };
    });
  }, [pickupIndex, dropIndex]);

  useLayoutEffect(() => {
    if (!visible || success) return;
    measureRouteLines();
    const t = requestAnimationFrame(() => measureRouteLines());
    return () => cancelAnimationFrame(t);
  }, [visible, success, measureRouteLines, pickupIndex, dropIndex]);

  useEffect(() => {
    if (!visible || success) return;
    window.addEventListener('resize', measureRouteLines);
    const el = routeWrapRef.current;
    const ro =
      el && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => measureRouteLines())
        : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener('resize', measureRouteLines);
      ro?.disconnect();
    };
  }, [visible, success, measureRouteLines]);

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    const t = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const pickupName = pickupIndex !== null ? ROUTE_STOPS[pickupIndex] : null;
  const dropName = dropIndex !== null ? ROUTE_STOPS[dropIndex] : null;

  const onStopClick = (index: number) => {
    setError(null);
    if (pickupIndex !== null && dropIndex !== null) {
      setPickupIndex(index);
      setDropIndex(null);
      return;
    }
    if (pickupIndex === null) {
      setPickupIndex(index);
      return;
    }
    if (index === pickupIndex) {
      setPickupIndex(null);
      setDropIndex(null);
      return;
    }
    if (index < pickupIndex) {
      setPickupIndex(index);
      setDropIndex(null);
      return;
    }
    setDropIndex(index);
  };

  const seatsNum = seats.trim() === '' ? NaN : Number.parseInt(seats, 10);
  const seatsValid = Number.isFinite(seatsNum) && seatsNum >= 1 && seatsNum <= 6;

  const canSubmit =
    pickupIndex !== null &&
    dropIndex !== null &&
    name.trim() !== '' &&
    phone.trim() !== '' &&
    seats.trim() !== '' &&
    seatsValid;

  const handleReserve = async () => {
    if (!canSubmit || pickupIndex === null || dropIndex === null) return;
    setSubmitting(true);
    setError(null);
    const result = await postSeatShareBooking({
      name: name.trim(),
      phone: phone.trim(),
      pickup: ROUTE_STOPS[pickupIndex],
      dropOff: ROUTE_STOPS[dropIndex],
      seats: seatsNum,
    });
    setSubmitting(false);
    if (result.ok) {
      setSuccess({
        name: name.trim(),
        phone: phone.trim(),
        pickup: ROUTE_STOPS[pickupIndex],
        dropOff: ROUTE_STOPS[dropIndex],
        seats: seatsNum,
      });
    } else {
      setError(result.message);
    }
  };

  const stopStyles = useMemo(() => {
    return ROUTE_STOPS.map((_, i) => {
      if (pickupIndex !== null && i === pickupIndex) {
        return { dot: 'pickup' as const };
      }
      if (dropIndex !== null && i === dropIndex) {
        return { dot: 'drop' as const };
      }
      if (
        pickupIndex !== null &&
        dropIndex !== null &&
        i > pickupIndex &&
        i < dropIndex
      ) {
        return { dot: 'between' as const };
      }
      return { dot: 'idle' as const };
    });
  }, [pickupIndex, dropIndex]);

  const stepPhase = useMemo(() => {
    if (pickupIndex === null) return 1 as const;
    if (dropIndex === null) return 2 as const;
    return 3 as const;
  }, [pickupIndex, dropIndex]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        #urbania-seat-share-modal .urbania-reserve-btn {
          width: 100% !important;
          height: 38px !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          border: none !important;
          box-sizing: border-box !important;
        }
        #urbania-seat-share-modal .urbania-reserve-btn:disabled {
          background-color: #cccccc !important;
          color: #888888 !important;
          cursor: not-allowed !important;
          opacity: 1 !important;
        }
        #urbania-seat-share-modal .urbania-reserve-btn--loading:disabled {
          background-color: #185FA5 !important;
          color: #ffffff !important;
          cursor: wait !important;
          opacity: 0.88 !important;
        }
        #urbania-seat-share-modal .urbania-reserve-btn:not(:disabled) {
          background-color: #185FA5 !important;
          color: #ffffff !important;
          cursor: pointer !important;
        }
      `}</style>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{
          zIndex: 9999,
          background: 'rgba(0,0,0,0.55)',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
        role="presentation"
      >
        <div
          id="urbania-seat-share-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="urbania-seat-share-title"
          className="relative w-full max-w-[400px] overflow-hidden rounded-[12px] bg-white shadow-xl"
          style={{ fontSize: 13 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 z-[2] flex h-8 w-8 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>

          <header className="px-4 pb-4 pt-4 pr-12 text-white" style={{ background: BLUE }}>
            <h2
              id="urbania-seat-share-title"
              className="flex flex-wrap items-center gap-x-1.5 gap-y-1 leading-snug"
            >
              <span
                style={{
                  background: 'rgba(255,255,255,0.22)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  borderRadius: 6,
                  padding: '2px 9px',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '0.2px',
                  whiteSpace: 'nowrap',
                }}
              >
                Urbania
              </span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 13,
                  fontWeight: 400,
                }}
              >
                Seat Sharing —
              </span>
              <span
                style={{
                  background: 'rgba(255,255,255,0.22)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  borderRadius: 6,
                  padding: '2px 9px',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '0.2px',
                  whiteSpace: 'nowrap',
                }}
              >
                Vizag → Kerala
              </span>
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center rounded-full"
                style={{
                  gap: 6,
                  background: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.95)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: BLUE,
                  letterSpacing: '0.02em',
                }}
              >
                <span
                  className="block rounded-full"
                  style={{ width: 6, height: 6, background: BLUE, flexShrink: 0 }}
                  aria-hidden
                />
                20-04-2026
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/15 px-2.5 py-1 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-200" />
                {DEPARTURE_LABEL}
              </span>
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  background: '#ffffff',
                  color: AMBER,
                  border: `2px solid ${AMBER}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  padding: '2px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                }}
              >
                One Way
              </span>
              <span
                className="inline-flex items-center rounded-[20px] font-medium text-white"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 500,
                  gap: 4,
                }}
              >
                <span aria-hidden>❄</span>
                Central AC
              </span>
            </div>
          </header>

          <div className="px-4 pb-4 pt-3">
            {success ? (
              <div className="space-y-3 pt-1">
                <p className="text-[15px] font-semibold" style={{ color: BLUE }}>
                  You’re all set!
                </p>
                <p className="text-[12px] text-neutral-600">
                  We’ve received your seat request. Our team will contact you on WhatsApp shortly.
                </p>
                <div
                  className="rounded-[8px] border p-3 text-[12px] text-neutral-800"
                  style={{ borderColor: LINE_BASE, background: '#F8FAFC' }}
                >
                  <p><span className="text-neutral-500">Route:</span> {success.pickup} → {success.dropOff}</p>
                  <p><span className="text-neutral-500">Name:</span> {success.name}</p>
                  <p><span className="text-neutral-500">Phone:</span> {success.phone}</p>
                  <p><span className="text-neutral-500">Seats:</span> {success.seats}</p>
                  <p><span className="text-neutral-500">Date:</span> {TRIP_DATE_LABEL}</p>
                  <p><span className="text-neutral-500">Departure from Vizag:</span> {DEPARTURE_LABEL}</p>
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  className="w-full rounded-[8px] text-[13px] font-medium text-white hover:opacity-95"
                  style={{ background: BLUE, height: 38 }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-stretch gap-2">
                  <div
                    className="min-w-0 flex-1 rounded-[8px] border border-neutral-200 bg-white pl-2.5 pr-2 py-2"
                    style={{ borderLeftWidth: 4, borderLeftColor: BLUE }}
                  >
                    <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Pickup</div>
                    <div
                      className={`truncate text-[13px] ${pickupName ? 'font-semibold' : 'font-normal text-neutral-400'}`}
                      style={pickupName ? { color: BLUE } : undefined}
                    >
                      {pickupName ?? 'Not selected'}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center text-neutral-400">→</div>
                  <div
                    className="min-w-0 flex-1 rounded-[8px] border border-neutral-200 bg-white pl-2.5 pr-2 py-2"
                    style={{ borderLeftWidth: 4, borderLeftColor: BLUE }}
                  >
                    <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Drop-off</div>
                    <div
                      className={`truncate text-[13px] ${dropName ? 'font-semibold' : 'font-normal text-neutral-400'}`}
                      style={dropName ? { color: BLUE } : undefined}
                    >
                      {dropName ?? 'Not selected'}
                    </div>
                  </div>
                </div>

                <div
                  className="mt-3 flex items-start gap-2 rounded-[8px] border px-3 py-2.5 text-[12px] leading-snug"
                  style={
                    stepPhase === 1
                      ? {
                          background: '#E6F1FB',
                          borderColor: LINE_BASE,
                          color: BLUE,
                        }
                      : stepPhase === 2
                        ? {
                            background: '#FAEEDA',
                            borderColor: '#E8C48A',
                            color: '#633806',
                          }
                        : {
                            background: '#E6F1FB',
                            borderColor: LINE_BASE,
                            color: BLUE,
                          }
                  }
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{
                      background: stepPhase === 2 ? AMBER : BLUE,
                    }}
                  >
                    {stepPhase === 3 ? '✓' : stepPhase}
                  </span>
                  <div>
                    {stepPhase === 1 && (
                      <>
                        <span className="font-semibold">Step 1:</span> Tap a stop to set your{' '}
                        <span className="font-semibold">pickup</span> (where you board).
                      </>
                    )}
                    {stepPhase === 2 && (
                      <>
                        <span className="font-semibold">Step 2:</span> Tap a stop{' '}
                        <span className="font-semibold">after</span> your pickup to set your{' '}
                        <span className="font-semibold">drop-off</span>.
                      </>
                    )}
                    {stepPhase === 3 && (
                      <>
                        <span className="font-semibold">Route selected!</span> Fill your details below to confirm.
                      </>
                    )}
                  </div>
                </div>

                <div ref={routeWrapRef} className="relative mt-2">
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: 7,
                      top: routeLines.baseTop,
                      width: 2,
                      height: routeLines.baseHeight,
                      background: LINE_BASE,
                      transform: 'translateX(-50%)',
                      pointerEvents: 'none',
                      borderRadius: 1,
                      zIndex: 0,
                    }}
                  />
                  {routeLines.showFill && (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 7,
                        top: routeLines.fillTop,
                        width: 3,
                        height: Math.max(routeLines.fillHeight, 0),
                        background: BLUE,
                        transform: 'translateX(-50%)',
                        pointerEvents: 'none',
                        borderRadius: 1,
                        zIndex: 0,
                      }}
                    />
                  )}
                  <ul className="relative z-[1] m-0 list-none p-0">
                  {ROUTE_STOPS.map((stop, i) => {
                    const { dot } = stopStyles[i];
                    const trailing = stopTrailingKind(i, pickupIndex, dropIndex);
                    const nameColor = stopNameColor(dot);
                    return (
                      <li
                        key={stop}
                        ref={(el) => setRowRef(i, el)}
                        className="relative"
                        style={{ paddingTop: 4, paddingBottom: 4 }}
                      >
                        <div
                          className="pointer-events-none absolute z-[2] flex items-center justify-center"
                          style={{
                            left: 7,
                            top: '50%',
                            width: 14,
                            height: 14,
                            transform: 'translate(-50%, -50%)',
                          }}
                          aria-hidden
                        >
                          <RouteStopDot kind={dot} />
                        </div>
                        <button
                          type="button"
                          onClick={() => onStopClick(i)}
                          className="relative z-[1] flex w-full min-h-0 items-center gap-2 rounded-[6px] py-0 pl-5 pr-1 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#185FA5]/40 focus-visible:ring-offset-1"
                          style={{
                            background:
                              dot === 'drop' ? 'rgba(230, 241, 251, 0.65)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              dot === 'drop' ? 'rgba(230, 241, 251, 0.85)' : 'rgba(230, 241, 251, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              dot === 'drop' ? 'rgba(230, 241, 251, 0.65)' : 'transparent';
                          }}
                        >
                          <span className="min-w-0 flex-1 text-[13px] font-medium" style={{ color: nameColor }}>
                            {stop}
                          </span>
                          {trailing === 'click' && (
                            <span
                              className="flex-shrink-0 text-[10px] font-medium underline decoration-[#B5D4F4] underline-offset-2"
                              style={{ color: BLUE }}
                            >
                              Click to pick
                            </span>
                          )}
                          {trailing === 'pickup' && (
                            <span
                              className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                              style={{ background: BLUE }}
                            >
                              Pickup
                            </span>
                          )}
                          {trailing === 'drop' && (
                            <span
                              className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                              style={{ background: AMBER }}
                            >
                              Drop-off
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                  </ul>
                </div>

                <div className="mt-2 grid grid-cols-[1fr_1fr_72px] gap-2">
                  <label className="block min-w-0">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-neutral-500">Name</span>
                    <input
                      className="h-9 w-full rounded-[8px] border border-neutral-300 px-2 text-[13px] outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5]"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                      }}
                      autoComplete="name"
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-neutral-500">Phone</span>
                    <input
                      className="h-9 w-full rounded-[8px] border border-neutral-300 px-2 text-[13px] outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5]"
                      placeholder="+91 XXXXX"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setError(null);
                      }}
                      autoComplete="tel"
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-neutral-500">Seats</span>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      className="h-9 w-full rounded-[8px] border border-neutral-300 px-2 text-[13px] outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5]"
                      placeholder="1"
                      value={seats}
                      onChange={(e) => {
                        setSeats(e.target.value);
                        setError(null);
                      }}
                    />
                  </label>
                </div>

                {error && (
                  <p className="mt-2 text-[12px] text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  disabled={!canSubmit || submitting}
                  onClick={handleReserve}
                  className={`urbania-reserve-btn mt-3 ${submitting ? 'urbania-reserve-btn--loading' : ''}`}
                >
                  {submitting ? 'Sending…' : 'Reserve My Seat'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
