import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { TourQuotationPDF } from '@/components/pdf/TourQuotationPDF';
import { TourDetail } from '@/types/tour';

interface UsePDFExportProps {
  tour: TourDetail;
  pickupLocation: string;
  pickupDate: Date;
  vehicleFares: Array<{
    vehicleType: string;
    fare: number;
    seatingCapacity: number;
  }>;
}

export const usePDFExport = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAndDownloadPDF = async ({
    tour,
    pickupLocation,
    pickupDate,
    vehicleFares,
  }: UsePDFExportProps) => {
    try {
      setIsGenerating(true);
      
      // Generate PDF
      const pdfElement = TourQuotationPDF({
        tour,
        pickupLocation,
        pickupDate,
        vehicleFares,
      });
      
      const blob = await pdf(pdfElement as React.ReactElement).toBlob();

      // Generate filename with tour name and date
      const tourFileName = (tour.tourName || (tour as any).name || 'Tour').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${tourFileName}_Quotation_${pickupDate.toISOString().split('T')[0]}.pdf`;

      // Download PDF
      saveAs(blob, fileName);
      
      return { success: true, fileName };
    } catch (error) {
      console.error('Error generating PDF:', error);
      return { success: false, error: 'Failed to generate PDF' };
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateAndDownloadPDF,
    isGenerating,
  };
};