export type EventPdfReport = {
  heading: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
};

const LOWER = [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500];
const UPPER = [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611];

function charUnits(ch: string): number {
  if (ch >= 'a' && ch <= 'z') return LOWER[ch.charCodeAt(0) - 97];
  if (ch >= 'A' && ch <= 'Z') return UPPER[ch.charCodeAt(0) - 65];
  if (ch >= '0' && ch <= '9') return 556;
  if (ch === ' ' || ch === '.' || ch === ',' || ch === ':' || ch === ';' || ch === 'i' || ch === 'l') return 278;
  if (ch === '-' || ch === '(' || ch === ')') return 333;
  if (ch === '/' || ch === '\u2013' || ch === '\u2014') return 556;
  return 500;
}

export function textWidth(value: string, fontSize: number, bold = false): number {
  let units = 0;
  for (const ch of value) units += charUnits(ch);
  return (units / 1000) * fontSize * (bold ? 1.06 : 1);
}

function normalizePdfText(value: string): string {
  return value
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00A0\u202F]/g, ' ');
}

export function wrapText(value: string, maxWidth: number, fontSize: number, bold = false): string[] {
  const source = normalizePdfText(value).trim() || '\u2014';
  const words = source.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  const pushWord = (word: string) => {
    if (textWidth(word, fontSize, bold) <= maxWidth) {
      current = word;
      return;
    }
    let piece = '';
    for (const ch of word) {
      const next = piece + ch;
      if (textWidth(next, fontSize, bold) <= maxWidth) piece = next;
      else {
        if (piece) lines.push(piece);
        piece = ch;
      }
    }
    current = piece;
  };
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (textWidth(trial, fontSize, bold) <= maxWidth) current = trial;
    else {
      if (current) lines.push(current);
      pushWord(word);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['\u2014'];
}

export function pdfLiteral(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 63;
    if (ch === '\\' || ch === '(' || ch === ')') out += `\\${ch}`;
    else if (code === 0x2014 || code === 0x2013) out += '-';
    else if (code === 0x00B7) out += '\\267';
    else if (code === 0x2022) out += '\\225';
    else if (code === 0x2018 || code === 0x2019) out += "'";
    else if (code === 0x201C || code === 0x201D) out += '"';
    else if (code === 0x00A0 || code === 0x202F) out += ' ';
    else if (code >= 32 && code <= 126) out += ch;
    else if (code >= 160 && code <= 255) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += '?';
  }
  return out;
}

function num(value: number): string {
  return value.toFixed(2);
}

function isSerialColumn(header: string): boolean {
  return /^sl\.?\s*no$/i.test(header.trim());
}

function columnFlex(header: string): number {
  const name = header.trim().toLowerCase();
  if (isSerialColumn(header)) return 0.42;
  if (name === 'slip') return 1.9;
  if (name === 'vehicle') return 1.3;
  if (name === 'driver') return 1.15;
  if (name === 'dates') return 1.55;
  if (name === 'date' || name === 'reporting time') return 0.9;
  if (/mobile/i.test(header)) return 0.85;
  if (/^km$|opening km|closing km|total km/i.test(name) || name === 'status') return 0.7;
  return 1;
}

type LaidCell = string[];
type LaidRow = { cells: LaidCell[]; height: number };

export function buildReportPdf(report: EventPdfReport): string {
  const headers = report.headers;
  const wide = headers.length > 8;
  const pageW = wide ? 841.89 : 595.28;
  const pageH = wide ? 595.28 : 841.89;
  const margin = 18;
  const fontSize = wide ? 6.5 : 8;
  const lineHeight = fontSize + 2.2;
  const padX = 3;
  const padY = 3.5;
  const footerSpace = 22;
  const tableBottom = margin + footerSpace;
  const usable = pageW - margin * 2;
  const flexes = headers.map((header) => columnFlex(header));
  const flexTotal = flexes.reduce((sum, flex) => sum + flex, 0) || 1;
  const colWidths = flexes.map((flex) => (usable * flex) / flexTotal);
  const colX: number[] = [];
  colWidths.reduce((x, width) => {
    colX.push(x);
    return x + width;
  }, margin);

  const wrapRow = (cells: string[], bold: boolean): LaidRow => {
    const laid = headers.map((header, index) => {
      const raw = cells[index] ?? '';
      return wrapText(raw, Math.max(12, colWidths[index] - padX * 2), fontSize, bold);
    });
    const lineCount = Math.max(1, ...laid.map((lines) => lines.length));
    return { cells: laid, height: padY * 2 + lineCount * lineHeight };
  };

  const headerRow = headers.length ? wrapRow(headers, true) : null;
  const body = report.rows.map((row) => wrapRow(row, false));
  const brandBlock = 14 + 15 + (report.subtitle ? 12 : 0) + 6;
  const pages: { first: boolean; rows: LaidRow[] }[] = [];
  let page = { first: true, rows: [] as LaidRow[] };
  pages.push(page);
  let cursor = pageH - margin - brandBlock - (headerRow?.height ?? 0);

  for (const row of body) {
    if (cursor - row.height < tableBottom && page.rows.length > 0) {
      page = { first: false, rows: [] };
      pages.push(page);
      cursor = pageH - margin - 8 - (headerRow?.height ?? 0);
    }
    page.rows.push(row);
    cursor -= row.height;
  }

  const streams = pages.map((item, pageIndex) => {
    const commands: string[] = [];
    let top = pageH - margin;
    if (item.first) {
      commands.push(`BT /F2 12 Tf 0 0.40 1 rg 1 0 0 1 ${num(margin)} ${num(top - 12)} Tm (VIZAG TAXI HUB) Tj ET`);
      top -= 16;
      commands.push(`BT /F1 11 Tf 0.067 0.094 0.153 rg 1 0 0 1 ${num(margin)} ${num(top - 11)} Tm (${pdfLiteral(normalizePdfText(report.heading || 'Report'))}) Tj ET`);
      top -= 15;
      if (report.subtitle) {
        commands.push(`BT /F1 8 Tf 0.420 0.447 0.502 rg 1 0 0 1 ${num(margin)} ${num(top - 8)} Tm (${pdfLiteral(normalizePdfText(report.subtitle))}) Tj ET`);
        top -= 12;
      }
      top -= 6;
    } else {
      top -= 8;
    }

    const paintRow = (row: LaidRow, header: boolean) => {
      const bottom = top - row.height;
      if (header) {
        commands.push(`0.957 0.969 0.984 rg ${num(margin)} ${num(bottom)} ${num(usable)} ${num(row.height)} re f`);
        commands.push('0.816 0.843 0.871 RG 0.6 w');
        commands.push(`${num(margin)} ${num(top)} m ${num(margin + usable)} ${num(top)} l S`);
      }
      commands.push(header ? '0.816 0.843 0.871 RG 0.6 w' : '0.898 0.906 0.922 RG 0.4 w');
      commands.push(`${num(margin)} ${num(bottom)} m ${num(margin + usable)} ${num(bottom)} l S`);
      row.cells.forEach((lines, index) => {
        lines.forEach((line, lineIndex) => {
          const baseline = top - padY - fontSize - lineIndex * lineHeight + 1;
          const font = header ? '/F2' : '/F1';
          commands.push(`BT ${font} ${num(fontSize)} Tf 0.067 0.094 0.153 rg 1 0 0 1 ${num(colX[index] + padX)} ${num(baseline)} Tm (${pdfLiteral(line)}) Tj ET`);
        });
      });
      top = bottom;
    };

    if (headerRow) paintRow(headerRow, true);
    if (item.rows.length === 0) {
      commands.push(`BT /F1 9 Tf 0.420 0.447 0.502 rg 1 0 0 1 ${num(margin)} ${num(top - 16)} Tm (No rows in this filter.) Tj ET`);
    } else {
      item.rows.forEach((row) => paintRow(row, false));
    }
    const label = `${pageIndex + 1} / ${pages.length}`;
    const labelX = pageW - margin - textWidth(label, 8);
    commands.push(`BT /F1 8 Tf 0.612 0.639 0.686 rg 1 0 0 1 ${num(labelX)} 10 Tm (${label}) Tj ET`);
    return commands.join('\n');
  });

  return assemblePdf(streams, pageW, pageH);
}

export type PdfImage = {
  name: string;
  width: number;
  height: number;
  asciiHex: string;
};

export function assemblePdf(streams: string[], pageW: number, pageH: number, images: PdfImage[] = []): string {
  const pageCount = streams.length;
  const pageId = (index: number) => 5 + index * 2;
  const contentId = (index: number) => 6 + index * 2;
  const contentMax = contentId(pageCount - 1);
  const imageStart = contentMax + 1;
  const maxId = contentMax + images.length;
  const objects: string[] = new Array(maxId + 1).fill('');
  const kids = streams.map((_, index) => `${pageId(index)} 0 R`).join(' ');
  const xobject = images.length
    ? ` /XObject << ${images.map((image, index) => `/${image.name} ${imageStart + index} 0 R`).join(' ')} >>`
    : '';
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  images.forEach((image, index) => {
    const data = `${image.asciiHex}>`;
    objects[imageStart + index] = `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [ /ASCIIHexDecode /DCTDecode ] /Length ${data.length} >>\nstream\n${data}\nendstream`;
  });
  streams.forEach((stream, index) => {
    objects[pageId(index)] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(pageW)} ${num(pageH)}] /Contents ${contentId(index)} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xobject} >> >>`;
    objects[contentId(index)] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let output = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = output.length;
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefAt = output.length;
  output += `xref\n0 ${maxId + 1}\n`;
  output += '0000000000 65535 f \n';
  for (let id = 1; id <= maxId; id += 1) {
    output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return output;
}
