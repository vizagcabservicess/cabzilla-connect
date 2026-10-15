import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { buildReportPdf, type EventPdfReport } from './eventReportPdf';

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function sharePath(path: string, mimeType: string, dialogTitle: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType, dialogTitle });
  }
}

export async function shareCsvFile(filename: string, headers: string[], rows: string[][]): Promise<void> {
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\r\n')}`;
  if (Platform.OS === 'web') {
    const browser = globalThis as { document?: { createElement: (tag: string) => { href: string; download: string; click: () => void } }; URL?: { createObjectURL: (blob: Blob) => string; revokeObjectURL: (url: string) => void } };
    if (browser.document && browser.URL) {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = browser.URL.createObjectURL(blob);
      const link = browser.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      browser.URL.revokeObjectURL(url);
      return;
    }
  }
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('File storage is not available');
  const path = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: 'utf8' });
  await sharePath(path, 'text/csv', filename);
}

export async function sharePdfFile(filename: string, report: EventPdfReport): Promise<void> {
  const pdf = buildReportPdf(report);
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('File storage is not available');
  const path = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(path, pdf, { encoding: 'utf8' });
  await sharePath(path, 'application/pdf', filename);
}

export async function shareBase64File(filename: string, base64: string, mimeType: string): Promise<void> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('File storage is not available');
  const safe = filename.replace(/[^a-zA-Z0-9\-_.]/g, '_');
  const path = `${directory}${safe}`;
  await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' });
  await sharePath(path, mimeType, safe);
}
