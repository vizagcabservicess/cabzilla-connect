import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { EventDutyReportPDF } from '@/components/pdf/EventDutyReportPDF';
import { parseReportTable, reportPdfFileName } from '@/lib/eventDuty';

function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

async function savePdfBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (isIosBrowser() && typeof navigator.share === 'function') {
    let canShare = true;
    if (typeof navigator.canShare === 'function') {
      try {
        canShare = navigator.canShare({ files: [file] });
      } catch {
        canShare = false;
      }
    }
    if (canShare) {
      try {
        await navigator.share({ files: [file], title: filename.replace(/\.pdf$/i, '') });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
      }
    }
  }
  saveAs(blob, filename);
}

/** Saves the report as a PDF file. Phones do not open the system print sheet. */
export function printHtmlReport(title: string, heading: string, tableHtml: string, subtitle?: string): void {
  const { headers, rows } = parseReportTable(tableHtml);
  const filename = reportPdfFileName(title);
  void pdf(EventDutyReportPDF({ heading, subtitle, headers, rows }))
    .toBlob()
    .then((blob) => savePdfBlob(blob, filename))
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error(error);
      toast.error('Could not download the PDF');
    });
}
