function crcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const CRC32_TABLE = crcTable();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  return out;
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  out[2] = (value >>> 16) & 0xff;
  out[3] = (value >>> 24) & 0xff;
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function zipSafeName(value: string): string {
  const safe = value.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._-]+|[._-]+$/g, '');
  return safe ? safe.slice(0, 80) : 'file';
}

export function zipPathFromTitle(title: string, ext: string): string {
  const parts = title.split('·').map((part) => zipSafeName(part.trim())).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}/${parts.slice(1).join('-')}.${ext}`;
  }
  return `${parts[0] || 'file'}.${ext}`;
}

function dosDateTime(date = new Date()): { time: number; date: number } {
  return {
    time: ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((Math.floor(date.getSeconds() / 2)) & 0x1f),
    date: (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f),
  };
}

export function sliceToDocument(bytes: Uint8Array): Uint8Array {
  if (detectDocExt(bytes)) return bytes;
  const limit = Math.min(bytes.length - 3, 4096);
  for (let i = 0; i < limit; i += 1) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      return bytes.subarray(i);
    }
    if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46) {
      return bytes.subarray(i);
    }
    if (bytes[i] === 0x89 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x4e && bytes[i + 3] === 0x47) {
      return bytes.subarray(i);
    }
  }
  return bytes;
}

export function detectDocExt(bytes: Uint8Array): string | null {
  let start = 0;
  while (start < bytes.length && (bytes[start] === 0x20 || bytes[start] === 0x09 || bytes[start] === 0x0a || bytes[start] === 0x0d)) {
    start += 1;
  }
  const b = start ? bytes.subarray(start) : bytes;
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
    return 'pdf';
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return 'jpg';
  }
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return 'png';
  }
  if (b.length >= 4 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) {
    return 'webp';
  }
  return null;
}

export function mimeFromExt(ext: string): string {
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

export function extFromBytes(mime: string, bytes: Uint8Array): string {
  return detectDocExt(bytes) || (mime.includes('pdf') ? 'pdf' : 'jpg');
}

export function buildZipStore(entries: Array<{ path: string; data: Uint8Array }>): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const encoder = new TextEncoder();

  for (const entry of entries) {
    const name = encoder.encode(entry.path.replace(/\\/g, '/'));
    const data = entry.data;
    const crc = crc32(data);
    const when = dosDateTime();
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(when.time),
      u16(when.date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(when.time),
      u16(when.date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0x20),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDir = concat(centrals);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return concat([...locals, centralDir, end]);
}

export function readStoredZipFile(zip: Uint8Array, path: string): Uint8Array | null {
  let offset = 0;
  const decoder = new TextDecoder();
  while (offset + 30 <= zip.length) {
    const sig = (zip[offset] | (zip[offset + 1] << 8) | (zip[offset + 2] << 16) | (zip[offset + 3] << 24)) >>> 0;
    if (sig !== 0x04034b50) {
      return null;
    }
    const method = zip[offset + 8] | (zip[offset + 9] << 8);
    const size = (zip[offset + 22] | (zip[offset + 23] << 8) | (zip[offset + 24] << 16) | (zip[offset + 25] << 24)) >>> 0;
    const nameLen = zip[offset + 26] | (zip[offset + 27] << 8);
    const extraLen = zip[offset + 28] | (zip[offset + 29] << 8);
    const nameStart = offset + 30;
    const name = decoder.decode(zip.slice(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    const data = zip.slice(dataStart, dataStart + size);
    if (name === path) {
      if (method !== 0) return null;
      return data;
    }
    offset = dataStart + size;
  }
  return null;
}

export function bytesToDownloadBlob(bytes: Uint8Array, mime: string): Blob {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new Blob([copy], { type: mime });
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decodeMediaBytes(raw: Uint8Array): Uint8Array {
  const sliced = sliceToDocument(raw);
  if (detectDocExt(sliced)) {
    return sliced;
  }
  const text = new TextDecoder().decode(raw).trim();
  if (!text.startsWith('{')) {
    return sliced;
  }
  try {
    const json = JSON.parse(text) as { data?: string };
    if (json.data) {
      return sliceToDocument(base64ToBytes(json.data));
    }
  } catch {
    /* not JSON */
  }
  return sliced;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(blob);
  });
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function documentsHtmlPage(
  heading: string,
  files: Array<{ title: string; ext: string; bytes: Uint8Array }>,
): string {
  const items = files.map((file) => {
    const mime = mimeFromExt(file.ext);
    const href = `data:${mime};base64,${bytesToBase64(file.bytes)}`;
    if (file.ext === 'pdf') {
      return `<section><h2>${escapeHtmlText(file.title)}</h2><iframe src="${href}" title="${escapeHtmlText(file.title)}"></iframe></section>`;
    }
    return `<section><h2>${escapeHtmlText(file.title)}</h2><img src="${href}" alt="${escapeHtmlText(file.title)}" /></section>`;
  }).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtmlText(heading)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px auto; max-width: 960px; color: #111; }
    h1 { font-size: 22px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    img { max-width: 100%; height: auto; border: 1px solid #ddd; background: #f4f4f4; }
    iframe { width: 100%; height: 70vh; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>${escapeHtmlText(heading)}</h1>
  ${items || '<p>No documents found.</p>'}
</body>
</html>`;
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
}
