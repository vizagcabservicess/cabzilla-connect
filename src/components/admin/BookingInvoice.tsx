import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Booking } from '@/types/api';
import { Loader2, FileText, Download, RefreshCw, AlertCircle, FileIcon } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getApiUrl } from '@/config/api';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { patchInvoiceHtmlTripTypeCell, patchInvoiceHtmlTripSummary, patchInvoiceHtmlBillingAddress, patchInvoiceHtmlInvoiceNumber } from '@/utils/invoiceTripTypeDisplay';
import {
  appendTripSummaryParams,
  getDefaultTripSummary,
  getDefaultBillingAddress,
  mergeTripSummary,
  readStoredInvoiceSettings,
  type TripSummaryOverrides,
  tripSummaryForApiBody,
} from '@/utils/invoiceTripSummaryDefaults';
import { FleetVehicle } from '@/types/cab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function parseAmount(text?: string | null): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  if (!cleaned) return null;
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

function parseInvoiceSummary(html: string): {
  baseFare?: number;
  extraCharges?: number;
  gstAmount?: number;
  totalAmount?: number;
  isIGST?: boolean;
} | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = Array.from(doc.querySelectorAll('tr'));

    let baseFare: number | undefined;
    let extraCharges = 0;
    let gstAmount = 0;
    let totalAmount: number | undefined;
    let isIGST = false;

    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td,th'));
      if (cells.length < 2) return;
      const label = (cells[0].textContent || '').trim();
      const amount = parseAmount(cells[1].textContent);
      if (amount === null) return;

      // Skip header rows
      if (/description|amount/i.test(label) && cells.length === 2) {
        return;
      }

      // Base fare row
      if (/base fare/i.test(label)) {
        baseFare = amount;
        return;
      }

      // Total amount row
      if (/total amount/i.test(label)) {
        totalAmount = amount;
        return;
      }

      // GST rows - IGST, CGST, SGST
      if (/igst/i.test(label)) {
        gstAmount += amount;
        isIGST = true;
        return;
      }

      if (/cgst/i.test(label) || /sgst/i.test(label)) {
        gstAmount += amount;
        return;
      }

      // GST on specific items (e.g., "IGST on Base Fare", "CGST on Food")
      if (/gst.*on|on.*gst/i.test(label)) {
        // This is a GST row, not an extra charge
        return;
      }

      // Extra charges: Only count rows that are NOT base fare, GST, or total
      // AND have a meaningful label (not empty, not "Description", not header)
      // AND are not part of the fare breakdown header
      if (label.length > 0 && 
          !/description|amount|fare breakdown|base|total|gst|cgst|sgst|igst|tax|no extra charges/i.test(label)) {
        // This appears to be an extra charge row (e.g., "Food", "Toll", etc.)
        extraCharges += amount;
      }
    });

    return { baseFare, extraCharges, gstAmount, totalAmount, isIGST };
  } catch (error) {
    console.error('Failed to parse invoice HTML for summary values:', error);
    return null;
  }
}

interface InvoiceState {
  gstEnabled: boolean;
  isIGST: boolean;
  includeTax: boolean;
  customInvoiceNumber: string;
  gstDetails: GSTDetails;
  adminNotes: string;
  billingAddress: string;
  tripSummary: TripSummaryOverrides;
}

interface BookingInvoiceProps {
  booking: Booking;
  onGenerateInvoice: (
    gstEnabled?: boolean,
    gstDetails?: any,
    isIGST?: boolean,
    includeTax?: boolean,
    customInvoiceNumber?: string,
    adminNotes?: string,
    tripSummary?: TripSummaryOverrides,
    billingAddress?: string
  ) => Promise<any>;
  onClose: () => void;
  isSubmitting: boolean;
  pdfUrl: string;
  invoiceState: InvoiceState;
  onInvoiceStateChange: (state: InvoiceState) => void;
}

interface GSTDetails {
  gstNumber: string;
  companyName: string;
  companyAddress: string;
  /** When Price excluding tax: quoted base fare (before GST). Enter to get different total from inclusive. */
  quotedBaseFare?: string;
}

export function BookingInvoice({
  booking,
  onGenerateInvoice,
  onClose,
  isSubmitting,
  pdfUrl,
  invoiceState,
  onInvoiceStateChange
}: BookingInvoiceProps) {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [isLoadingFleetVehicles, setIsLoadingFleetVehicles] = useState(false);
  
  // Use lifted state from props
  const {
    gstEnabled,
    isIGST,
    includeTax,
    customInvoiceNumber,
    gstDetails,
    adminNotes,
    billingAddress: storedBillingAddress,
    tripSummary: storedTripSummary,
  } = invoiceState;
  const tripSummary = storedTripSummary ?? getDefaultTripSummary(booking);
  const billingAddress = storedBillingAddress ?? getDefaultBillingAddress(booking);
  const displayInvoiceNumber =
    customInvoiceNumber.trim() ||
    invoiceData?.invoiceNumber ||
    invoiceData?.invoice_number ||
    'Generated';

  const updateTripSummaryField = (field: keyof TripSummaryOverrides, value: string) => {
    onInvoiceStateChange({
      ...invoiceState,
      tripSummary: { ...tripSummary, [field]: value },
    });
  };

  useEffect(() => {
    let cancelled = false;
    const loadFleetVehicles = async () => {
      setIsLoadingFleetVehicles(true);
      try {
        const response = await fetch(getApiUrl('/api/admin/fleet_vehicles.php/vehicles')).then((res) =>
          res.json()
        );
        const vehicles = response.vehicles || [];
        if (!cancelled) {
          setFleetVehicles(vehicles);
        }
      } catch (error) {
        console.warn('Failed to load fleet vehicles for invoice settings:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingFleetVehicles(false);
        }
      }
    };
    loadFleetVehicles();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatFleetVehicleLabel = (vehicle: FleetVehicle): string => {
    const reg = vehicle.vehicleNumber || vehicle.vehicle_number || 'No Number';
    const name = vehicle.name || '';
    const model = vehicle.model || '';
    const year = vehicle.year || '';
    return `${reg} - ${name} ${model} (${year})`.replace(/\s+/g, ' ').trim();
  };

  const fleetVehiclesWithNumber = fleetVehicles.filter((v) => {
    const reg = v.vehicleNumber || v.vehicle_number;
    return typeof reg === 'string' && reg.trim() !== '';
  });

  const selectedFleetVehicleId = fleetVehiclesWithNumber.find(
    (v) =>
      (v.vehicleNumber || v.vehicle_number || '').trim().toUpperCase() ===
      tripSummary.vehicleNumber.trim().toUpperCase()
  )?.id?.toString() ?? '';
  const { toast } = useToast();
  const [downloadCount, setDownloadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("html");
  const [rawHtmlContent, setRawHtmlContent] = useState<string | null>(null);
  const [pdfGenerationAvailable, setPdfGenerationAvailable] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedStatus, setEditedStatus] = useState(booking.payment_status || invoiceData?.paymentStatus || 'pending');
  const [editedMethod, setEditedMethod] = useState(booking.payment_method || invoiceData?.paymentMethod || '');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const paymentMethods = [
    'Cash', 'Credit Card', 'Current Account', 'Overdraft account', 'PhonePe'
  ];

  const TAX_LABEL_REGEX = /\b(?:cgst|sgst|igst|gst)\b/i;
  const sanitisedExtraCharges = Array.isArray(booking.extraCharges)
    ? booking.extraCharges.filter(charge => {
        const label = String(charge?.description ?? '').trim();
        return label.length === 0 || !TAX_LABEL_REGEX.test(label);
      })
    : [];

  // CRITICAL FIX: Use original fare field - NEVER use totalAmount for base fare calculation
  const extraChargesTotal = sanitisedExtraCharges.reduce((sum, c) => sum + (c.amount || 0), 0);
  
  // Generate keys for storing original values
  const originalBaseFareKey = `original-base-fare-${booking.id}`;
  
  // Memoize baseFare to prevent infinite loops - only recalculate when booking.id or invoiceData.baseAmount changes
  // CRITICAL: For GST-inclusive mode, NEVER use invoiceData.baseAmount as it's the back-calculated pre-tax base
  // For GST-inclusive, we need the original locked fare (from localStorage or booking.fare) as the GST-inclusive base fare
  const baseFare = useMemo(() => {
    // #region agent log
    console.log('🔍 baseFare useMemo RECALCULATING', {
      gstEnabled,
      includeTax,
      invoiceData_baseAmount: invoiceData?.baseAmount,
      bookingFare: booking.fare,
      bookingTotalAmount: booking.totalAmount,
      note: 'Checking all sources for base fare'
    });
    // #endregion
    
    // CRITICAL: When we have a saved invoice with matching mode, use its base_amount as source of truth.
    // This prevents recalculation on reopen - the DB invoice is canonical.
    const invoiceMatchesMode =
      invoiceData &&
      typeof invoiceData.baseAmount === 'number' &&
      invoiceData.baseAmount > 0 &&
      (invoiceData.gstEnabled ?? invoiceData.gst_enabled) === gstEnabled &&
      (invoiceData.includeTax ?? invoiceData.include_tax) === includeTax;
    if (invoiceMatchesMode) {
      const base = invoiceData.baseAmount;
      localStorage.setItem(originalBaseFareKey, base.toString());
      console.log('🔍 Using invoice base_amount (saved invoice matches mode)', {
        base,
        gstEnabled,
        includeTax,
        note: 'DB invoice is source of truth - no recalculation'
      });
      return base;
    }
    
    // CRITICAL: When GST is disabled (neutral), base fare should be original booking total
    // This ensures base fare shows ₹18,814 (with GST) not ₹15,944 (pre-GST)
    // Only when GST is explicitly excluded should we use pre-GST amount
    if (!gstEnabled) {
      // GST disabled: Use original booking total as base fare (includes GST)
      const originalTotal = typeof booking.totalAmount === 'number'
        ? booking.totalAmount
        : typeof (booking as any).total_amount === 'number'
          ? (booking as any).total_amount as number
          : 0;
      
      if (originalTotal > 0) {
        const baseFareFromTotal = originalTotal - extraChargesTotal;
        if (baseFareFromTotal > 0) {
          console.log('🔍 GST DISABLED: Using original booking total as base fare', {
            originalTotal,
            extraChargesTotal,
            baseFareFromTotal,
            note: 'When GST is disabled (neutral), base fare = original booking total (₹18,814), not pre-GST (₹15,944)'
          });
          return baseFareFromTotal;
        }
      }
    }
    
    // Priority 2: Check localStorage for stored base fare (original locked fare)
    // This is the source of truth for GST-inclusive mode - matches backend lockedBaseFare
    const storedBaseFare = localStorage.getItem(originalBaseFareKey);
    if (storedBaseFare && !isNaN(parseFloat(storedBaseFare))) {
      const parsed = parseFloat(storedBaseFare);
      // If booking.fare has been updated and differs from the stored value, prefer the fresh value
      if (typeof booking.fare === 'number' && booking.fare > 0 && Math.abs(booking.fare - parsed) > 0.01) {
        localStorage.setItem(originalBaseFareKey, booking.fare.toString());
        return booking.fare;
      }
      console.log('🔍 Using stored base fare from localStorage (original locked fare)', {
        storedBaseFare: parsed,
        gstEnabled,
        includeTax,
        invoiceData_baseAmount: invoiceData?.baseAmount,
        note: 'For GST-inclusive, this is the original locked fare (₹1,322.03), NOT the back-calculated pre-tax base (₹864.41)'
      });
      return parsed;
    }
    
    // Priority 3: Use booking.fare (original fare) instead of totalAmount which may include GST
    // This matches backend lockedBaseFare or booking.fare logic
    const originalFare = (typeof booking.fare === 'number' ? booking.fare : 0);
    if (originalFare > 0) {
      localStorage.setItem(originalBaseFareKey, originalFare.toString());
      console.log('🔍 Using booking.fare as base fare (original locked fare)', {
        originalFare,
        gstEnabled,
        includeTax,
        invoiceData_baseAmount: invoiceData?.baseAmount,
        note: 'For GST-inclusive, this is the original locked fare, matches backend lockedBaseFare'
      });
      return originalFare;
    }
    
    // Priority 4: Fallback: Calculate from totalAmount but subtract extra charges
    const rawTotal = (typeof booking.totalAmount === 'number' ? booking.totalAmount : 0);
    let calculated = rawTotal - extraChargesTotal;
    
    // CRITICAL: When GST is excluded, base fare should be the original total (₹18,814)
    // GST will be applied on top of this base fare
    // Do NOT remove GST here - the original total IS the base fare when tax is excluded
    // When GST is disabled, keep the full amount (includes GST)
    // Only remove GST if we're in tax-inclusive mode (which we're not handling here)
    
    if (calculated > 0) {
      localStorage.setItem(originalBaseFareKey, calculated.toString());
    }
    return Math.max(0, calculated);
  }, [booking.id, booking.fare, booking.totalAmount, extraChargesTotal, invoiceData?.baseAmount, originalBaseFareKey, gstEnabled, includeTax]);
  
  // CRITICAL: Match backend PDF logic exactly for determining original booking total
  // Backend logic: 
  // - For GST-exclusive: uses booking.fare (pre-GST base)
  // - For GST-inclusive: uses booking.total_amount, BUT if lockedBaseFare exists, uses that as baseHint
  // The key insight: For GST-inclusive, baseFare (locked/actual fare = 3000) represents the GST-inclusive total
  // NOT booking.totalAmount (3540) which might be from a previous GST-exclusive invoice
  const originalTotalAmount = useMemo(() => {
    // For GST-inclusive mode: Use baseFare (locked/actual fare) as the GST-inclusive total
    // baseFare is calculated from localStorage or booking.fare, which is the correct source (matches backend lockedBaseFare)
    if (gstEnabled && includeTax) {
      // baseFare represents the locked/actual fare (₹3,000), which IS the GST-inclusive total
      if (baseFare > 0) {
        const calculated = baseFare + extraChargesTotal;
        console.log('🔍 GST-INCLUSIVE: Using baseFare as GST-inclusive total (matches backend PDF)', {
          baseFare,
          extraChargesTotal,
          calculated,
          bookingFare: booking.fare,
          bookingTotalAmount: booking.totalAmount,
          note: 'baseFare (locked fare) IS the GST-inclusive total, NOT booking.totalAmount which might be GST-exclusive from previous invoice'
        });
        return calculated;
      }
      // If baseFare is 0, fall through to standard logic
    }
    
    // For GST-exclusive mode: Use booking.fare if available (matches backend logic)
    if (gstEnabled && !includeTax) {
      if (typeof booking.fare === 'number' && booking.fare > 0) {
        // For tax-exclusive, fare field is the base fare (pre-GST)
        return booking.fare + extraChargesTotal;
      }
    }
    
    // Fallback for GST-exclusive or GST-disabled: use standard priority
    // Priority 1: booking.totalAmount (camelCase)
    if (typeof booking.totalAmount === 'number' && booking.totalAmount > 0) {
      return booking.totalAmount;
    }
    // Priority 2: booking.total_amount (snake_case)
    if (typeof (booking as any).total_amount === 'number' && (booking as any).total_amount > 0) {
      return (booking as any).total_amount as number;
    }
    // Priority 3: booking.fare + extras (if fare is available)
    if (typeof booking.fare === 'number' && booking.fare > 0) {
      return booking.fare + extraChargesTotal;
    }
    // Priority 4: baseFare + extras (fallback)
    return baseFare + extraChargesTotal;
  }, [gstEnabled, includeTax, baseFare, extraChargesTotal, booking.fare, booking.totalAmount, (booking as any).total_amount]);

  const parsedSummary = useMemo(
    () => (rawHtmlContent ? parseInvoiceSummary(rawHtmlContent) : null),
    [rawHtmlContent]
  );

  const extrasFromBooking = Math.max(0, extraChargesTotal);
  // Simplified fallback values - actual calculations will be done in computeExclusiveBreakdown/computeInclusiveBreakdown
  const fallbackBaseFare = Math.max(0, baseFare);
  const fallbackExtras = extrasFromBooking;
  const fallbackTaxes = 0;
  const fallbackTotal = fallbackBaseFare + fallbackExtras;

  const GST_RATE = 0.18;

  const summaryExtras = (invoiceData && typeof invoiceData.totalExtraCharges === 'number' && invoiceData.totalExtraCharges >= 0)
    ? invoiceData.totalExtraCharges
    : fallbackExtras;

  const backendBaseAmount = (typeof invoiceData?.baseAmount === 'number' || typeof invoiceData?.base_amount === 'number')
    ? Number(invoiceData.baseAmount ?? invoiceData.base_amount ?? 0)
    : null;
  const backendTaxAmount = (typeof invoiceData?.taxAmount === 'number' || typeof invoiceData?.tax_amount === 'number')
    ? Number(invoiceData.taxAmount ?? invoiceData.tax_amount ?? 0)
    : null;
  const backendCgstAmount = typeof invoiceData?.cgstAmount === 'number' && invoiceData.cgstAmount >= 0
    ? invoiceData.cgstAmount
    : null;
  const backendSgstAmount = typeof invoiceData?.sgstAmount === 'number' && invoiceData.sgstAmount >= 0
    ? invoiceData.sgstAmount
    : null;
  const backendTotalAmount = (typeof invoiceData?.totalAmount === 'number' || typeof invoiceData?.total_amount === 'number')
    ? Number(invoiceData.totalAmount ?? invoiceData.total_amount ?? 0)
    : null;

  // When we have stored invoice, derive extras from total - base - tax if not present (ensures correct value on reopen)
  const effectiveSummaryExtras =
    backendBaseAmount != null &&
    backendTaxAmount != null &&
    backendTotalAmount != null &&
    typeof invoiceData?.totalExtraCharges !== 'number'
      ? Math.max(0, Number((backendTotalAmount - backendBaseAmount - backendTaxAmount).toFixed(2)))
      : summaryExtras;

  // CRITICAL: For tax-exclusive, base should be pre-tax base fare (₹2,000)
  // Use baseFare (from localStorage/booking) directly, NOT originalTotalAmount - extras
  const exclusiveBaseFallback = useMemo(() => {
    if (gstEnabled && !includeTax) {
      // Tax-exclusive mode: Use baseFare directly (this is the locked/pre-tax base fare)
      // baseFare is already the correct pre-tax base (₹2,000), don't subtract extras
      if (baseFare > 0) {
        const calculated = Number(baseFare.toFixed(2));
        console.log('🔍 exclusiveBaseFallback: Using baseFare for tax-exclusive', {
          baseFare,
          calculated,
          bookingFare: booking.fare,
          summaryExtras,
          note: 'For tax-exclusive, baseFare (₹2,000) is the pre-tax base fare, extras are separate'
        });
        return calculated;
      }
      // Fallback to booking.fare if baseFare is not available
      if (typeof booking.fare === 'number' && booking.fare > 0) {
        const calculated = Number(booking.fare.toFixed(2));
        console.log('🔍 exclusiveBaseFallback: Using booking.fare as fallback', {
          bookingFare: booking.fare,
          calculated,
          note: 'Using booking.fare as pre-tax base fare'
        });
        return calculated;
      }
    }
    // Fallback to baseFare for other modes
    const fallback = Number(fallbackBaseFare.toFixed(2));
    console.log('🔍 exclusiveBaseFallback: Using fallbackBaseFare', {
      fallbackBaseFare,
      calculated: fallback,
      note: 'Using fallback base fare'
    });
    return fallback;
  }, [gstEnabled, includeTax, baseFare, booking.fare, summaryExtras, fallbackBaseFare]);
  
  // CRITICAL: For GST-inclusive, use originalTotalAmount which is baseFare (matches backend PDF)
  // NEVER use backendTotalAmount for GST-inclusive - it might be from GST-exclusive invoice
  // Backend logic: For GST-inclusive, uses $baseHint (lockedBaseFare or booking.fare) as the source
  const inclusiveTotalFallback = (() => {
    // For GST-inclusive mode, originalTotalAmount is already set from baseFare (the locked/actual fare)
    // This IS the GST-inclusive total (₹3,000), NOT booking.totalAmount (₹3,540 from previous invoice)
    if (gstEnabled && includeTax && originalTotalAmount > 0) {
      console.log('🔍 inclusiveTotalFallback: Using originalTotalAmount (from baseFare for GST-inclusive)', {
        originalTotalAmount,
        baseFare,
        bookingTotalAmount: booking.totalAmount,
        note: 'For GST-inclusive, originalTotalAmount comes from baseFare (locked fare), matching backend PDF logic'
      });
      return originalTotalAmount;
    }
    
    // For GST-exclusive: use originalTotalAmount (from booking.fare or booking.totalAmount)
    if (originalTotalAmount > 0) {
      return originalTotalAmount;
    }
    
    // Fallback to booking.fare if available
    if (typeof booking.fare === 'number' && booking.fare > 0) {
      return booking.fare + summaryExtras;
    }
    
    // Last resort fallback
    return fallbackTotal;
  })();

  const computeExclusiveBreakdown = () => {
    const baseCandidate = backendBaseAmount ?? exclusiveBaseFallback;
    const base = Number(Math.max(0, baseCandidate).toFixed(2));
    const subtotal = Number((base + summaryExtras).toFixed(2));
    const taxes = backendTaxAmount !== null
      ? Number(backendTaxAmount.toFixed(2))
      : Number((subtotal * GST_RATE).toFixed(2));
    const total = backendTotalAmount ?? Number((subtotal + taxes).toFixed(2));
    return {
      base,
      taxes,
      total: Number(total.toFixed(2))
    };
  };

  const computeInclusiveBreakdown = () => {
    // CRITICAL: Match backend calculateGstBreakdown logic exactly for GST-inclusive
    // Backend uses: $baseHint (lockedBaseFare or booking.fare) + extras as the GST-inclusive total
    // Then: taxableSubtotal = inclusiveTotal / (1 + gstRate), base = taxableSubtotal - extras, tax = inclusiveTotal - taxableSubtotal
    
    // For GST-inclusive, use baseFare (locked/actual fare) + extras as the total
    // This matches backend where $baseHint (3000) represents the GST-inclusive base fare
    const inclusiveTotal = baseFare + summaryExtras;
    const total = Number(inclusiveTotal.toFixed(2));
    
    // Backend formula: taxableSubtotal = round(inclusiveTotal / (1 + gstRate), 2)
    const taxableSubtotal = Number((total / (1 + GST_RATE)).toFixed(2));
    
    // Backend formula: base = max(0, round(taxableSubtotal - extraCharges, 2))
    const baseCandidate = Number((taxableSubtotal - summaryExtras).toFixed(2));
    
    // Backend formula: taxAmount = round(inclusiveTotal - taxableSubtotal, 2)
    const taxes = Number((total - taxableSubtotal).toFixed(2));
    
    console.log('🔍 computeInclusiveBreakdown: Matching backend PDF logic', {
      baseFare,
      summaryExtras,
      inclusiveTotal: total,
      taxableSubtotal,
      baseCandidate,
      taxes,
      note: 'For GST-inclusive, baseFare (3000) + extras IS the total, then back-calculate base and taxes'
    });
    
    return {
      base: Number(Math.max(0, baseCandidate).toFixed(2)),
      taxes: Number(Math.max(0, taxes).toFixed(2)),
      total
    };
  };

  // When we have stored invoice, use its mode (include_tax) - parent state may be stale on reopen
  const hasStoredBackendValues = backendBaseAmount != null && backendTaxAmount != null && backendTotalAmount != null;
  const effectiveGstEnabled = hasStoredBackendValues && typeof (invoiceData?.gstEnabled ?? invoiceData?.gst_enabled) === 'boolean'
    ? !!(invoiceData?.gstEnabled ?? invoiceData?.gst_enabled)
    : gstEnabled;
  const effectiveIncludeTax = hasStoredBackendValues && typeof (invoiceData?.includeTax ?? invoiceData?.include_tax) === 'boolean'
    ? !!(invoiceData?.includeTax ?? invoiceData?.include_tax)
    : includeTax;

  // GST calculation: single source of truth - ALWAYS use stored invoice values when available.
  // This prevents values changing on popup reopen due to recalculation with different inputs.
  const summaryValues = useMemo(() => {
    let summaryBaseFare: number;
    let summaryTaxes: number;
    let summaryTotal: number;

    // When we have stored invoice (from get-invoice API), use it EXCLUSIVELY - no recalculation
    const hasStoredInvoice =
      backendBaseAmount != null &&
      backendTaxAmount != null &&
      backendTotalAmount != null &&
      backendTotalAmount > 0;

    if (hasStoredInvoice) {
      summaryBaseFare = Number(backendBaseAmount.toFixed(2));
      summaryTaxes = Number(backendTaxAmount.toFixed(2));
      summaryTotal = Number(backendTotalAmount.toFixed(2));

      // Legacy / bug rows: base_amount saved as 0 while total is correct (common on outstation if fare field wasn't wired into invoice insert)
      if (summaryBaseFare <= 0 && summaryTotal > 0) {
        if (effectiveGstEnabled && effectiveIncludeTax) {
          const taxable = Number((summaryTotal / (1 + GST_RATE)).toFixed(2));
          summaryBaseFare = Number(Math.max(0, taxable - summaryExtras).toFixed(2));
          const impliedTax = Number((summaryTotal - taxable).toFixed(2));
          if (summaryTaxes <= 0.01 || Math.abs(summaryTaxes - impliedTax) > 0.05) {
            summaryTaxes = impliedTax;
          }
        } else if (effectiveGstEnabled && !effectiveIncludeTax) {
          summaryBaseFare = Number(
            Math.max(0, summaryTotal - summaryTaxes - summaryExtras).toFixed(2)
          );
        } else {
          summaryBaseFare = Number(Math.max(0, summaryTotal - summaryExtras).toFixed(2));
        }
        if (summaryBaseFare <= 0 && typeof booking.fare === 'number' && booking.fare > 0) {
          summaryBaseFare = Number(booking.fare.toFixed(2));
        }
      }
      return { summaryBaseFare, summaryTaxes, summaryTotal };
    }

    // No stored invoice - calculate from booking data
    if (effectiveGstEnabled && effectiveIncludeTax) {
      const bookingTotalRaw =
        typeof booking.totalAmount === 'number' && booking.totalAmount > 0
          ? booking.totalAmount
          : typeof (booking as any).total_amount === 'number' && (booking as any).total_amount > 0
            ? ((booking as any).total_amount as number)
            : 0;
      let lockedInclusive = baseFare;
      if (lockedInclusive <= 0 && bookingTotalRaw > 0) {
        lockedInclusive = Number(Math.max(0, bookingTotalRaw - summaryExtras).toFixed(2));
      }
      const inclusiveTotal = lockedInclusive + summaryExtras;
      const total = Number(inclusiveTotal.toFixed(2));
      const preTaxTotal = total > 0 ? Number((total / (1 + GST_RATE)).toFixed(2)) : 0;
      const totalGST = total > 0 ? Number((total - preTaxTotal).toFixed(2)) : 0;
      const totalInclusive = inclusiveTotal;
      const preTaxBase =
        totalInclusive > 0
          ? Number(((lockedInclusive / totalInclusive) * preTaxTotal).toFixed(2))
          : lockedInclusive > 0
            ? Number((lockedInclusive / (1 + GST_RATE)).toFixed(2))
            : 0;
      summaryBaseFare = Number(Math.max(0, preTaxBase).toFixed(2));
      summaryTaxes = totalGST;
      summaryTotal = total;
    } else if (effectiveGstEnabled && !effectiveIncludeTax) {
      const base = Number(Math.max(0, exclusiveBaseFallback || baseFare).toFixed(2));
      const subtotal = Number((base + summaryExtras).toFixed(2));
      const taxes = Number((subtotal * GST_RATE).toFixed(2));
      summaryBaseFare = base;
      summaryTaxes = taxes;
      summaryTotal = Number((subtotal + taxes).toFixed(2));
    } else {
      summaryBaseFare = Math.max(0, fallbackBaseFare);
      summaryTaxes = 0;
      summaryTotal = Number((summaryBaseFare + summaryExtras).toFixed(2));
    }

    return { summaryBaseFare, summaryTaxes, summaryTotal };
  }, [
    effectiveGstEnabled,
    effectiveIncludeTax,
    baseFare,
    summaryExtras,
    GST_RATE,
    backendBaseAmount,
    backendTaxAmount,
    backendTotalAmount,
    exclusiveBaseFallback,
    fallbackBaseFare,
    booking.fare,
    booking.totalAmount,
    (booking as any).total_amount,
  ]);

  const { summaryBaseFare, summaryTaxes, summaryTotal } = summaryValues;
  
  // CRITICAL FIX: Use summaryTaxes (which is calculated correctly for the current mode) for display
  // Don't use backendTaxAmount directly as it might be from the wrong mode (tax-inclusive vs tax-exclusive)
  // summaryTaxes is already calculated correctly in summaryValues useMemo based on the current mode
  const displayTaxAmount = summaryTaxes;
  
  console.log('🔍 displayTaxAmount calculation', {
    summaryTaxes,
    backendTaxAmount,
    gstEnabled,
    includeTax,
    mode: gstEnabled && includeTax ? 'tax-inclusive' : gstEnabled && !includeTax ? 'tax-exclusive' : 'gst-disabled',
    note: 'Using summaryTaxes which is calculated correctly for current mode'
  });
  
  // CRITICAL: Verify backend values are being used correctly
  if (backendTaxAmount !== null && backendCgstAmount !== null && backendSgstAmount !== null) {
    const cgstSgstSum = Number((backendCgstAmount + backendSgstAmount).toFixed(2));
    const taxAmountRounded = Number(backendTaxAmount.toFixed(2));
    if (Math.abs(cgstSgstSum - taxAmountRounded) > 0.01) {
      console.warn('⚠️ Backend CGST+SGST mismatch:', {
        backendTaxAmount,
        backendCgstAmount,
        backendSgstAmount,
        cgstSgstSum,
        difference: Math.abs(cgstSgstSum - taxAmountRounded)
      });
    }
  }
  
  // Debug logging for summary calculation
  console.log('📊 Summary Calculation:', {
    invoiceData_available: !!invoiceData,
    gstEnabled,
    includeTax,
    toggle_state: gstEnabled ? (includeTax ? 'GST_ENABLED_INCLUDE_TAX' : 'GST_ENABLED_EXCLUDE_TAX') : 'GST_DISABLED_NEUTRAL',
    summaryBaseFare,
    summaryExtras,
    summaryTaxes,
    summaryTotal,
    invoiceData_totalAmount: invoiceData?.totalAmount,
    invoiceData_baseAmount: invoiceData?.baseAmount,
    invoiceData_totalExtraCharges: invoiceData?.totalExtraCharges,
    fallbackBaseFare,
    fallbackExtras,
    parsedSummary_baseFare: parsedSummary?.baseFare,
    parsedSummary_extraCharges: parsedSummary?.extraCharges,
    note: gstEnabled ? 'GST calculation applied' : 'GST disabled - base fare unchanged, no tax applied'
  });
  const summaryIsIGST = parsedSummary?.isIGST ?? isIGST;

  const formatCurrency = useCallback(
    (amount: number, fractionDigits = 2) => {
      if (typeof amount !== 'number' || isNaN(amount)) {
        return '0.00';
      }
      return amount.toLocaleString('en-IN', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
      });
    },
    []
  );

  const sanitizeInvoiceHtml = useCallback((html: string | null | undefined) => {
    if (!html) return html ?? null;
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return html;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const textUpdates: Array<{ selector: string; regex: RegExp; replacement: string }> = [
        { selector: 'body', regex: /Additional\s+12%\s+GST/gi, replacement: 'Additional 18% GST' },
        { selector: 'body', regex: /CGST\s*\(6%\)/gi, replacement: 'CGST (9%)' },
        { selector: 'body', regex: /SGST\s*\(6%\)/gi, replacement: 'SGST (9%)' },
        { selector: 'body', regex: /IGST\s*\(12%\)/gi, replacement: 'IGST (18%)' },
        { selector: 'body', regex: /CGST\s*6%\s*\+\s*SGST\s*6%/gi, replacement: 'CGST 9% + SGST 9%' },
        { selector: 'body', regex: /12%\s*GST/gi, replacement: '18% GST' }
      ];

      textUpdates.forEach(({ selector, regex, replacement }) => {
        const node = doc.querySelector(selector);
        if (node && node.innerHTML) {
          node.innerHTML = node.innerHTML.replace(regex, replacement);
        }
      });

      const taxNote = doc.querySelector<HTMLElement>('.tax-note');
      if (taxNote) {
        taxNote.textContent = gstEnabled
          ? summaryIsIGST
            ? 'This invoice includes GST as per applicable rates. IGST 18% has been applied.'
            : 'This invoice includes GST as per applicable rates. CGST 9% + SGST 9% has been applied.'
          : taxNote.textContent;
      }

      // CRITICAL: Always update base fare, regardless of GST enabled status
      // The backend might generate HTML with ₹0.00, so we need to fix it
      const formatCurrencyValue = (value: number) => {
        if (typeof value !== 'number' || isNaN(value)) {
          return '₹ 0.00';
        }
        return `₹ ${value.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      };

      const summary = parseInvoiceSummary(html);
      
      // Define extrasAmount early so it can be used in calculations
      const extrasAmount = (invoiceData && typeof invoiceData.totalExtraCharges === 'number' && invoiceData.totalExtraCharges >= 0)
        ? invoiceData.totalExtraCharges
        : fallbackExtras;
      
      // CRITICAL FIX: Use backend's baseAmount directly when available to ensure consistency
      // This ensures the breakdown uses the same base fare as the summary
      let baseAmount: number;
      if (gstEnabled && includeTax) {
        // GST-INCLUSIVE: Use backend's baseAmount if available, otherwise use summaryBaseFare
        // This ensures summary and breakdown match exactly
        if (backendBaseAmount !== null && backendBaseAmount > 0) {
          baseAmount = Number(backendBaseAmount.toFixed(2));
          console.log('🔍 GST-INCLUSIVE: Using backend baseAmount for HTML sanitization (CRITICAL FIX)', {
            backendBaseAmount,
            summaryBaseFare,
            invoiceData_baseAmount: invoiceData?.baseAmount,
            note: 'Using backend baseAmount to ensure summary matches breakdown'
          });
        } else {
          baseAmount = summaryBaseFare > 0 ? summaryBaseFare : fallbackBaseFare;
          console.log('🔍 GST-INCLUSIVE: Using calculated summaryBaseFare (backend baseAmount not available)', {
            summaryBaseFare,
            fallbackBaseFare,
            invoiceData_baseAmount: invoiceData?.baseAmount
          });
        }
      } else {
        // GST-EXCLUSIVE or GST-DISABLED: Use summaryBaseFare with fallback to invoiceData.baseAmount
        baseAmount = summaryBaseFare > 0
          ? summaryBaseFare
          : (invoiceData && typeof invoiceData.baseAmount === 'number' && invoiceData.baseAmount > 0
            ? invoiceData.baseAmount
            : fallbackBaseFare);
        
        // CRITICAL: Ensure baseAmount is not the total amount for GST-exclusive mode
      if (invoiceData && typeof invoiceData.totalAmount === 'number' && invoiceData.totalAmount > 0) {
        if (Math.abs(baseAmount - invoiceData.totalAmount) < 0.01 && gstEnabled && !includeTax) {
          // Tax-exclusive mode: baseAmount should NOT equal totalAmount
          // If they're equal, use the original booking total as base fare
          console.warn('⚠️ baseAmount equals totalAmount in EXCLUSIVE mode - using original booking total as base fare');
          baseAmount = originalTotalAmount > 0 ? (originalTotalAmount - extrasAmount) : baseAmount;
          }
        }
      }
      
      console.log('🔍 Sanitization Debug:', {
        baseFare_from_component: baseFare,
        invoiceData_baseAmount: invoiceData?.baseAmount,
        summary_baseFare: summary?.baseFare,
        fallbackBaseFare,
        final_baseAmount: baseAmount
      });
      
      // Find and update base fare cells - ALWAYS do this, not just when GST is enabled
      const baseCells: HTMLElement[] = [];
      const rows = Array.from(doc.querySelectorAll('tr'));
      rows.forEach(row => {
        const cells = row.querySelectorAll<HTMLTableCellElement>('td,th');
        if (cells.length < 2) return;

        const labelCell = cells[0];
        const amountCell = cells[1];
        const label = (labelCell.textContent || '').trim().toLowerCase();

        // Match "Base Fare" with optional "(excluding tax)" or other text
        if (/base fare/i.test(label) && !/extra/i.test(label)) {
          baseCells.push(amountCell);
          console.log('✅ Found base fare cell:', {
            label: labelCell.textContent?.trim(),
            currentAmount: amountCell.textContent?.trim()
          });
        }
      });

      console.log('🔍 Base cells found:', baseCells.length, 'baseAmount to apply:', baseAmount);

      const updateAmountCell = (cell: HTMLElement, value: number, labelText?: string) => {
        cell.textContent = formatCurrencyValue(value);
        if (labelText && cell.previousElementSibling instanceof HTMLElement) {
          cell.previousElementSibling.textContent = labelText;
        }
      };

            const cgstCells: HTMLElement[] = [];
            const sgstCells: HTMLElement[] = [];
            const igstCells: HTMLElement[] = [];
            const genericGstCells: HTMLElement[] = [];
            const totalCells: HTMLElement[] = [];

            rows.forEach(row => {
              const cells = row.querySelectorAll<HTMLTableCellElement>('td,th');
              if (cells.length < 2) return;
              const labelCell = cells[0];
              const amountCell = cells[1];
              const label = (labelCell.textContent || '').trim().toLowerCase();

              if (/igst/i.test(label)) {
                igstCells.push(amountCell);
              } else if (/cgst/i.test(label)) {
                cgstCells.push(amountCell);
              } else if (/sgst/i.test(label)) {
                sgstCells.push(amountCell);
        } else if (/gst/i.test(label)) {
                genericGstCells.push(amountCell);
              }

              if ((/total amount/i.test(label) || /grand total/i.test(label)) && !/extra/i.test(label)) {
                totalCells.push(amountCell);
        }
      });

      // Always update base fare cells if found
      if (baseCells.length > 0 && baseAmount > 0) {
        // When GST is disabled, don't show tax-related labels
        const baseLabel = gstEnabled 
          ? (includeTax ? 'Base Fare' : 'Base Fare (excluding tax)')
          : 'Base Fare';
        console.log('✅ Updating', baseCells.length, 'base fare cells with amount:', baseAmount);
        baseCells.forEach(cell => updateAmountCell(cell, baseAmount, baseLabel));
      } else if (baseCells.length === 0) {
        console.warn('⚠️ No base fare cells found in HTML!');
      }

      // Update GST/total rows using derived summary values
      // CRITICAL FIX: Always use summaryTaxes (correctly calculated for current mode) for CGST/SGST
      // Don't use backendCgstAmount/backendSgstAmount/backendTaxAmount as they might be from wrong mode
      if (gstEnabled) {
        // Always use summaryTaxes which is correctly calculated for the current mode (tax-inclusive vs tax-exclusive)
        let cgstValue: number;
        let sgstValue: number;
        let igstValue: number;
        
        if (summaryIsIGST) {
          igstValue = summaryTaxes;
          cgstValue = 0;
          sgstValue = 0;
        } else {
          // Split summaryTaxes (which is correct for current mode) into CGST and SGST
          // Only use backend CGST/SGST if they sum to summaryTaxes (to ensure they match current mode)
          if (backendCgstAmount !== null && backendSgstAmount !== null) {
            const backendTaxSum = Number((backendCgstAmount + backendSgstAmount).toFixed(2));
            // Only use backend values if they match summaryTaxes (correct for current mode)
            if (Math.abs(backendTaxSum - summaryTaxes) < 0.01) {
              cgstValue = Number(backendCgstAmount.toFixed(2));
              sgstValue = Number(backendSgstAmount.toFixed(2));
            } else {
              // Backend values don't match current mode, use summaryTaxes split
              cgstValue = Number((summaryTaxes / 2).toFixed(2));
              sgstValue = Number((summaryTaxes - cgstValue).toFixed(2));
            }
          } else {
            // No backend CGST/SGST, split summaryTaxes
            cgstValue = Number((summaryTaxes / 2).toFixed(2));
            sgstValue = Number((summaryTaxes - cgstValue).toFixed(2));
          }
          igstValue = 0;
        }
        
        console.log('🔍 CGST/SGST calculation for breakdown', {
          summaryTaxes,
          backendCgstAmount,
          backendSgstAmount,
          backendTaxAmount,
          cgstValue,
          sgstValue,
          igstValue,
          includeTax,
          mode: includeTax ? 'tax-inclusive' : 'tax-exclusive',
          note: 'Using summaryTaxes (correct for current mode) for CGST/SGST split'
        });

        if (summaryIsIGST) {
              const targets = igstCells.length > 0 ? igstCells : genericGstCells;
              targets.forEach(cell => updateAmountCell(cell, igstValue, 'IGST (18%)'));
              } else {
                if (cgstCells.length > 0) {
                  cgstCells.forEach(cell => updateAmountCell(cell, cgstValue, 'CGST (9%)'));
                }
                if (sgstCells.length > 0) {
                  sgstCells.forEach(cell => updateAmountCell(cell, sgstValue, 'SGST (9%)'));
                }
          if (cgstCells.length === 0 && sgstCells.length === 0 && genericGstCells.length > 0) {
            genericGstCells.forEach(cell => updateAmountCell(cell, summaryTaxes, 'GST (18%)'));
          }
        }
        totalCells.forEach(cell => updateAmountCell(cell, summaryTotal));
      } else {
        totalCells.forEach(cell => updateAmountCell(cell, summaryTotal));
      }

      let out = doc.documentElement.outerHTML;
      out = patchInvoiceHtmlTripSummary(out, tripSummary);
      out = patchInvoiceHtmlBillingAddress(out, billingAddress);
      if (customInvoiceNumber.trim()) {
        out = patchInvoiceHtmlInvoiceNumber(out, customInvoiceNumber.trim());
      }
      if (!tripSummary.tripType.trim()) {
        out = patchInvoiceHtmlTripTypeCell(out, booking);
      }
      return out;
    } catch (error) {
      console.error('Failed to sanitize admin invoice HTML:', error);
      let out = patchInvoiceHtmlTripSummary(html, tripSummary);
      out = patchInvoiceHtmlBillingAddress(out, billingAddress);
      if (customInvoiceNumber.trim()) {
        out = patchInvoiceHtmlInvoiceNumber(out, customInvoiceNumber.trim());
      }
      if (!tripSummary.tripType.trim()) {
        out = patchInvoiceHtmlTripTypeCell(out, booking);
      }
      return out;
    }
  }, [gstEnabled, summaryIsIGST, fallbackBaseFare, fallbackExtras, includeTax, baseFare, invoiceData, summaryBaseFare, summaryTaxes, summaryTotal, originalTotalAmount, backendTaxAmount, backendCgstAmount, backendSgstAmount, booking, tripSummary, billingAddress, customInvoiceNumber]);

  const htmlContent = useMemo(
    () => sanitizeInvoiceHtml(rawHtmlContent),
    [rawHtmlContent, sanitizeInvoiceHtml]
  );

  // Function to reset base fare if needed (for development/debugging)
  const resetBaseFare = () => {
    localStorage.removeItem(originalBaseFareKey);
    console.log(`Base fare reset for booking ${booking.id}`);
  };

  useEffect(() => {
    async function fetchLatestInvoice() {
      if (booking && booking.id) {
        try {
          setLoading(true);
          const resp = await fetch(`/api/admin/get-invoice.php?booking_id=${booking.id}`);
          const data = await resp.json();
          
          if (data.status === 'success' && data.invoice) {
            const rawHtml = data.invoice.invoice_html ?? data.invoice.invoiceHtml ?? null;
            const fetchedInvoiceNumber = (data.invoice.invoice_number || data.invoice.invoiceNumber || '').trim();
            const storedSettings = readStoredInvoiceSettings(booking.id);
            const storedCustomNumber = String(storedSettings?.customInvoiceNumber ?? '').trim();
            const effectiveInvoiceNumber = storedCustomNumber || fetchedInvoiceNumber;

            let patchedHtml = rawHtml;
            if (patchedHtml && storedSettings) {
              if (storedCustomNumber) {
                patchedHtml = patchInvoiceHtmlInvoiceNumber(patchedHtml, storedCustomNumber);
              }
              patchedHtml = patchInvoiceHtmlTripSummary(
                patchedHtml,
                mergeTripSummary(storedSettings.tripSummary, booking)
              );
              patchedHtml = patchInvoiceHtmlBillingAddress(
                patchedHtml,
                storedSettings.billingAddress ?? getDefaultBillingAddress(booking)
              );
            }

            const sanitizedHtml = patchedHtml ? sanitizeInvoiceHtml(patchedHtml) : null;
            const invoicePayload = {
              ...data.invoice,
              invoiceNumber: effectiveInvoiceNumber,
              invoice_number: effectiveInvoiceNumber,
              invoiceHtml: sanitizedHtml ?? patchedHtml ?? rawHtml,
              invoice_html: sanitizedHtml ?? patchedHtml ?? rawHtml,
              // Normalize field names - use camelCase with fallback to snake_case
              baseAmount: data.invoice.baseAmount ?? data.invoice.base_amount ?? 0,
              taxAmount: data.invoice.taxAmount ?? data.invoice.tax_amount ?? 0,
              totalAmount: data.invoice.totalAmount ?? data.invoice.total_amount ?? 0,
              totalExtraCharges: data.invoice.totalExtraCharges ?? data.invoice.total_extra_charges ?? 0,
              cgstAmount: data.invoice.cgstAmount ?? data.invoice.cgst_amount ?? 0,
              sgstAmount: data.invoice.sgstAmount ?? data.invoice.sgst_amount ?? 0,
              igstAmount: data.invoice.igstAmount ?? data.invoice.igst_amount ?? 0
            };

            // Only update if data actually changed to prevent infinite loops
            setInvoiceData(prev => {
              if (prev && JSON.stringify(prev) === JSON.stringify(invoicePayload)) {
                return prev; // Return same reference if data hasn't changed
              }
              return invoicePayload;
            });
            
            // Use invoice for display (invoiceData, rawHtml). For form state: prefer localStorage so user changes persist.
            // Only sync invoiceState from DB when we have NO stored settings - prevents overwriting user's unsaved changes.
            const hasStoredSettings = !!localStorage.getItem(`invoice-settings-${booking.id}`);
            if (!hasStoredSettings) {
              const fetchedGstEnabled = !!(data.invoice.gst_enabled ?? data.invoice.gstEnabled);
              const fetchedGstDetails = {
                gstNumber: data.invoice.gst_number || data.invoice.gstNumber || '',
                companyName: data.invoice.company_name || data.invoice.companyName || '',
                companyAddress: data.invoice.company_address || data.invoice.companyAddress || ''
              };
              const fetchedIncludeTax = !!(data.invoice.include_tax ?? data.invoice.includeTax ?? true);
              const fetchedIsIGST = !!(data.invoice.is_igst ?? data.invoice.isIGST);
              onInvoiceStateChange({
                ...invoiceState,
                gstEnabled: fetchedGstEnabled,
                gstDetails: fetchedGstDetails,
                customInvoiceNumber: fetchedInvoiceNumber,
                includeTax: fetchedIncludeTax,
                isIGST: fetchedIsIGST
              });
            } else if (storedCustomNumber && storedCustomNumber !== fetchedInvoiceNumber) {
              // Stored custom number differs from DB — keep settings field and patched preview in sync
              onInvoiceStateChange({
                ...invoiceState,
                customInvoiceNumber: storedCustomNumber,
              });
            }
            
            // Set HTML content if available
            if (patchedHtml || rawHtml) {
              setRawHtmlContent(sanitizedHtml ?? patchedHtml ?? rawHtml);
            } else {
              setRawHtmlContent(null);
            }
          } else {
            // Prefill from booking → guest GST details
            const prefillGstEnabled = Boolean((booking as any).gstEnabled);
            const prefillGstDetails = (booking as any).gstDetails || null;
            if (!localStorage.getItem(`invoice-settings-${booking.id}`) && (prefillGstEnabled || prefillGstDetails)) {
              onInvoiceStateChange({
                ...invoiceState,
                gstEnabled: prefillGstEnabled,
                isIGST: false,
                includeTax: true,
                customInvoiceNumber: '',
                adminNotes: (invoiceState?.adminNotes as string) || (booking as any).adminNotes || '',
                gstDetails: {
                  gstNumber: prefillGstDetails?.gstNumber || '',
                  companyName: prefillGstDetails?.companyName || '',
                  companyAddress: prefillGstDetails?.companyAddress || ''
                }
              });
            }
            console.log('No existing invoice found, using stored/booking settings');
            setInvoiceData(null);
          }
        } catch (e) {
          console.error('Error fetching invoice:', e);
          setInvoiceData(null);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchLatestInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id, onInvoiceStateChange]);

  // Only generate new invoice if we don't have existing data and we're not loading
  // CRITICAL: Prevent infinite loops by only attempting once per booking
  useEffect(() => {
    if (booking && booking.id && !loading && invoiceData === null && !isSubmitting && !hasAttemptedGeneration) {
      console.log('No existing invoice found, generating new one with current settings');
      setHasAttemptedGeneration(true); // Mark as attempted to prevent retry loop
      handleGenerateInvoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id, loading, invoiceData, isSubmitting, hasAttemptedGeneration]);
  
  // CRITICAL FIX: Regenerate invoice when includeTax or gstEnabled changes
  // This ensures the backend recalculates with the correct mode (tax-inclusive vs tax-exclusive)
  useEffect(() => {
    // Only regenerate if we have an existing invoice and the mode has changed
    if (invoiceData && booking && booking.id && !loading && !isSubmitting) {
      const previousIncludeTax = invoiceData.includeTax ?? invoiceData.include_tax ?? null;
      const previousGstEnabled = invoiceData.gstEnabled ?? invoiceData.gst_enabled ?? null;
      const currentMode = gstEnabled ? (includeTax ? 'TAX-INCLUSIVE' : 'TAX-EXCLUSIVE') : 'NO-GST';
      const previousMode = previousGstEnabled ? (previousIncludeTax ? 'TAX-INCLUSIVE' : 'TAX-EXCLUSIVE') : 'NO-GST';
      
      // #region agent log
      console.log('🔍 includeTax or gstEnabled changed - checking if regeneration needed', {
        gstEnabled,
        includeTax,
        previousIncludeTax,
        previousGstEnabled,
        currentMode,
        previousMode,
        modeChanged: currentMode !== previousMode,
        includeTaxChanged: includeTax !== previousIncludeTax,
        gstEnabledChanged: gstEnabled !== previousGstEnabled,
        note: 'Regenerating to get correct backend calculations for new mode'
      });
      // #endregion
      
      // Only regenerate if the mode actually changed
      if (currentMode !== previousMode || includeTax !== previousIncludeTax || gstEnabled !== previousGstEnabled) {
        // #region agent log
        console.log('🔍 Mode changed - regenerating invoice', {currentMode, previousMode});
        // #endregion
        // Reset invoice data to trigger regeneration
        setInvoiceData(null);
        setRawHtmlContent(null);
        setHasAttemptedGeneration(false);
        // Use setTimeout to ensure state is fully updated before regenerating
        setTimeout(() => {
          // #region agent log
          console.log('🔍 Calling handleGenerateInvoice with current state', {gstEnabled, includeTax});
          // #endregion
          handleGenerateInvoice(true);
        }, 50); // Small delay to ensure state is fully updated
      } else {
        // #region agent log
        console.log('🔍 Mode did not change - skipping regeneration', {currentMode, previousMode});
        // #endregion
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeTax, gstEnabled]);
  
  // Reset hasAttemptedGeneration when booking changes
  useEffect(() => {
    setHasAttemptedGeneration(false);
    setError(null);
  }, [booking.id]);

  const validateGSTDetails = () => {
    if (gstEnabled) {
      if (!gstDetails.gstNumber || gstDetails.gstNumber.trim() === '') {
        setActiveTab("settings");
        toast({
          variant: "destructive",
          title: "Missing GST Number",
          description: "Please enter a valid GST number"
        });
        return false;
      }
      
      if (!gstDetails.companyName || gstDetails.companyName.trim() === '') {
        setActiveTab("settings");
        toast({
          variant: "destructive",
          title: "Missing Company Name",
          description: "Please enter the company name"
        });
        return false;
      }
    }
    return true;
  };

  const handleGenerateInvoice = async (isManualRetry = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // If this is a manual retry, reset the attempt flag
      if (isManualRetry) {
        setHasAttemptedGeneration(false);
      }
      
      if (!validateGSTDetails()) {
        setLoading(false);
        return;
      }
      
      // #region agent log
      console.log('🔥 INVOICE GENERATION DEBUG:');
      console.log('Booking ID:', booking.id);
      console.log('Locked Base Fare (frontend):', baseFare);
      console.log('Booking totalAmount:', booking.totalAmount);
      console.log('Booking fare:', booking.fare);
      console.log('Extra charges total:', extraChargesTotal);
      console.log('GST Settings:', { gstEnabled, isIGST, includeTax, includeTaxType: typeof includeTax });
      // #endregion
      
      // When exclusive: quotedBaseFare overrides - use for different total. When inclusive: lockedBaseFare ignored.
      const quotedBase = !includeTax && gstDetails.quotedBaseFare
        ? parseFloat(String(gstDetails.quotedBaseFare).trim())
        : null;
      const extendedGstDetails = gstEnabled ? {
        ...gstDetails,
        lockedBaseFare: baseFare,
        quotedBaseFare: quotedBase ?? undefined,
        originalTotalAmount: booking.totalAmount,
        originalFare: booking.fare,
        extraChargesTotal: extraChargesTotal
      } : {
        lockedBaseFare: baseFare,
        quotedBaseFare: quotedBase ?? undefined,
        originalTotalAmount: booking.totalAmount,
        originalFare: booking.fare,
        extraChargesTotal: extraChargesTotal
      };
      
      // #region agent log
      console.log('Extended GST Details being sent:', extendedGstDetails);
      console.log('🔍 About to call onGenerateInvoice with:', {
        gstEnabled,
        isIGST,
        includeTax,
        includeTaxType: typeof includeTax,
        customInvoiceNumber: customInvoiceNumber.trim() || undefined
      });
      // #endregion
                 
      const result = await onGenerateInvoice(
        gstEnabled, 
        extendedGstDetails, 
        isIGST,
        includeTax,
        customInvoiceNumber.trim() || undefined,
        (adminNotes || '').trim() || undefined,
        tripSummary,
        billingAddress.trim() || undefined
      );
      
      console.log('📨 Invoice generation result received:', result);
      console.log('📊 Result data structure:', result?.data);
      
      // CRITICAL: Log backend debug info for production troubleshooting
      if (result?._debug) {
        console.log('🔍 BACKEND DEBUG INFO (Production Troubleshooting):', result._debug);
        console.log('🔍 Calculation Mode:', result._debug.calculationMode);
        console.log('🔍 Backend Verification:', result._debug.verification);
        if (result._debug.verification) {
          const v = result._debug.verification;
          console.log('🔍 Expected Total:', v.expectedTotal, 'Actual Total:', v.totalAmount, 'Match:', Math.abs(v.expectedTotal - v.totalAmount) < 0.01);
          console.log('🔍 CGST+SGST Sum:', v.cgstSgstSum, 'Tax Amount:', v.taxAmount, 'Match:', v.matchesTaxAmount);
        }
      }
      
      // Check if result is null (error case)
      if (!result) {
        throw new Error('Invoice generation returned null - check backend logs for details');
      }
      
      if (result && result.data) {
        const rawHtml = result.data.invoiceHtml ?? result.data.invoice_html ?? null;
        const sanitizedHtml = sanitizeInvoiceHtml(rawHtml);
        // CRITICAL: Normalize all field names to camelCase for consistent access
        // CRITICAL FIX: For tax-exclusive mode, don't use backend baseAmount if it's stale
        // Backend baseAmount might be from a previous tax-inclusive calculation
        // For tax-exclusive, preserve the correct baseFare (from booking.fare or localStorage)
        const backendBaseAmount = result.data.baseAmount ?? result.data.base_amount;
        const shouldUseBackendBaseAmount = !(gstEnabled && !includeTax); // Don't use for tax-exclusive
        
        const invoicePayload = {
          ...result.data,
          invoiceNumber: customInvoiceNumber.trim() || result.data.invoiceNumber || result.data.invoice_number,
          invoiceHtml: sanitizedHtml ?? rawHtml,
          invoice_html: sanitizedHtml ?? rawHtml,
          // Normalize field names - use camelCase with fallback to snake_case
          // CRITICAL: For tax-exclusive, use baseFare (correct pre-tax base) instead of backend baseAmount
          baseAmount: shouldUseBackendBaseAmount && backendBaseAmount 
            ? backendBaseAmount 
            : baseFare, // Use current baseFare for tax-exclusive mode
          taxAmount: result.data.taxAmount ?? result.data.tax_amount ?? 0,
          totalAmount: result.data.totalAmount ?? result.data.total_amount ?? 0,
          totalExtraCharges: result.data.totalExtraCharges ?? result.data.total_extra_charges ?? 0,
          cgstAmount: result.data.cgstAmount ?? result.data.cgst_amount ?? 0,
          sgstAmount: result.data.sgstAmount ?? result.data.sgst_amount ?? 0,
          igstAmount: result.data.igstAmount ?? result.data.igst_amount ?? 0
        };
        
        // #region agent log
        console.log('🔍 Invoice payload baseAmount decision:', {
          gstEnabled,
          includeTax,
          mode: gstEnabled ? (includeTax ? 'TAX-INCLUSIVE' : 'TAX-EXCLUSIVE') : 'NO-GST',
          backendBaseAmount,
          currentBaseFare: baseFare,
          shouldUseBackendBaseAmount,
          finalBaseAmount: invoicePayload.baseAmount,
          note: 'For tax-exclusive, preserving correct baseFare instead of potentially stale backend baseAmount'
        });
        // #endregion
        console.log('📦 Invoice data being set (NORMALIZED):', {
          baseAmount: invoicePayload.baseAmount,
          taxAmount: invoicePayload.taxAmount,
          totalAmount: invoicePayload.totalAmount,
          totalExtraCharges: invoicePayload.totalExtraCharges,
          cgstAmount: invoicePayload.cgstAmount,
          sgstAmount: invoicePayload.sgstAmount,
          igstAmount: invoicePayload.igstAmount,
          raw_response: result.data
        });
        setInvoiceData(invoicePayload);
        setRawHtmlContent(sanitizedHtml ?? rawHtml ?? null);

        const resolvedInvoiceNumber =
          customInvoiceNumber.trim() ||
          String(result.data.invoiceNumber ?? result.data.invoice_number ?? '').trim();
        if (resolvedInvoiceNumber) {
          onInvoiceStateChange({
            ...invoiceState,
            customInvoiceNumber: resolvedInvoiceNumber,
          });
        }

        toast({
          title: "Invoice Generated",
          description: "Invoice was generated successfully"
        });
        
        // Load HTML content immediately
        fetchHtmlInvoice();
        
        // Test if PDF generation is available
        testPdfGeneration();
      } else {
        // Don't set invoiceData to null here - it will trigger the useEffect again
        // Instead, just throw the error and let the catch block handle it
        throw new Error('No invoice data returned from the server');
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      setError(error instanceof Error ? error.message : "Failed to generate invoice");
      // CRITICAL: Don't set invoiceData to null here - it causes infinite loops
      // The hasAttemptedGeneration flag will prevent retrying
      toast({
        variant: "destructive",
        title: "Invoice Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate invoice"
      });
      
      // Don't call fetchHtmlInvoice in error handler to prevent loops
      // The user can manually retry if needed
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  // Test if PDF generation is working
  const testPdfGeneration = async () => {
    try {
      const testUrl = getApiUrl(`/api/test-pdf.php?t=${new Date().getTime()}`);
      const response = await fetch(testUrl, { method: 'GET' });
      
      if (response.ok) {
        // If we can fetch the test page, we'll assume PDF might work
        setPdfGenerationAvailable(true);
      } else {
        setPdfGenerationAvailable(false);
      }
    } catch (error) {
      console.error("PDF test error:", error);
      setPdfGenerationAvailable(false);
    }
  };

  // Fetch HTML version of invoice
  const fetchHtmlInvoice = async () => {
    try {
      const htmlUrl = createPdfUrl(false, false, true);
      const response = await fetch(htmlUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Force-Refresh': 'true',
          'X-Debug': 'true'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch HTML: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      const sanitizedHtml = sanitizeInvoiceHtml(html);
      const finalHtml = sanitizedHtml ?? html;
      setRawHtmlContent(finalHtml);
      setInvoiceData(prev => prev ? { ...prev, invoiceHtml: finalHtml, invoice_html: finalHtml } : prev);
      setActiveTab("html"); // Auto-switch to HTML tab as it's more reliable
    } catch (error) {
      console.error("HTML fetch error:", error);
      // Don't show toast for this - it's a background operation
      setError("Could not load HTML invoice. Please try regenerating the invoice.");
    }
  };

  // Create a dynamic and unique URL for PDF download
  const createPdfUrl = (directDownload = false, useAdminEndpoint = false, htmlFormat = false) => {
    const timestamp = new Date().getTime();
    const randomPart = Math.random().toString(36).substring(2, 8);
    const cacheBuster = Math.random().toString(36).substring(2, 15);
    
    const endpoint = useAdminEndpoint 
      ? `/api/admin/download-invoice.php` 
      : `/api/download-invoice.php`;
      
    const params = new URLSearchParams({
      id: booking.id.toString(),
      gstEnabled: gstEnabled ? '1' : '0',
      isIGST: isIGST ? '1' : '0',
      includeTax: includeTax ? '1' : '0',
      format: htmlFormat ? 'html' : 'pdf',
      direct_download: directDownload ? '1' : '0',
      lockedBaseFare: baseFare.toString(),  // CRITICAL: Pass locked base fare
      v: downloadCount.toString(),
      t: timestamp.toString(),
      r: randomPart,
      cb: cacheBuster  // Additional cache buster
    });
    
    if (customInvoiceNumber.trim()) {
      params.append('invoiceNumber', customInvoiceNumber.trim());
    }
    
    if (gstEnabled) {
      params.append('gstNumber', gstDetails.gstNumber);
      params.append('companyName', gstDetails.companyName);
      params.append('companyAddress', gstDetails.companyAddress || '');
    }
    if ((adminNotes || '').trim()) {
      params.append('adminNotes', (adminNotes || '').trim());
    }
    appendTripSummaryParams(params, tripSummary);
    if (billingAddress.trim()) {
      params.append('billingAddress', billingAddress.trim());
    }
    
    return getApiUrl(`${endpoint}?${params.toString()}`);
  };

  const handleDownloadPdf = () => {
    try {
      setDownloadCount((prev) => prev + 1);
      const pdfUrl = createPdfUrl(false);
      window.open(pdfUrl, '_blank');
      toast({
        title: 'PDF Opened in New Tab',
        description: 'Your invoice should open in a new browser tab',
      });
    } catch (error) {
      console.error('Invoice download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Failed to download invoice. Please try the HTML version instead.',
      });
    }
  };

  const handleViewHtml = () => {
    try {
      const htmlUrl = createPdfUrl(false, false, true);
      window.open(htmlUrl, '_blank');
      toast({
        title: 'HTML Invoice',
        description: 'HTML version of the invoice opened in a new tab',
      });
    } catch (error) {
      console.error('HTML view error:', error);
      toast({
        variant: 'destructive',
        title: 'HTML View Failed',
        description: 'Failed to open HTML invoice',
      });
    }
  };

  const handleForceDownload = () => {
    try {
      setDownloadCount((prev) => prev + 1);
      const pdfUrl = createPdfUrl(true);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Invoice_${booking.id}_${new Date().getTime()}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: 'Download Started',
        description: 'Your invoice download should begin shortly',
      });
    } catch (error) {
      console.error('Force download error:', error);
      toast({
        variant: 'destructive',
        title: 'Force Download Failed',
        description: 'Failed to force download. Try the HTML version instead.',
      });
    }
  };

  const handleAdminDownload = () => {
    try {
      setDownloadCount((prev) => prev + 1);
      const pdfUrl = createPdfUrl(true, true);
      window.open(pdfUrl, '_blank');
      toast({
        title: 'Admin PDF Download',
        description: 'Using admin endpoint to download PDF',
      });
    } catch (error) {
      console.error('Admin download error:', error);
      toast({
        variant: 'destructive',
        title: 'Admin Download Failed',
        description: 'Failed to use admin download. Try the HTML version instead.',
      });
    }
  };

  const handleTestPdfDownload = () => {
    try {
      const testUrl = getApiUrl(`/api/test-pdf.php?download=1&t=${new Date().getTime()}`);
      window.open(testUrl, '_blank');
      
      toast({
        title: "Testing PDF Generation",
        description: "Opening test PDF to verify if PDF generation works"
      });
    } catch (error) {
      console.error("Test PDF error:", error);
      toast({
        variant: "destructive",
        title: "Test PDF Failed",
        description: "Failed to open test PDF"
      });
    }
  };

  const handleGstToggle = (checked: boolean) => {
    // #region agent log
    console.log('🔍 handleGstToggle CALLED', {checked,currentGstEnabled:gstEnabled,currentIncludeTax:includeTax});
    // #endregion
    // When GST is disabled, ensure includeTax doesn't affect calculations
    // When GST is enabled, default to includeTax = true
    onInvoiceStateChange({
      ...invoiceState,
      gstEnabled: checked,
      includeTax: checked ? true : invoiceState.includeTax // Preserve includeTax value when disabling GST
    });
    
    if (checked && !includeTax) {
      toast({
        title: "Tax Inclusion Enabled",
        description: "Enabling GST defaults to include tax in the price"
      });
    } else if (!checked) {
      console.log('🔍 GST Disabled: Base fare will remain unchanged, no tax calculations will be applied', {
        gstEnabled: false,
        includeTax: invoiceState.includeTax,
        note: 'When GST is disabled, includeTax setting has no effect on base fare or total amount'
      });
    }
  };

  const handleGstDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onInvoiceStateChange({
      ...invoiceState,
      gstDetails: {
        ...invoiceState.gstDetails,
        [name]: value
      }
    });
  };

  const handleRegenerateInvoice = () => {
    if (loading || isSubmitting) return;
    
    setRegenerating(true);
    setInvoiceData(null);
    setRawHtmlContent(null);
    setHasAttemptedGeneration(false); // Reset flag to allow retry
    
    setTimeout(() => {
      handleGenerateInvoice(true); // Pass true for manual retry
    }, 100);
  };

  // Placeholder for backend update
  async function updateBookingPayment(bookingId, status, method) {
    setIsSavingPayment(true);
    try {
      const response = await fetch('/api/update-booking.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bookingId,
          payment_status: status,
          payment_method: method,
        }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setInvoiceData((prev) => ({ ...prev, paymentStatus: status, paymentMethod: method }));
        booking.payment_status = status;
        booking.payment_method = method;
        setEditMode(false);
        toast({ title: 'Payment status updated!' });
      } else {
        console.error('Update failed:', result);
        toast({ title: 'Failed to update payment status', description: result.message || '', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Failed to update payment status', variant: 'destructive' });
    } finally {
      setIsSavingPayment(false);
    }
  }

  const renderInvoiceSettings = () => {
    // Stable key for form structure - must NOT include user-typed values (gstNumber, companyName, etc.)
    // or inputs will remount on every keystroke, causing focus loss
    const stableFormKey = `${invoiceData?.id || 'new'}-${gstEnabled}-${includeTax}`;
    // forceRenderKey for container/switches; stableFormKey for inputs (avoids remount on keystroke)
    const forceRenderKey = stableFormKey;
    // #region agent log
    // Production logging: renderInvoiceSettings RENDER
    // #endregion
    
    return (
      <div 
        className="p-4 border rounded-md space-y-4" 
        key={forceRenderKey}
      >
        <div>
          <Label htmlFor="custom-invoice">Custom Invoice Number</Label>
          <Input 
            id="custom-invoice"
            key={`custom-invoice-${stableFormKey}`}
            value={customInvoiceNumber || ''}
            onChange={(e) => onInvoiceStateChange({...invoiceState, customInvoiceNumber: e.target.value})}
            placeholder="Optional - Leave blank for auto-generated number"
          />
          <p className="text-xs text-gray-500 mt-1">
            If provided, this will replace the auto-generated invoice number
          </p>
        </div>

        <div>
          <Label htmlFor="invoice-billing-address">Billing Address</Label>
          <Input
            id="invoice-billing-address"
            value={billingAddress}
            onChange={(e) => onInvoiceStateChange({ ...invoiceState, billingAddress: e.target.value })}
            placeholder="Company or billing address shown on invoice"
          />
          <p className="text-xs text-gray-500 mt-1">
            Shown under Customer Details. Prefilled from the booking; edit here to override on the invoice only.
          </p>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Trip Summary (Invoice)</h4>
            <p className="text-xs text-gray-500 mb-3">
              Override trip details shown on the invoice without changing the booking record.
            </p>
          </div>
          <div>
            <Label htmlFor="invoice-trip-type">Trip Type</Label>
            <Input
              id="invoice-trip-type"
              value={tripSummary.tripType}
              onChange={(e) => updateTripSummaryField('tripType', e.target.value)}
              placeholder="e.g. Local or Outstation (One way)"
            />
          </div>
          <div>
            <Label htmlFor="invoice-vehicle-type">Vehicle Type</Label>
            <Input
              id="invoice-vehicle-type"
              value={tripSummary.vehicleType}
              onChange={(e) => updateTripSummaryField('vehicleType', e.target.value)}
              placeholder="e.g. Sedan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-fleet-vehicle">Vehicle Number (Registration)</Label>
            <select
              id="invoice-fleet-vehicle"
              value={selectedFleetVehicleId}
              onChange={(e) => {
                const vehicle = fleetVehiclesWithNumber.find(
                  (v) => String(v.id) === e.target.value
                );
                if (vehicle) {
                  updateTripSummaryField(
                    'vehicleNumber',
                    (vehicle.vehicleNumber || vehicle.vehicle_number || '').trim()
                  );
                }
              }}
              disabled={isLoadingFleetVehicles}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {isLoadingFleetVehicles ? 'Loading fleet vehicles...' : 'Select from fleet (optional)'}
              </option>
              {fleetVehiclesWithNumber.map((vehicle) => (
                <option key={vehicle.id} value={String(vehicle.id)}>
                  {formatFleetVehicleLabel(vehicle)}
                </option>
              ))}
            </select>
            <Input
              id="invoice-vehicle-number"
              value={tripSummary.vehicleNumber}
              onChange={(e) => updateTripSummaryField('vehicleNumber', e.target.value)}
              placeholder="e.g. AP39AX0007"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                Shown on invoice as Vehicle No. Prefilled from assigned fleet vehicle; edit here to override on the invoice only.
                {booking.vehicleNumber && tripSummary.vehicleNumber !== booking.vehicleNumber
                  ? ` Booking has: ${booking.vehicleNumber}`
                  : ''}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateTripSummaryField('vehicleNumber', '')}
                disabled={!tripSummary.vehicleNumber.trim()}
              >
                Remove from invoice
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="invoice-trip-date">Date</Label>
            <Input
              id="invoice-trip-date"
              value={tripSummary.tripDate}
              onChange={(e) => updateTripSummaryField('tripDate', e.target.value)}
              placeholder="e.g. 22 Jun 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="invoice-no-hours">No. of Hours</Label>
              <Input
                id="invoice-no-hours"
                value={tripSummary.noOfHours}
                onChange={(e) => updateTripSummaryField('noOfHours', e.target.value)}
                placeholder="e.g. 8 or --"
              />
            </div>
            <div>
              <Label htmlFor="invoice-no-km">No. of Kilometers</Label>
              <Input
                id="invoice-no-km"
                value={tripSummary.noOfKilometers}
                onChange={(e) => updateTripSummaryField('noOfKilometers', e.target.value)}
                placeholder="e.g. 80 or --"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="gst-toggle"
            key={`gst-toggle-${forceRenderKey}`}
            checked={gstEnabled}
            onCheckedChange={(checked) => {
              // #region agent log
              console.log('🔍 Switch onCheckedChange FIRED', {checked,currentGstEnabled:gstEnabled});
              // #endregion
              handleGstToggle(checked);
            }}
            onClick={(e) => {
              // #region agent log
              console.log('🔍 Switch onClick FIRED', {targetTag:(e.target as HTMLElement)?.tagName,targetId:(e.target as HTMLElement)?.id});
              // #endregion
            }}
            onPointerDown={(e) => {
              // #region agent log
              console.log('🔍 Switch onPointerDown FIRED', {targetTag:(e.target as HTMLElement)?.tagName,targetId:(e.target as HTMLElement)?.id});
              // #endregion
            }}
          />
          <Label htmlFor="gst-toggle">Include GST (18%)</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="tax-toggle"
            key={`tax-toggle-${forceRenderKey}`}
            checked={includeTax}
            disabled={!gstEnabled}
            onCheckedChange={(checked) => {
              // Only allow tax toggle changes when GST is enabled
              if (gstEnabled) {
                console.log('🔍 Tax toggle changed - updating state', {
                  currentIncludeTax: includeTax,
                  newIncludeTax: checked,
                  gstEnabled,
                  note: 'State change will trigger invoice regeneration via useEffect'
                });
                onInvoiceStateChange({...invoiceState, includeTax: checked});
              }
            }}
          />
          <Label htmlFor="tax-toggle" className={!gstEnabled ? "text-gray-400" : ""}>
            {includeTax ? "Price including tax" : "Price excluding tax"}
            {!gstEnabled && " (Enable GST first)"}
          </Label>
        </div>

        {gstEnabled && !includeTax && (
          <div>
            <Label htmlFor="quotedBaseFare">Quoted base fare (excl. tax)</Label>
            <Input
              id="quotedBaseFare"
              name="quotedBaseFare"
              type="number"
              min={0}
              step={0.01}
              placeholder="e.g. 6214 - enter to get different total"
              value={gstDetails.quotedBaseFare ?? ''}
              onChange={(e) => onInvoiceStateChange({
                ...invoiceState,
                gstDetails: { ...gstDetails, quotedBaseFare: e.target.value }
              })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional. Enter the base fare you quoted (before GST) to show a different total than inclusive mode.
            </p>
          </div>
        )}
        
        {gstEnabled && (
          <div className="space-y-3" key={`gst-section-${forceRenderKey}`}>
            <div>
              <Label htmlFor="gstNumber">GST Number<span className="text-red-500">*</span></Label>
              <Input 
                id="gstNumber"
                name="gstNumber"
                key={`gstNumber-${stableFormKey}`}
                value={gstDetails.gstNumber || ''}
                onChange={handleGstDetailsChange}
                placeholder="Enter GST number"
                required
              />
            </div>
            <div>
              <Label htmlFor="companyName">Company Name<span className="text-red-500">*</span></Label>
              <Input 
                id="companyName"
                name="companyName"
                key={`companyName-${stableFormKey}`}
                value={gstDetails.companyName || ''}
                onChange={handleGstDetailsChange}
                placeholder="Enter company name"
                required
              />
            </div>
            <div>
              <Label htmlFor="companyAddress">Company Address</Label>
              <Input 
                id="companyAddress"
                name="companyAddress"
                key={`companyAddress-${stableFormKey}`}
                value={gstDetails.companyAddress || ''}
                onChange={handleGstDetailsChange}
                placeholder="Enter company address"
              />
            </div>
            <Label>GST Type</Label>
            <RadioGroup 
              key={`gst-type-${forceRenderKey}`}
              value={isIGST ? "igst" : "cgst-sgst"} 
              onValueChange={(value) => onInvoiceStateChange({...invoiceState, isIGST: value === "igst"})}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cgst-sgst" id="cgst-sgst" />
                <Label htmlFor="cgst-sgst">Intra-state (CGST 9% + SGST 9%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="igst" id="igst" />
                <Label htmlFor="igst">Inter-state (IGST 18%)</Label>
              </div>
            </RadioGroup>
           </div>
         )}
         <div>
           <Label htmlFor="adminNotes">Admin Notes</Label>
           <textarea
             id="adminNotes"
             className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
             value={adminNotes || ''}
             onChange={(e) => onInvoiceStateChange({...invoiceState, adminNotes: e.target.value})}
             placeholder="Optional - Notes shown at bottom of invoice (e.g. Driver night allowance included.)"
           />
           <p className="text-xs text-gray-500 mt-1">Only shown when not empty. Appears above the footer.</p>
         </div>
         <div className="space-y-2">
           <Button 
             variant="outline" 
             onClick={handleRegenerateInvoice}
             disabled={loading || isSubmitting || regenerating || (gstEnabled && (!gstDetails.gstNumber || !gstDetails.companyName))}
             className="w-full"
           >
             <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
             Regenerate Invoice with Current Settings
           </Button>
           
           {/* Debug button to reset base fare cache */}
           <Button 
             variant="destructive" 
             size="sm"
             onClick={() => {
               resetBaseFare();
               toast({
                 title: "Base Fare Cache Cleared",
                 description: "The locked base fare has been reset. Please regenerate the invoice."
               });
             }}
             className="w-full"
           >
             🔧 Reset Base Fare Cache (Debug)
           </Button>
         </div>
      </div>
    );
  };

  const renderInvoicePreview = () => {
    if (!invoiceData?.invoiceHtml) {
      return (
        <div className="text-center py-8 border rounded-md">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="mb-4">No invoice preview available.</p>
          <Button onClick={() => handleGenerateInvoice(true)} disabled={loading || isSubmitting}>Generate Invoice</Button>
        </div>
      );
    }
    
    return (
      <div 
        className="invoice-preview border rounded-md overflow-hidden" 
        style={{ height: '400px', overflow: 'auto' }}
      >
        <iframe 
          srcDoc={invoiceData.invoiceHtml}
          title="Invoice Preview" 
          className="w-full h-full"
          style={{ border: 'none' }}
          sandbox="allow-same-origin"
        />
      </div>
    );
  };

  const renderHtmlView = () => {
    if (!htmlContent) {
      return (
        <div className="text-center py-8 border rounded-md">
          <FileIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="mb-4">HTML invoice has not been loaded yet.</p>
          <Button onClick={fetchHtmlInvoice} disabled={loading || isSubmitting}>Load HTML Invoice</Button>
        </div>
      );
    }
    
    return (
      <div 
        className="html-preview border rounded-md overflow-hidden" 
        style={{ height: '400px', overflow: 'auto' }}
      >
        <iframe 
          srcDoc={htmlContent}
          title="HTML Invoice" 
          className="w-full h-full"
          style={{ border: 'none' }}
          sandbox="allow-same-origin"
        />
      </div>
    );
  };

  const renderInvoiceContent = () => {
    if (loading || isSubmitting) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" className="mb-4" />
          <p>Generating invoice...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (regenerating) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" className="mb-4" />
          <p>Regenerating invoice with new settings...</p>
        </div>
      );
    }

    if (invoiceData?.invoiceHtml || htmlContent) {
      return (
        <div>
          <div className="mb-4 flex justify-between">
            <h3 className="font-medium">Invoice #{displayInvoiceNumber}</h3>
            <span>Generated: {invoiceData?.invoiceDate || new Date().toLocaleDateString()}</span>
          </div>
          
          {/* Payment Status and Method */}
          <div className="mb-4 flex items-center gap-6">
            {editMode ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Payment Status:</span>
                  <select
                    value={editedStatus}
                    onChange={e => setEditedStatus(e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="payment_received">Paid</option>
                  </select>
                </div>
                {editedStatus === 'payment_received' && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Mode:</span>
                    <select
                      value={editedMethod}
                      onChange={e => setEditedMethod(e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="">Select</option>
                      {paymentMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                )}
                <Button
                  size="sm"
                  className="ml-2"
                  onClick={() => updateBookingPayment(booking.id, editedStatus, editedMethod)}
                  disabled={isSavingPayment || (editedStatus === 'payment_received' && !editedMethod)}
                >
                  {isSavingPayment ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={() => setEditMode(false)}
                  disabled={isSavingPayment}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Payment Status:</span>
                  <span className={
                    (booking.paymentStatus || booking.payment_status || invoiceData?.paymentStatus || booking.status) === 'paid'
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }>
                    {(booking.paymentStatus || booking.payment_status || invoiceData?.paymentStatus || booking.status) === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
                {(booking.payment_status === 'payment_received' || invoiceData?.paymentStatus === 'payment_received') && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Mode:</span>
                    <span>{booking.payment_method || invoiceData?.paymentMethod || 'N/A'}</span>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={() => {
                    setEditedStatus(booking.payment_status || invoiceData?.paymentStatus || 'pending');
                    setEditedMethod(booking.payment_method || invoiceData?.paymentMethod || '');
                    setEditMode(true);
                  }}
                >
                  Edit
                </Button>
              </>
            )}
          </div>
          
          {/* PATCH: Render correct fare breakdown in the invoice preview (HTML or JSX) */}
          <div className="fare-breakdown mb-6 rounded-lg border p-4 bg-muted/30 space-y-2 text-sm">
            {gstEnabled && includeTax ? (
              // Tax-inclusive: Show Total first, then breakdown
              <>
                <div className="flex justify-between font-bold border-b pb-2 mb-2 text-base">
                  <span>Total Amount (including GST)</span>
                  <span>₹{formatCurrency(summaryTotal)}</span>
                </div>
            <div className="flex justify-between">
                  <span>Base Fare (excluding GST)</span>
                  <span className="font-semibold">₹{formatCurrency(summaryBaseFare)}</span>
                </div>
                {summaryExtras > 0 && (
                  <div className="flex justify-between">
                    <span>Extra Charges</span>
                    <span className="font-semibold">₹{formatCurrency(summaryExtras)}</span>
                  </div>
                )}
                {displayTaxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>{summaryIsIGST ? 'GST @ 18%' : 'GST @ 18%'}</span>
                    <span className="font-semibold">₹{formatCurrency(displayTaxAmount)}</span>
                  </div>
                )}
              </>
            ) : (
              // Tax-exclusive or GST disabled: Show breakdown first, then total
              <>
                <div className="flex justify-between">
                  <span>{gstEnabled ? 'Base Fare (excluding GST)' : 'Base Fare'}</span>
              <span className="font-semibold">₹{formatCurrency(summaryBaseFare)}</span>
            </div>
            {summaryExtras > 0 && (
              <div className="flex justify-between">
                <span>Extra Charges</span>
                <span className="font-semibold">₹{formatCurrency(summaryExtras)}</span>
              </div>
            )}
            {gstEnabled && displayTaxAmount > 0 && (
              <div className="flex justify-between">
                    <span>{summaryIsIGST ? 'GST @ 18%' : 'GST @ 18%'}</span>
                <span className="font-semibold">₹{formatCurrency(displayTaxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-2 mt-2 text-base">
                  <span>{gstEnabled ? 'Total Amount (including GST)' : 'Total Amount'}</span>
              <span>₹{formatCurrency(summaryTotal)}</span>
            </div>
              </>
            )}
          </div>

          <Tabs defaultValue="html" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="html" className="flex-1">HTML View</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" key={`settings-${invoiceData?.id || 'new'}-${gstEnabled}-${includeTax}`}>
              {renderInvoiceSettings()}
            </TabsContent>
            
            <TabsContent value="preview">
              {renderInvoicePreview()}
            </TabsContent>
            
            <TabsContent value="html">
              {renderHtmlView()}
            </TabsContent>
          </Tabs>

          {!pdfGenerationAvailable && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                PDF generation may not be working correctly on the server. 
                HTML view is recommended for reliable invoice viewing.
              </AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="mb-4">No invoice has been generated for this booking yet.</p>
          <Button onClick={() => handleGenerateInvoice(true)}>Generate Invoice</Button>
        </div>
        <div className="border rounded-md p-4 bg-muted/30">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground">GST & Invoice Settings</h3>
          {renderInvoiceSettings()}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {renderInvoiceContent()}
        
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          
          <div className="flex space-x-2">
            {(invoiceData || htmlContent) && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleRegenerateInvoice}
                  disabled={loading || isSubmitting || regenerating || (gstEnabled && (!gstDetails.gstNumber || !gstDetails.companyName))}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button
                  onClick={handleViewHtml}
                  disabled={loading || isSubmitting || regenerating}
                  variant="secondary"
                >
                  <FileIcon className="h-4 w-4 mr-2" />
                  HTML
                </Button>
                
                <Button
                  onClick={handleDownloadPdf}
                  disabled={loading || isSubmitting || regenerating}
                  variant={pdfGenerationAvailable ? "default" : "outline"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Open PDF
                </Button>
                
                <Button
                  variant={pdfGenerationAvailable ? "secondary" : "outline"}
                  onClick={handleForceDownload}
                  disabled={loading || isSubmitting || regenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              onClick={handleTestPdfDownload}
            >
              <FileText className="h-4 w-4 mr-2" />
              Test PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
