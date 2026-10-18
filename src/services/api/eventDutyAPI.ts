import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { base64ToBytes, blobToDataUrl, bytesToDownloadBlob, decodeMediaBytes, detectDocExt, mimeFromExt, sliceToDocument, triggerBrowserDownload, zipSafeName } from '@/lib/zipStore';
import type {
  DriverPortalBootstrap,
  EventAssignment,
  EventAuditRow,
  EventDashboard,
  EventDocumentRow,
  EventDriverLinkPayload,
  EventDriverOption,
  EventDuty,
  EventFleetOption,
  EventSavePayload,
  EventSharePayload,
  EventShareView,
  EventSummary,
  EventTokenRow,
  EventTrackVehicle,
  VthEvent,
} from '@/types/eventDuty';
import type { DriverEndNotice, EndRequestDelivery } from '@/lib/eventDuty';

function authHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const payload = err.response?.data as { message?: string } | undefined;
    return new Error(payload?.message || err.message);
  }
  return err instanceof Error ? err : new Error('Request failed');
}

async function adminPost<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  try {
    const { data } = await axios.post(getApiUrl(path), body, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    if (!data?.success && data?.status !== 'success') {
      throw new Error(data?.message || 'Request failed');
    }
    return data as T;
  } catch (err) {
    throw apiError(err);
  }
}

async function adminForm<T>(path: string, form: FormData): Promise<T> {
  try {
    const { data } = await axios.post(getApiUrl(path), form, {
      headers: authHeaders(),
    });
    if (!data?.success && data?.status !== 'success') {
      throw new Error(data?.message || 'Request failed');
    }
    return data as T;
  } catch (err) {
    throw apiError(err);
  }
}

const DOC_DOWNLOAD_NAMES: Record<string, string> = {
  rc: 'RC-front',
  rc_back: 'RC-back',
  insurance: 'Insurance-front',
  insurance_back: 'Insurance-back',
  driver_photo: 'Driver-photo',
  dl_front: 'Driving-licence-front',
  dl_back: 'Driving-licence-back',
  aadhaar: 'Aadhaar-front',
  aadhaar_back: 'Aadhaar-back',
  permit: 'Permit',
  fitness: 'Fitness',
  pollution: 'Pollution',
};

function mediaDataUrlFromPayload(data: unknown): string | null {
  const payload = data as { mime?: string; data?: string | { mime?: string; data?: string } } | undefined;
  const mime = (payload?.mime || (typeof payload?.data === 'object' ? payload?.data?.mime : undefined) || 'image/jpeg') as string;
  const raw = typeof payload?.data === 'string' ? payload.data : payload?.data?.data;
  if (!raw || typeof raw !== 'string') return null;
  return `data:${mime};base64,${raw}`;
}

function messageFromBytes(bytes: Uint8Array): string {
  const text = new TextDecoder().decode(bytes.slice(0, 800)).trim();
  try {
    const json = JSON.parse(text) as { message?: string };
    if (json.message) return json.message;
  } catch {
    /* not JSON */
  }
  return 'This file is not a viewable image or PDF.';
}

async function fetchBinary(url: string): Promise<{ bytes: Uint8Array; status: number }> {
  const res = await fetch(url, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  const buf = await res.arrayBuffer();
  return { bytes: decodeMediaBytes(new Uint8Array(buf)), status: res.status };
}

async function fileFromBytes(bytes: Uint8Array, ext: string): Promise<{ blob: Blob; ext: string; objectUrl: string }> {
  const blob = bytesToDownloadBlob(bytes, mimeFromExt(ext));
  return { blob, ext, objectUrl: await blobToDataUrl(blob) };
}

async function fetchAuthedFile(url: string): Promise<{ blob: Blob; ext: string; objectUrl: string; title?: string }> {
  const mediaId = url.includes('/events/media.php') ? Number(/[?&]id=(\d+)/.exec(url)?.[1] || 0) : 0;
  if (mediaId > 0) {
    const fromJson = await fetchMediaBytes(mediaId);
    if (fromJson) {
      return fileFromBytes(fromJson.bytes, fromJson.ext);
    }
  }
  const binary = await fetchBinary(url);
  const binaryExt = detectDocExt(binary.bytes);
  if (binary.status === 200 && binaryExt) {
    return fileFromBytes(binary.bytes, binaryExt);
  }
  const text = new TextDecoder().decode(binary.bytes.slice(0, 200)).trim();
  if (binary.status === 200 && text.startsWith('<')) {
    const blob = new Blob([binary.bytes], { type: 'text/html;charset=utf-8' });
    return { blob, ext: 'html', objectUrl: await blobToDataUrl(blob) };
  }
  throw new Error(messageFromBytes(binary.bytes));
}

async function fetchMediaBytes(id: number): Promise<{ bytes: Uint8Array; ext: string } | null> {
  try {
    const { data, status } = await axios.get(getApiUrl('/api/admin/event-documents.php'), {
      params: { action: 'media', id },
      headers: authHeaders(),
      validateStatus: () => true,
    });
    if (status === 200 && typeof data?.data === 'string') {
      const bytes = decodeMediaBytes(base64ToBytes(data.data));
      const ext = detectDocExt(bytes);
      if (ext) return { bytes, ext };
    }
  } catch {
    /* live PHP may not have action=media yet */
  }
  try {
    const json = await fetchBinary(getApiUrl(`/api/events/media.php?id=${id}&format=json`));
    const jsonExt = detectDocExt(json.bytes);
    if (json.status === 200 && jsonExt) {
      return { bytes: json.bytes, ext: jsonExt };
    }
    if (json.status !== 200) {
      return null;
    }
    const binary = await fetchBinary(getApiUrl(`/api/events/media.php?id=${id}`));
    const ext = detectDocExt(binary.bytes);
    if (binary.status !== 200 || !ext) {
      return null;
    }
    return { bytes: binary.bytes, ext };
  } catch {
    return null;
  }
}

async function previewFromBytes(title: string, bytes: Uint8Array, ext: string): Promise<{ url: string; ext: string; title: string; blob: Blob }> {
  const file = await fileFromBytes(bytes, ext);
  return { url: file.objectUrl, ext, title, blob: file.blob };
}

async function adminGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  try {
    const { data } = await axios.get(getApiUrl(path), {
      params: { ...params, _: Date.now() },
      headers: { ...authHeaders(), 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!data?.success && data?.status !== 'success') {
      throw new Error(data?.message || 'Request failed');
    }
    return data as T;
  } catch (err) {
    throw apiError(err);
  }
}

export const eventDutyAPI = {
  listAppAccess: () =>
    adminPost<{ accesses: Array<{ userId: number; access: string }> }>('/api/admin/events.php', { action: 'list_app_access' }),
  setAppAccess: (userId: number, access: 'full' | 'event_manager' | 'event_driver') =>
    adminPost('/api/admin/events.php', { action: 'set_app_access', userId, access }),
  dashboard: () => adminPost<{ dashboard: EventDashboard }>('/api/admin/events.php', { action: 'dashboard' }),
  listEvents: (q?: string, status?: string) =>
    adminPost<{ events: VthEvent[]; dashboard?: EventDashboard }>('/api/admin/events.php', { action: 'list', q, status }),
  getEvent: (id: number) => adminPost<{ event: VthEvent }>('/api/admin/events.php', { action: 'get', id }),
  createEvent: (payload: EventSavePayload) =>
    adminPost<{ event: VthEvent }>('/api/admin/events.php', { action: 'create', ...payload }),
  updateEvent: (payload: EventSavePayload) =>
    adminPost<{ event: VthEvent }>('/api/admin/events.php', { action: 'update', ...payload }),
  archiveEvent: (id: number) => adminPost('/api/admin/events.php', { action: 'archive', id }),
  deleteEvent: (id: number) => adminPost('/api/admin/events.php', { action: 'delete', id }),
  duplicateEvent: (id: number) => adminPost<{ event: VthEvent }>('/api/admin/events.php', { action: 'duplicate', id }),
  applyOctoberTemplate: (id: number) =>
    adminPost<{ event: VthEvent }>('/api/admin/events.php', { action: 'apply_october_template', id }),
  search: (q: string, filters: Record<string, string | number | undefined> = {}) =>
    adminPost<{ duties: EventDuty[] }>('/api/admin/events.php', { action: 'search', q, ...filters }),
  summary: (id: number) => adminGet<{ summary: EventSummary }>('/api/admin/events.php', { action: 'summary', id }),
  dailyReport: (id: number, date: string) =>
    adminGet<{ event: VthEvent; stats: import('@/types/eventDuty').EventDailyStats; duties: EventDuty[] }>(
      '/api/admin/events.php',
      { action: 'daily_report', id, date },
    ),
  fleetOptions: (eventId: number) =>
    adminPost<{ vehicles: EventFleetOption[]; drivers: EventDriverOption[]; eventDrivers?: EventDriverOption[] }>('/api/admin/events.php', {
      action: 'fleet_options',
      eventId,
    }),
  masterDrivers: () =>
    adminPost<{ drivers: EventDriverOption[] }>('/api/admin/events.php', { action: 'driver_options' }),
  createVehicle: (form: FormData) =>
    adminForm<{ vehicle: EventFleetOption }>('/api/admin/events.php', form),
  updateVehicle: (form: FormData) =>
    adminForm<{ vehicle: EventFleetOption }>('/api/admin/events.php', form),
  deleteVehicle: (id: number, eventId: number) =>
    adminPost('/api/admin/events.php', { action: 'delete_vehicle', id, eventId }),
  createDriver: (form: FormData) =>
    adminForm<{ driver: EventDriverOption }>('/api/admin/events.php', form),
  updateDriver: (form: FormData) =>
    adminForm<{ driver: EventDriverOption }>('/api/admin/events.php', form),
  unassignDriver: (eventId: number, driverId: number) =>
    adminPost('/api/admin/events.php', { action: 'unassign_driver', eventId, driverId }),
  removeEventDriver: (eventId: number, driverId: number) =>
    adminPost('/api/admin/events.php', { action: 'remove_event_driver', eventId, driverId }),
  audit: (eventId: number) => adminGet<{ logs: EventAuditRow[] }>('/api/admin/events.php', { action: 'audit', eventId }),

  listAssignments: (eventId: number) =>
    adminGet<{ assignments: EventAssignment[] }>('/api/admin/event-assignments.php', { action: 'list', eventId }),
  createAssignment: (payload: Record<string, unknown>) =>
    adminPost<{ assignment: EventAssignment }>('/api/admin/event-assignments.php', { action: 'create', ...payload }),
  updateAssignment: (payload: Record<string, unknown>) =>
    adminPost<{ assignment: EventAssignment }>('/api/admin/event-assignments.php', { action: 'update', ...payload }),
  cancelAssignment: (id: number) =>
    adminPost('/api/admin/event-assignments.php', { action: 'delete', id }),
  setAssignmentSerial: (id: number, serialNo: number | null) =>
    adminPost('/api/admin/event-assignments.php', { action: 'set_serial', id, serialNo }),
  replaceAssignment: (payload: Record<string, unknown>) =>
    adminPost<{ assignment: EventAssignment }>('/api/admin/event-assignments.php', { action: 'replace', ...payload }),
  expandRequirement: (payload: Record<string, unknown>) =>
    adminPost('/api/admin/event-assignments.php', { action: 'expand_requirement', ...payload }),

  listDuties: (eventId: number, date?: string, status?: string) =>
    adminGet<{ duties: EventDuty[] }>('/api/admin/event-duties.php', { action: 'list', eventId, date, status }),
  getDuty: (id: number) => adminGet<{ duty: EventDuty }>('/api/admin/event-duties.php', { action: 'get', id }),
  tracking: (eventId: number, date: string) =>
    adminGet<{ vehicles: EventTrackVehicle[] }>('/api/admin/event-duties.php', { action: 'tracking', eventId, date }),
  overrideKm: (payload: Record<string, unknown>) =>
    adminPost<{ duty: EventDuty }>('/api/admin/event-duties.php', { action: 'override_km', ...payload }),
  overrideTimes: (payload: { id: number; reportingTime: string; reportedAt: string | null; closingAt: string | null }) =>
    adminPost<{ duty: EventDuty }>('/api/admin/event-duties.php', { action: 'override_times', ...payload }),
  setReporting: (payload: {
    id: number;
    reportingTime: string;
    reportingLocation?: string | null;
    assignmentId?: number;
    date?: string;
  }) =>
    adminPost<{ duty: EventDuty }>('/api/admin/event-duties.php', { action: 'set_reporting', ...payload }),
  setDutyStatus: (id: number, status: string) =>
    adminPost<{ duty: EventDuty }>('/api/admin/event-duties.php', { action: 'set_status', id, status }),
  setDutyNotes: (id: number, notes: string) =>
    adminPost<{ duty: EventDuty }>('/api/admin/event-duties.php', { action: 'set_notes', id, notes }),
  deleteDuty: (id: number) =>
    adminPost('/api/admin/event-duties.php', { action: 'delete', id }),
  resetDutyReading: (id: number, side: 'opening' | 'closing') =>
    adminPost<{ duty: EventDuty }>('/api/admin/event-duties.php', { action: 'reset_reading', id, side }),
  requestDutyEnd: (id: number) =>
    adminPost<{ duty: EventDuty; delivery: EndRequestDelivery }>('/api/admin/event-duties.php', { action: 'request_end', id }),
  revokeDutyEnd: (id: number) =>
    adminPost<{ duty: EventDuty; delivery: EndRequestDelivery }>('/api/admin/event-duties.php', { action: 'revoke_end', id }),
  resumeDuty: (id: number) =>
    adminPost<{ duty: EventDuty; delivery: EndRequestDelivery }>('/api/admin/event-duties.php', { action: 'resume_duty', id }),

  listDocuments: (eventId: number) =>
    adminGet<{ documents: EventDocumentRow[] }>('/api/admin/event-documents.php', { action: 'list', eventId }),
  verifyDocument: (id: number) => adminPost('/api/admin/event-documents.php', { action: 'verify', id }),
  rejectDocument: (id: number, reason: string) =>
    adminPost('/api/admin/event-documents.php', { action: 'reject', id, reason }),
  deleteDocument: (id: number) =>
    adminPost('/api/admin/event-documents.php', { action: 'delete', id }),

  createShare: (eventId: number) =>
    adminPost<EventSharePayload>('/api/admin/event-share.php', { action: 'create_event_share', eventId }),
  createDriverLink: (assignmentId: number) =>
    adminPost<EventDriverLinkPayload>('/api/admin/event-share.php', { action: 'create_driver_token', assignmentId }),
  listTokens: (eventId: number) =>
    adminGet<{ tokens: EventTokenRow[] }>('/api/admin/event-share.php', { action: 'list', eventId }),
  revokeToken: (id: number, type: 'event_share' | 'driver', eventId?: number) =>
    adminPost('/api/admin/event-share.php', {
      action: type === 'driver' ? 'revoke_driver_token' : 'revoke_event_share',
      id,
      eventId,
    }),

  mediaUrl: (id: number) => getApiUrl(`/api/events/media.php?id=${id}`),
  sharePhotoDataUrl: async (token: string, id: number): Promise<string | null> => {
    const { data } = await axios.get(getApiUrl('/api/events/media.php'), {
      params: { id, format: 'json', shareToken: token },
      headers: { 'X-Event-Share-Token': token },
    });
    return mediaDataUrlFromPayload(data);
  },
  dutySlipUrl: (id: number, extra = '') => getApiUrl(`/api/events/duty-slip-pdf.php?id=${id}${extra}`),
  fetchAuthedFile,
  ocrDocument: async (file: File) => {
    const form = new FormData();
    form.append('image', file);
    const { data } = await axios.post(getApiUrl('/api/events/ocr-odometer.php'), form, {
      headers: authHeaders(),
    });
    return data as { available?: boolean; reading?: number | null; text?: string; message?: string | null };
  },
  loadAssignmentDocuments: async (assignment: EventAssignment) => {
    const files: Array<{ url: string; ext: string; title: string; blob: Blob }> = [];

    const addDocs = async (
      docs: EventAssignment['vehicleDocuments'],
      folder: 'Vehicle' | 'Driver',
    ) => {
      for (const [docType, info] of Object.entries(docs || {})) {
        if (!info?.id) continue;
        const file = await fetchMediaBytes(info.id);
        if (!file) continue;
        const label = DOC_DOWNLOAD_NAMES[docType] || zipSafeName(docType);
        files.push(await previewFromBytes(`${folder} · ${label}`, file.bytes, file.ext));
      }
    };

    await addDocs(assignment.vehicleDocuments, 'Vehicle');
    await addDocs(assignment.driverDocuments, 'Driver');
    if (files.length === 0) {
      throw new Error('No RC, insurance, DL, Aadhaar or photo files could be read.');
    }
    return files;
  },
  downloadAssignmentProfile: async (assignment: EventAssignment) => {
    return eventDutyAPI.loadAssignmentDocuments(assignment);
  },
  openAuthedFile: async (url: string) => {
    try {
      const file = await fetchAuthedFile(url);
      const name = url.includes('duty-slip') ? `duty-slip.${file.ext}` : `document.${file.ext}`;
      if (file.ext === 'html') {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
        document.body.appendChild(iframe);
        const idoc = iframe.contentDocument;
        if (idoc) {
          idoc.open();
          idoc.write(await file.blob.text());
          idoc.close();
          iframe.contentWindow?.print();
        } else {
          triggerBrowserDownload(file.blob, name);
        }
        window.setTimeout(() => iframe.remove(), 2000);
        return file;
      }
      triggerBrowserDownload(file.blob, name);
      return file;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open file');
      throw err;
    }
  },
};

export async function driverPortalRequest<T>(token: string, action: string, extra?: FormData | Record<string, unknown>): Promise<T> {
  try {
    if (extra instanceof FormData) {
      extra.append('token', token);
      extra.append('action', action);
      const { data } = await axios.post(getApiUrl('/api/events/driver-public.php'), extra, {
        headers: { 'X-Event-Driver-Token': token },
      });
      if (!data?.success && data?.status !== 'success') {
        throw new Error(data?.message || 'Request failed');
      }
      return data as T;
    }
    const { data } = await axios.post(
      getApiUrl('/api/events/driver-public.php'),
      { token, action, ...(extra || {}) },
      { headers: { 'Content-Type': 'application/json', 'X-Event-Driver-Token': token } },
    );
    if (!data?.success && data?.status !== 'success') {
      throw new Error(data?.message || 'Request failed');
    }
    return data as T;
  } catch (err) {
    throw apiError(err);
  }
}

export const driverPortalAPI = {
  bootstrap: (token: string) =>
    driverPortalRequest<DriverPortalBootstrap>(token, 'bootstrap').then((data) => data as DriverPortalBootstrap & { event: DriverPortalBootstrap['event'] }),
  register: (token: string, form: FormData) => driverPortalRequest<DriverPortalBootstrap>(token, 'register', form),
  startDuty: (token: string, form: FormData) => driverPortalRequest<{ duty: EventDuty }>(token, 'start_duty', form),
  endDuty: (token: string, form: FormData) => driverPortalRequest<{ duty: EventDuty }>(token, 'end_duty', form),
  pingGps: (token: string, payload: {
    dutyId: number;
    lat: number;
    lng: number;
    accuracy?: number | null;
    speed?: number | null;
    heading?: number | null;
    clientId?: string;
    claim?: boolean;
    release?: boolean;
  }) =>
    driverPortalRequest<{ accepted?: boolean; reason?: string; released?: boolean; track?: EventTrackVehicle }>(token, 'ping_gps', payload),
  endNotices: (token: string) =>
    driverPortalRequest<{ notices: DriverEndNotice[] }>(token, 'end_notices').then((data) => data.notices || []),
  ackEndNotice: (token: string, dutyId: number) =>
    driverPortalRequest<{ seen: boolean }>(token, 'ack_end_notice', { dutyId }),
  markParking: (token: string, dutyId: number) =>
    driverPortalRequest<{ dutyId: number; dutyPlace: 'parking' }>(token, 'mark_parking', { dutyId }),
  registerPush: (token: string, payload: { endpoint: string; keys: { p256dh: string; auth: string }; openPath: string }) =>
    driverPortalRequest<{ saved: boolean }>(token, 'register_push', payload),
  mediaUrl: (token: string, id: number) =>
    getApiUrl(`/api/events/media.php?id=${id}&driverToken=${encodeURIComponent(token)}`),
  mediaObjectUrl: async (token: string, id: number): Promise<string | null> => {
    const response = await fetch(driverPortalAPI.mediaUrl(token, id));
    if (!response.ok) return null;
    const raw = new Uint8Array(await response.arrayBuffer());
    const sliced = sliceToDocument(raw);
    let start = 0;
    while (start < sliced.length && (sliced[start] === 0x20 || sliced[start] === 0x09 || sliced[start] === 0x0a || sliced[start] === 0x0d)) {
      start += 1;
    }
    const bytes = start ? sliced.subarray(start) : sliced;
    const mime = mimeFromExt(detectDocExt(bytes) || 'jpg');
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  },
  photoDataUrl: async (token: string, id: number): Promise<string | null> => {
    const { data } = await axios.get(getApiUrl('/api/events/media.php'), {
      params: { id, format: 'json', driverToken: token },
      headers: { 'X-Event-Driver-Token': token },
    });
    return mediaDataUrlFromPayload(data);
  },
  ocr: async (token: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    form.append('token', token);
    const { data } = await axios.post(getApiUrl('/api/events/ocr-odometer.php'), form, {
      headers: { 'X-Event-Driver-Token': token },
    });
    return data as { available?: boolean; reading?: number | null; text?: string; message?: string | null };
  },
};

export async function setShareDutyPlace(
  token: string,
  dutyId: number,
  place: 'trip' | 'parking',
): Promise<{ dutyPlace: 'trip' | 'parking'; delivery?: EndRequestDelivery | null }> {
  const { data } = await axios.post(
    getApiUrl('/api/events/share-public.php'),
    { token, action: 'set_place', dutyId, place },
    { headers: { 'Content-Type': 'application/json', 'X-Event-Share-Token': token } },
  );
  if (!data?.success && data?.status !== 'success') {
    throw new Error(data?.message || 'Could not update the vehicle');
  }
  return {
    dutyPlace: data.dutyPlace === 'parking' ? 'parking' : 'trip',
    delivery: (data.delivery ?? null) as EndRequestDelivery | null,
  };
}

export async function revokeShareDutyEnd(token: string, dutyId: number): Promise<{ duty: EventDuty; delivery: EndRequestDelivery }> {
  const { data } = await axios.post(
    getApiUrl('/api/events/share-public.php'),
    { token, action: 'revoke_end', dutyId },
    { headers: { 'Content-Type': 'application/json', 'X-Event-Share-Token': token } },
  );
  if (!data?.success && data?.status !== 'success') {
    throw new Error(data?.message || 'Could not revoke the end request');
  }
  if (!data.duty) {
    throw new Error('The end request could not be revoked.');
  }
  return data as { duty: EventDuty; delivery: EndRequestDelivery };
}

export async function resumeShareDuty(token: string, dutyId: number): Promise<{ duty: EventDuty; delivery: EndRequestDelivery }> {
  const { data } = await axios.post(
    getApiUrl('/api/events/share-public.php'),
    { token, action: 'resume_duty', dutyId },
    { headers: { 'Content-Type': 'application/json', 'X-Event-Share-Token': token } },
  );
  if (!data?.success && data?.status !== 'success') {
    throw new Error(data?.message || 'Could not continue this duty');
  }
  if (!data.duty) {
    throw new Error('This duty could not be continued.');
  }
  return data as { duty: EventDuty; delivery: EndRequestDelivery };
}

export async function requestShareDutyEnd(token: string, dutyId: number): Promise<{ duty: EventDuty; delivery: EndRequestDelivery }> {
  const { data } = await axios.post(
    getApiUrl('/api/events/share-public.php'),
    { token, action: 'request_end', dutyId },
    { headers: { 'Content-Type': 'application/json', 'X-Event-Share-Token': token } },
  );
  if (!data?.success && data?.status !== 'success') {
    throw new Error(data?.message || 'Could not ask the driver to end');
  }
  if (!data.delivery || !data.duty) {
    throw new Error('The end-duty alert is not active on the server yet.');
  }
  return data as { duty: EventDuty; delivery: EndRequestDelivery };
}

export async function fetchEventTracking(token: string, date?: string): Promise<EventTrackVehicle[]> {
  const { data } = await axios.get(getApiUrl('/api/events/share-public.php'), {
    params: { token, date, action: 'tracking' },
    headers: { 'X-Event-Share-Token': token },
  });
  if (!data?.success && data?.status !== 'success') {
    throw new Error(data?.message || 'Unable to load tracking');
  }
  const payload = data?.data && typeof data.data === 'object' ? data.data : data;
  return (payload.vehicles || []) as EventTrackVehicle[];
}

export async function fetchEventShare(token: string, date?: string): Promise<EventShareView> {
  const { data } = await axios.get(getApiUrl('/api/events/share-public.php'), {
    params: { token, date },
    headers: { 'X-Event-Share-Token': token },
  });
  if (!data?.success && data?.status !== 'success') {
    throw new Error(data?.message || 'Unable to load event');
  }
  const payload = data?.data && typeof data.data === 'object' && (data.data.vehicles || data.data.event)
    ? data.data
    : data;
  return {
    event: payload.event,
    dates: payload.dates || [],
    selectedDate: payload.selectedDate,
    stats: payload.stats,
    vehicles: payload.vehicles || payload.duties || [],
  } as EventShareView;
}
