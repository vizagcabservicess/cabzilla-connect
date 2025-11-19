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

      if (/base fare/i.test(label)) {
        baseFare = amount;
        return;
      }

      if (/total amount/i.test(label)) {
        totalAmount = amount;
        return;
      }

      if (/igst/i.test(label)) {
        gstAmount += amount;
        isIGST = true;
        return;
      }

      if (/cgst/i.test(label) || /sgst/i.test(label)) {
        gstAmount += amount;
        return;
      }

      if (label.length > 0 && !/description/i.test(label)) {
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
}

interface BookingInvoiceProps {
  booking: Booking;
  onGenerateInvoice: (gstEnabled?: boolean, gstDetails?: any, isIGST?: boolean, includeTax?: boolean, customInvoiceNumber?: string) => Promise<any>;
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
  
  // Use lifted state from props
  const { gstEnabled, isIGST, includeTax, customInvoiceNumber, gstDetails } = invoiceState;
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
  const baseFare = useMemo(() => {
    // Priority 1: Use baseAmount from invoiceData if available (most accurate)
    if (invoiceData && typeof invoiceData.baseAmount === 'number' && invoiceData.baseAmount > 0) {
      return invoiceData.baseAmount;
    }
    
    // Priority 2: Check localStorage for stored base fare
    const storedBaseFare = localStorage.getItem(originalBaseFareKey);
    if (storedBaseFare && !isNaN(parseFloat(storedBaseFare))) {
      const parsed = parseFloat(storedBaseFare);
      // If booking.fare has been updated and differs from the stored value, prefer the fresh value
      if (typeof booking.fare === 'number' && booking.fare > 0 && Math.abs(booking.fare - parsed) > 0.01) {
        localStorage.setItem(originalBaseFareKey, booking.fare.toString());
        return booking.fare;
      }
      return parsed;
    }
    
    // Priority 3: Use booking.fare (original fare) instead of totalAmount which may include GST
    const originalFare = (typeof booking.fare === 'number' ? booking.fare : 0);
    if (originalFare > 0) {
      localStorage.setItem(originalBaseFareKey, originalFare.toString());
      return originalFare;
    }
    
    // Priority 4: Fallback: Calculate from totalAmount but subtract extra charges
    const rawTotal = (typeof booking.totalAmount === 'number' ? booking.totalAmount : 0);
    let calculated = rawTotal - extraChargesTotal;
    
    // If this seems to include GST (high amount), try to reverse it
    if (calculated > 15000) {
      const possiblePreGstAmount = calculated / 1.18;
      if (possiblePreGstAmount > 1000 && possiblePreGstAmount < calculated * 0.95) {
        calculated = Math.round(possiblePreGstAmount);
      }
    }
    
    if (calculated > 0) {
      localStorage.setItem(originalBaseFareKey, calculated.toString());
    }
    return Math.max(0, calculated);
  }, [booking.id, booking.fare, booking.totalAmount, extraChargesTotal, invoiceData?.baseAmount, originalBaseFareKey]);
  
  const originalTotalAmount = typeof booking.totalAmount === 'number'
    ? booking.totalAmount
    : typeof (booking as any).total_amount === 'number'
      ? (booking as any).total_amount as number
      : baseFare + extraChargesTotal;

  const parsedSummary = useMemo(
    () => (rawHtmlContent ? parseInvoiceSummary(rawHtmlContent) : null),
    [rawHtmlContent]
  );

  const extrasFromBooking = Math.max(0, extraChargesTotal);
  let fallbackBaseFare = Math.max(0, baseFare);
  let fallbackExtras = extrasFromBooking;
  let fallbackTaxes = 0;
  let fallbackTotal = fallbackBaseFare + fallbackExtras;

  if (gstEnabled) {
    if (includeTax) {
      const totalWithTax = originalTotalAmount > 0
        ? originalTotalAmount
        : fallbackBaseFare + fallbackExtras;
      const taxableAmount = Number((totalWithTax / 1.18).toFixed(2));
      fallbackTaxes = Number((totalWithTax - taxableAmount).toFixed(2));
      fallbackTotal = Number(totalWithTax.toFixed(2));
    } else {
      fallbackTaxes = Number(((fallbackBaseFare + fallbackExtras) * 0.18).toFixed(2));
      fallbackTotal = Number((fallbackBaseFare + fallbackExtras + fallbackTaxes).toFixed(2));
    }
  }

  // Always preserve the user-entered base fare
  fallbackBaseFare = Number(Math.max(0, baseFare).toFixed(2));

  // CRITICAL: Prioritize backend values from invoiceData over parsed HTML
  // Backend values are always correct, parsed HTML might be wrong
  // NEVER use parsed HTML values if backend values are available
  const summaryBaseFare = (invoiceData && typeof invoiceData.baseAmount === 'number' && invoiceData.baseAmount > 0)
    ? invoiceData.baseAmount
    : fallbackBaseFare; // Always use fallbackBaseFare, never parsed HTML baseFare
  
  const summaryExtras = (invoiceData && typeof invoiceData.totalExtraCharges === 'number' && invoiceData.totalExtraCharges >= 0)
    ? invoiceData.totalExtraCharges
    : fallbackExtras; // Always use fallbackExtras, never parsed HTML extraCharges
  
  // For taxes, use backend taxAmount (total GST) or sum of CGST+SGST+IGST
  // Fields are now normalized to camelCase in invoiceData
  const backendTaxAmount = invoiceData?.taxAmount ?? 0;
  const backendCgst = invoiceData?.cgstAmount ?? 0;
  const backendSgst = invoiceData?.sgstAmount ?? 0;
  const backendIgst = invoiceData?.igstAmount ?? 0;
  const calculatedBackendTax = backendTaxAmount > 0
    ? backendTaxAmount
    : (backendCgst + backendSgst + backendIgst);
  
  const summaryTaxes = calculatedBackendTax > 0
    ? calculatedBackendTax
    : (typeof parsedSummary?.gstAmount === 'number' && parsedSummary.gstAmount > 0)
      ? parsedSummary.gstAmount
      : fallbackTaxes;
  
  const summaryTotal = (invoiceData && typeof invoiceData.totalAmount === 'number' && invoiceData.totalAmount > 0)
    ? invoiceData.totalAmount
    : (typeof parsedSummary?.totalAmount === 'number' && parsedSummary.totalAmount > 0)
      ? parsedSummary.totalAmount
      : fallbackTotal;
  
  // Debug logging for summary calculation
  console.log('📊 Summary Calculation:', {
    invoiceData_available: !!invoiceData,
    summaryBaseFare,
    summaryExtras,
    backendTaxAmount,
    backendCgst,
    backendSgst,
    backendIgst,
    calculatedBackendTax,
    summaryTaxes,
    summaryTotal,
    invoiceData_totalAmount: invoiceData?.totalAmount,
    invoiceData_baseAmount: invoiceData?.baseAmount,
    invoiceData_totalExtraCharges: invoiceData?.totalExtraCharges,
    fallbackBaseFare,
    fallbackExtras,
    parsedSummary_baseFare: parsedSummary?.baseFare,
    parsedSummary_extraCharges: parsedSummary?.extraCharges
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
      // CRITICAL: Use the actual baseFare from the component state, not the parsed HTML
      // The parsed HTML might have ₹0.00 if backend generated it incorrectly
      // Priority: 1) component baseFare, 2) invoiceData.baseAmount, 3) parsed summary, 4) fallback
      const baseAmount = (typeof baseFare === 'number' && baseFare > 0)
        ? baseFare
        : (invoiceData && typeof invoiceData.baseAmount === 'number' && invoiceData.baseAmount > 0)
          ? invoiceData.baseAmount
          : (typeof summary?.baseFare === 'number' && !isNaN(summary.baseFare) && summary.baseFare > 0)
            ? summary.baseFare
            : fallbackBaseFare;
      
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

      // Always update base fare cells if found
      if (baseCells.length > 0 && baseAmount > 0) {
        const baseLabel = includeTax ? 'Base Fare' : 'Base Fare (excluding tax)';
        console.log('✅ Updating', baseCells.length, 'base fare cells with amount:', baseAmount);
        baseCells.forEach(cell => updateAmountCell(cell, baseAmount, baseLabel));
      } else if (baseCells.length === 0) {
        console.warn('⚠️ No base fare cells found in HTML!');
      }

      // GST calculations only if GST is enabled
      // CRITICAL: Use backend-calculated values from invoiceData instead of recalculating
      // The backend already calculated everything correctly based on includeTax setting
      console.log('🔍 GST Calculation Check:', {
        gstEnabled,
        invoiceData_available: !!invoiceData,
        baseAmount,
        fallbackExtras
      });
      
      if (gstEnabled) {
        try {
          // Use backend values if available, otherwise fall back to calculation
          // Fields are now normalized to camelCase in invoiceData
          const backendTaxAmount = invoiceData?.taxAmount ?? 0;
          const backendTotalAmount = invoiceData?.totalAmount ?? 0;
          const backendCgstAmount = invoiceData?.cgstAmount ?? 0;
          const backendSgstAmount = invoiceData?.sgstAmount ?? 0;
          const backendIgstAmount = invoiceData?.igstAmount ?? 0;

          // CRITICAL: Use backend values or fallback, NEVER use parsed HTML values
          // Parsed HTML might have wrong values (like negative extrasAmount: -95838)
          const extrasAmount = (invoiceData && typeof invoiceData.totalExtraCharges === 'number' && invoiceData.totalExtraCharges >= 0)
            ? invoiceData.totalExtraCharges
            : fallbackExtras;
          
          // CRITICAL: Ensure baseAmount is correct - use backend value or fallback, never parsed HTML
          // The baseAmount variable already prioritizes backend/fallback, but double-check here
          const correctBaseAmount = (invoiceData && typeof invoiceData.baseAmount === 'number' && invoiceData.baseAmount > 0)
            ? invoiceData.baseAmount
            : (baseAmount > 0 ? baseAmount : fallbackBaseFare);
          
          // Calculate taxable amount using correct values
          const taxableAmount = Math.max(0, correctBaseAmount + extrasAmount);
          
          console.log('🔍 Corrected Values Check:', {
            correctBaseAmount,
            extrasAmount,
            taxableAmount,
            invoiceData_baseAmount: invoiceData?.baseAmount,
            baseAmount_from_component: baseAmount,
            fallbackBaseFare
          });

          console.log('🔍 Taxable Amount Check:', {
            taxableAmount,
            correctBaseAmount,
            baseAmount,
            extrasAmount,
            invoiceData_totalExtraCharges: invoiceData?.totalExtraCharges,
            fallbackExtras,
            summary_extraCharges: summary?.extraCharges,
            calculation: `${correctBaseAmount} + ${extrasAmount} = ${taxableAmount}`
          });

          if (taxableAmount > 0) {
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
                console.log('✅ Found IGST cell:', labelCell.textContent?.trim(), amountCell.textContent?.trim());
              } else if (/cgst/i.test(label)) {
                cgstCells.push(amountCell);
                console.log('✅ Found CGST cell:', labelCell.textContent?.trim(), amountCell.textContent?.trim());
              } else if (/sgst/i.test(label)) {
                sgstCells.push(amountCell);
                console.log('✅ Found SGST cell:', labelCell.textContent?.trim(), amountCell.textContent?.trim());
              } else if (/gst/i.test(label) && !/cgst|sgst|igst/i.test(label)) {
                genericGstCells.push(amountCell);
                console.log('✅ Found generic GST cell:', labelCell.textContent?.trim(), amountCell.textContent?.trim());
              }

              if ((/total amount/i.test(label) || /grand total/i.test(label)) && !/extra/i.test(label)) {
                totalCells.push(amountCell);
                console.log('✅ Found Total cell:', labelCell.textContent?.trim(), amountCell.textContent?.trim());
              }
            });
            
            console.log('🔍 Cells found summary:', {
              cgstCells: cgstCells.length,
              sgstCells: sgstCells.length,
              igstCells: igstCells.length,
              genericGstCells: genericGstCells.length,
              totalCells: totalCells.length
            });

            // CRITICAL: Use backend values if available, otherwise calculate correctly
            // For tax-exclusive: GST must be calculated on SUBTOTAL (taxableAmount), NOT on total-with-tax
            let totalTax: number;
            let cgstValue: number;
            let sgstValue: number;
            let igstValue: number;
            let totalWithTax: number;

            // Priority 1: Use backend CGST/SGST values directly (most accurate)
            const hasBackendCgst = typeof backendCgstAmount === 'number' && backendCgstAmount > 0;
            const hasBackendSgst = typeof backendSgstAmount === 'number' && backendSgstAmount > 0;
            const hasBackendIgst = typeof backendIgstAmount === 'number' && backendIgstAmount > 0;
            const hasBackendTax = typeof backendTaxAmount === 'number' && backendTaxAmount > 0;
            const hasBackendTotal = typeof backendTotalAmount === 'number' && backendTotalAmount > 0;

            console.log('🔍 Breakdown GST Calculation Debug:', {
              hasBackendCgst,
              hasBackendSgst,
              hasBackendIgst,
              hasBackendTax,
              hasBackendTotal,
              backendCgstAmount,
              backendSgstAmount,
              backendTaxAmount,
              backendTotalAmount,
              correctBaseAmount,
              extrasAmount,
              taxableAmount,
              includeTax,
              calculation: `Subtotal = ${correctBaseAmount} + ${extrasAmount} = ${taxableAmount}`
            });

            if (hasBackendCgst && hasBackendSgst) {
              // Use backend CGST and SGST values directly (most accurate)
              cgstValue = backendCgstAmount;
              sgstValue = backendSgstAmount;
              totalTax = cgstValue + sgstValue;
              igstValue = 0;
              totalWithTax = hasBackendTotal ? backendTotalAmount : (includeTax ? taxableAmount : taxableAmount + totalTax);
              
              console.log('✅ Using backend CGST/SGST values:', {
                cgst: cgstValue,
                sgst: sgstValue,
                totalTax,
                totalWithTax,
                correctBaseAmount,
                extrasAmount,
                taxableAmount,
                expectedCgst: Math.round(taxableAmount * 0.09 * 100) / 100,
                expectedSgst: Math.round(taxableAmount * 0.09 * 100) / 100,
                verification: `CGST ${cgstValue} + SGST ${sgstValue} = ${totalTax}, should equal ${Math.round(taxableAmount * 0.18 * 100) / 100}`
              });
            } else if (hasBackendIgst) {
              // Use backend IGST value
              igstValue = backendIgstAmount;
              totalTax = igstValue;
              cgstValue = 0;
              sgstValue = 0;
              totalWithTax = hasBackendTotal ? backendTotalAmount : (includeTax ? taxableAmount : taxableAmount + totalTax);
            } else if (hasBackendTax) {
              // Use backend total tax amount, split into CGST/SGST
              totalTax = backendTaxAmount;
              totalWithTax = hasBackendTotal ? backendTotalAmount : (includeTax ? taxableAmount : taxableAmount + totalTax);
              
              const applyIGST = summaryIsIGST || hasBackendIgst;
              
              if (applyIGST) {
                igstValue = totalTax;
                cgstValue = 0;
                sgstValue = 0;
              } else {
                // Split total tax into CGST and SGST (each 9% of subtotal)
                cgstValue = Math.round(totalTax / 2 * 100) / 100;
                sgstValue = Math.round((totalTax - cgstValue) * 100) / 100;
                igstValue = 0;
              }
            } else {
              // Fallback: Calculate based on includeTax setting
              // CRITICAL: Always calculate GST on SUBTOTAL (taxableAmount), never on total-with-tax
              if (includeTax) {
                // Tax-inclusive: Extract tax from taxable amount
                totalTax = Math.round((taxableAmount / 1.18) * 0.18 * 100) / 100;
                totalWithTax = taxableAmount; // Total already includes tax
              } else {
                // Tax-exclusive: Add tax on top of SUBTOTAL
                // Formula: GST = Subtotal × 0.18 (NOT total × 0.18)
                totalTax = Math.round(taxableAmount * 0.18 * 100) / 100;
                totalWithTax = Math.round((taxableAmount + totalTax) * 100) / 100;
              }
              
              const applyIGST = summaryIsIGST || (igstCells.length > 0 && cgstCells.length === 0 && sgstCells.length === 0);
              
              if (applyIGST) {
                igstValue = totalTax;
                cgstValue = 0;
                sgstValue = 0;
              } else {
                // Split total tax into CGST and SGST
                // Each is 9% of SUBTOTAL (taxableAmount), not of total
                cgstValue = Math.round(totalTax / 2 * 100) / 100;
                sgstValue = Math.round((totalTax - cgstValue) * 100) / 100;
                igstValue = 0;
              }
              
              console.log('⚠️ Using fallback calculation:', {
                taxableAmount,
                includeTax,
                totalTax,
                cgstValue,
                sgstValue,
                totalWithTax
              });
            }

            // Update GST cells - ALWAYS use calculated values, never parsed HTML values
            console.log('🔍 Updating GST cells with values:', {
              cgstValue,
              sgstValue,
              igstValue,
              totalTax,
              totalWithTax,
              cgstCellsCount: cgstCells.length,
              sgstCellsCount: sgstCells.length,
              igstCellsCount: igstCells.length
            });

            if (igstValue > 0) {
              const targets = igstCells.length > 0 ? igstCells : genericGstCells;
              targets.forEach(cell => updateAmountCell(cell, igstValue, 'IGST (18%)'));
            } else {
              if (cgstCells.length === 0 && sgstCells.length === 0 && genericGstCells.length > 0) {
                genericGstCells.forEach(cell => updateAmountCell(cell, totalTax, 'GST (18%)'));
              } else {
                if (cgstCells.length > 0) {
                  console.log(`✅ Updating ${cgstCells.length} CGST cells with value: ₹${cgstValue}`);
                  cgstCells.forEach(cell => updateAmountCell(cell, cgstValue, 'CGST (9%)'));
                }
                if (sgstCells.length > 0) {
                  console.log(`✅ Updating ${sgstCells.length} SGST cells with value: ₹${sgstValue}`);
                  sgstCells.forEach(cell => updateAmountCell(cell, sgstValue, 'SGST (9%)'));
                }
              }
            }

            // Update total cells - ALWAYS use calculated total, never parsed HTML
            console.log(`✅ Updating ${totalCells.length} total cells with value: ₹${totalWithTax}`);
            totalCells.forEach(cell => {
              updateAmountCell(cell, totalWithTax);
            });
          }
        } catch (calcError) {
          console.warn('Unable to recalculate GST totals in invoice HTML:', calcError);
        }
      }

      return doc.documentElement.outerHTML;
    } catch (error) {
      console.error('Failed to sanitize admin invoice HTML:', error);
      return html;
    }
  }, [gstEnabled, summaryIsIGST, fallbackBaseFare, fallbackExtras, includeTax, baseFare, invoiceData]);

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
            // Only sanitize if we have HTML content
            const sanitizedHtml = rawHtml ? sanitizeInvoiceHtml(rawHtml) : null;
            // CRITICAL: Normalize all field names to camelCase for consistent access
            const invoicePayload = {
              ...data.invoice,
              invoiceHtml: sanitizedHtml ?? rawHtml,
              invoice_html: sanitizedHtml ?? rawHtml,
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
            
            // Only update state if there's no stored state in localStorage
            const hasStoredState = localStorage.getItem(`invoice-settings-${booking.id}`);
            if (!hasStoredState) {
              // Update form state from the fetched invoice only if no localStorage data exists
              const fetchedGstEnabled = !!data.invoice.gst_enabled;
              const fetchedGstDetails = {
                gstNumber: data.invoice.gst_number || '',
                companyName: data.invoice.company_name || '',
                companyAddress: data.invoice.company_address || ''
              };
              const fetchedInvoiceNumber = data.invoice.invoice_number || '';
              const fetchedIncludeTax = !!data.invoice.include_tax;
              const fetchedIsIGST = !!data.invoice.is_igst;
              
              onInvoiceStateChange({
                gstEnabled: fetchedGstEnabled,
                gstDetails: fetchedGstDetails,
                customInvoiceNumber: fetchedInvoiceNumber,
                includeTax: fetchedIncludeTax,
                isIGST: fetchedIsIGST
              });
            }
            
            // Set HTML content if available
            if (rawHtml) {
              setRawHtmlContent(sanitizedHtml ?? rawHtml);
            } else {
              setRawHtmlContent(null);
            }
          } else {
            // Prefill from booking → guest GST details
            const prefillGstEnabled = Boolean((booking as any).gstEnabled);
            const prefillGstDetails = (booking as any).gstDetails || null;
            if (!localStorage.getItem(`invoice-settings-${booking.id}`) && (prefillGstEnabled || prefillGstDetails)) {
              onInvoiceStateChange({
                gstEnabled: prefillGstEnabled,
                isIGST: false,
                includeTax: true,
                customInvoiceNumber: '',
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
      
      console.log('🔥 INVOICE GENERATION DEBUG:');
      console.log('Booking ID:', booking.id);
      console.log('Booking object:', booking);
      console.log('Locked Base Fare (frontend):', baseFare);
      console.log('Booking totalAmount:', booking.totalAmount);
      console.log('Booking fare:', booking.fare);
      console.log('Extra charges total:', extraChargesTotal);
      console.log('GST Settings:', { gstEnabled, isIGST, includeTax });
      
      // CRITICAL: Pass the locked base fare to prevent backend recalculation
      const extendedGstDetails = gstEnabled ? {
        ...gstDetails,
        lockedBaseFare: baseFare,  // Include the locked base fare
        originalTotalAmount: booking.totalAmount, // For comparison
        originalFare: booking.fare, // Original fare field
        extraChargesTotal: extraChargesTotal // Extra charges
      } : {
        lockedBaseFare: baseFare,
        originalTotalAmount: booking.totalAmount,
        originalFare: booking.fare,
        extraChargesTotal: extraChargesTotal
      };
      
      console.log('Extended GST Details being sent:', extendedGstDetails);
                 
      const result = await onGenerateInvoice(
        gstEnabled, 
        extendedGstDetails, 
        isIGST,
        includeTax,
        customInvoiceNumber.trim() || undefined
      );
      
      console.log('📨 Invoice generation result received:', result);
      console.log('📊 Result data structure:', result?.data);
      
      // Check if result is null (error case)
      if (!result) {
        throw new Error('Invoice generation returned null - check backend logs for details');
      }
      
      if (result && result.data) {
        const rawHtml = result.data.invoiceHtml ?? result.data.invoice_html ?? null;
        const sanitizedHtml = sanitizeInvoiceHtml(rawHtml);
        // CRITICAL: Normalize all field names to camelCase for consistent access
        const invoicePayload = {
          ...result.data,
          invoiceHtml: sanitizedHtml ?? rawHtml,
          invoice_html: sanitizedHtml ?? rawHtml,
          // Normalize field names - use camelCase with fallback to snake_case
          baseAmount: result.data.baseAmount ?? result.data.base_amount ?? baseFare,
          taxAmount: result.data.taxAmount ?? result.data.tax_amount ?? 0,
          totalAmount: result.data.totalAmount ?? result.data.total_amount ?? 0,
          totalExtraCharges: result.data.totalExtraCharges ?? result.data.total_extra_charges ?? 0,
          cgstAmount: result.data.cgstAmount ?? result.data.cgst_amount ?? 0,
          sgstAmount: result.data.sgstAmount ?? result.data.sgst_amount ?? 0,
          igstAmount: result.data.igstAmount ?? result.data.igst_amount ?? 0
        };
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
    
    return getApiUrl(`${endpoint}?${params.toString()}`);
  };

  const handleDownloadPdf = () => {
    try {
      setDownloadCount(prev => prev + 1);
      const pdfUrl = createPdfUrl(false);
      
      // Open in new tab with browser's PDF viewer
      window.open(pdfUrl, '_blank');
      
      toast({
        title: "PDF Opened in New Tab",
        description: "Your invoice should open in a new browser tab"
      });
    } catch (error) {
      console.error("Invoice download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download invoice. Please try the HTML version instead."
      });
    }
  };

  const handleViewHtml = () => {
    try {
      const htmlUrl = createPdfUrl(false, false, true);
      window.open(htmlUrl, '_blank');
      
      toast({
        title: "HTML Invoice",
        description: "HTML version of the invoice opened in a new tab"
      });
    } catch (error) {
      console.error("HTML view error:", error);
      toast({
        variant: "destructive",
        title: "HTML View Failed",
        description: "Failed to open HTML invoice"
      });
    }
  };

  const handleForceDownload = () => {
    try {
      setDownloadCount(prev => prev + 1);
      const pdfUrl = createPdfUrl(true);
      
      // Use download attribute to force download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Invoice_${booking.id}_${new Date().getTime()}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your invoice download should begin shortly"
      });
    } catch (error) {
      console.error("Force download error:", error);
      toast({
        variant: "destructive",
        title: "Force Download Failed",
        description: "Failed to force download. Try the HTML version instead."
      });
    }
  };

  const handleAdminDownload = () => {
    try {
      setDownloadCount(prev => prev + 1);
      const pdfUrl = createPdfUrl(true, true); // true for direct download, true for admin endpoint
      
      window.open(pdfUrl, '_blank');
      
      toast({
        title: "Admin PDF Download",
        description: "Using admin endpoint to download PDF"
      });
    } catch (error) {
      console.error("Admin download error:", error);
      toast({
        variant: "destructive",
        title: "Admin Download Failed",
        description: "Failed to use admin download. Try the HTML version instead."
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
    onInvoiceStateChange({
      ...invoiceState,
      gstEnabled: checked,
      includeTax: checked ? true : invoiceState.includeTax
    });
    if (checked && !includeTax) {
      toast({
        title: "Tax Inclusion Enabled",
        description: "Enabling GST defaults to include tax in the price"
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
    // Force re-render when state changes
    const forceRenderKey = `${invoiceData?.id || 'new'}-${gstEnabled}-${customInvoiceNumber}-${gstDetails.gstNumber}-${gstDetails.companyName}-${gstDetails.companyAddress}`;
    
    return (
      <div className="p-4 border rounded-md space-y-4" key={forceRenderKey}>
        <div>
          <Label htmlFor="custom-invoice">Custom Invoice Number</Label>
          <Input 
            id="custom-invoice"
            key={`custom-invoice-${forceRenderKey}`}
            value={customInvoiceNumber || ''}
            onChange={(e) => onInvoiceStateChange({...invoiceState, customInvoiceNumber: e.target.value})}
            placeholder="Optional - Leave blank for auto-generated number"
          />
          <p className="text-xs text-gray-500 mt-1">
            If provided, this will replace the auto-generated invoice number
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="gst-toggle"
            key={`gst-toggle-${forceRenderKey}`}
            checked={gstEnabled}
            onCheckedChange={handleGstToggle}
          />
          <Label htmlFor="gst-toggle">Include GST (18%)</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="tax-toggle"
            key={`tax-toggle-${forceRenderKey}`}
            checked={includeTax}
            onCheckedChange={(checked) => onInvoiceStateChange({...invoiceState, includeTax: checked})}
          />
          <Label htmlFor="tax-toggle">{includeTax ? "Price including tax" : "Price excluding tax"}</Label>
        </div>
        
        {gstEnabled && (
          <div className="space-y-3" key={`gst-section-${forceRenderKey}`}>
            <div>
              <Label htmlFor="gstNumber">GST Number<span className="text-red-500">*</span></Label>
              <Input 
                id="gstNumber"
                name="gstNumber"
                key={`gstNumber-${forceRenderKey}`}
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
                key={`companyName-${forceRenderKey}`}
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
                key={`companyAddress-${forceRenderKey}`}
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
            <h3 className="font-medium">Invoice #{invoiceData?.invoiceNumber || 'Generated'}</h3>
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
            <div className="flex justify-between">
              <span>Base Fare</span>
              <span className="font-semibold">₹{formatCurrency(summaryBaseFare)}</span>
            </div>
            {summaryExtras > 0 && (
              <div className="flex justify-between">
                <span>Extra Charges</span>
                <span className="font-semibold">₹{formatCurrency(summaryExtras)}</span>
              </div>
            )}
            {gstEnabled && summaryTaxes > 0 && (
              <div className="flex justify-between">
                <span>{summaryIsIGST ? 'IGST (18%)' : 'GST (18%)'}</span>
                <span className="font-semibold">₹{formatCurrency(summaryTaxes)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-2 mt-2 text-base">
              <span>Total Amount</span>
              <span>₹{formatCurrency(summaryTotal)}</span>
            </div>
          </div>

          <Tabs defaultValue="html" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="html" className="flex-1">HTML View</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" key={`settings-${invoiceData?.id || 'new'}-${gstEnabled}-${customInvoiceNumber}`}>
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
