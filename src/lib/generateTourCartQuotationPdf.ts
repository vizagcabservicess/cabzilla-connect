import { createElement } from 'react';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import type {
  TourCartQuotationPDFProps,
  TourCartQuotationTour,
} from '@/components/pdf/TourCartQuotationPDF';
import { normalizeQuoteItinerary } from '@/lib/tourQuoteItinerary';

function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(raw: string): string {
  return cleanText(raw);
}

async function withItineraries(tours: TourCartQuotationTour[]): Promise<TourCartQuotationTour[]> {
  return Promise.all(
    tours.map(async (tour) => {
      if (!tour.tourId) return tour;
      const hasItinerary = Boolean(tour.itinerary && tour.itinerary.length > 0);
      const needsHoursKm =
        !(Number(tour.distance) > 0) || !String(tour.timeDuration || '').trim();
      if (hasItinerary && !needsHoursKm) return tour;
      try {
        const detail = await tourDetailAPI.getTourDetail(tour.tourId);
        const itinerary = hasItinerary ? tour.itinerary : normalizeQuoteItinerary(detail?.itinerary);
        const description =
          tour.description || stripHtml(String(detail?.description || ''));
        const days = tour.days || Number(detail?.days) || undefined;
        const distance =
          Number(tour.distance) > 0 ? tour.distance : Number(detail?.distance) || undefined;
        const timeDuration =
          String(tour.timeDuration || detail?.timeDuration || '').trim() || undefined;
        return { ...tour, itinerary, description, days, distance, timeDuration };
      } catch {
        return tour;
      }
    })
  );
}

export async function generateTourCartQuotationPdf(
  data: TourCartQuotationPDFProps
): Promise<{ blob: Blob; fileName: string }> {
  const tours = await withItineraries(data.tours);
  // react-pdf is heavy; load it only when a super-admin generates a quote.
  const [{ pdf }, { TourCartQuotationPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/pdf/TourCartQuotationPDF'),
  ]);

  const blob = await pdf(createElement(TourCartQuotationPDF, { ...data, tours })).toBlob();
  const safeName = data.customerName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'Guest';
  const fileName = `VizagTaxiHub_${safeName}_Quotation.pdf`;
  return { blob, fileName };
}
