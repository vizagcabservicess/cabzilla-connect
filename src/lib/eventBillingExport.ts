import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { EventBillingPDF } from '@/components/pdf/EventBillingPDF';
import { billingFileStem, type BillingExportMeta, type BillingSheet } from '@/lib/eventDutyBilling';
import { buildBillingWorkbook } from '@/lib/eventBillingWorkbook';

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

export async function downloadBillingExcel(sheet: BillingSheet, meta: BillingExportMeta): Promise<void> {
  const workbook = buildBillingWorkbook(sheet, meta);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${billingFileStem(sheet, meta)}.xlsx`);
}

export async function downloadBillingPdf(sheet: BillingSheet, meta: BillingExportMeta): Promise<void> {
  try {
    const blob = await pdf(EventBillingPDF({ sheet, meta })).toBlob();
    await savePdfBlob(blob, `${billingFileStem(sheet, meta)}.pdf`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    throw error;
  }
}
