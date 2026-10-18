import axios from 'axios';
import { Platform } from 'react-native';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';
import { authAPI } from './authAPI';

function apiBase(): string {
  if (API_BASE_URL) return API_BASE_URL.replace(/\/$/, '');
  if (Platform.OS === 'web') return '';
  return (WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com').replace(/\/$/, '');
}

export type MobileEvent = {
  id: number;
  eventCode: string;
  name: string;
  clientName?: string | null;
  clientMobile?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  reportingLocation?: string | null;
  defaultReportingTime?: string | null;
  notes?: string | null;
  gpsRequired?: boolean;
  supportMobile?: string | null;
  assignmentCount?: number;
  dutyCount?: number;
  requirementGroups?: EventRequirementGroup[];
};

export type EventDashboard = {
  activeEvents: number;
  vehiclesAssigned: number;
  driversRegistered: number;
  todaysDuties: number;
  completedDuties: number;
  pendingDuties: number;
  missingDocuments: number;
};

export type EventRequirementGroup = {
  id: number;
  vehicleType: string;
  vehicleTypeLabel: string;
  quantity: number;
  passengerCount?: number | null;
  notes?: string | null;
  dates: string[];
};

export type EventFleetVehicle = {
  id: number;
  vehicleNumber: string;
  name?: string;
  make?: string | null;
  model?: string | null;
  vehicleType?: string;
  capacity?: number | null;
  ownerName?: string | null;
  ownerMobile?: string | null;
  documents?: Record<string, EventDocInfo>;
};

export type EventPerson = {
  id: number;
  name: string;
  phone?: string | null;
  licenseNo?: string | null;
  aadhaarMasked?: string | null;
  documents?: Record<string, EventDocInfo>;
};

const EMPTY_DASHBOARD: EventDashboard = {
  activeEvents: 0,
  vehiclesAssigned: 0,
  driversRegistered: 0,
  todaysDuties: 0,
  completedDuties: 0,
  pendingDuties: 0,
  missingDocuments: 0,
};

export function formatDutyDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDutyDateRange(dates: string[]): string {
  if (!dates.length) return 'No dates';
  const short = (iso: string) => {
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  const sorted = [...dates].sort();
  const groups: string[][] = [];
  let current: string[] = [];
  for (const date of sorted) {
    if (!current.length) {
      current = [date];
      continue;
    }
    const prev = new Date(`${current[current.length - 1]}T00:00:00`);
    const next = new Date(`${date}T00:00:00`);
    if ((next.getTime() - prev.getTime()) / 86400000 === 1) {
      current.push(date);
    } else {
      groups.push(current);
      current = [date];
    }
  }
  if (current.length) groups.push(current);
  return groups
    .map((group) => (group.length === 1 ? short(group[0]) : `${short(group[0])}–${short(group[group.length - 1])}`))
    .join(' and ');
}

export type ShareVehicle = {
  dutyId?: number;
  vehicleType: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  serialNo?: number | null;
  status: string;
  dutySlipNo: string;
  openingAt?: string | null;
  closingAt?: string | null;
  openingKm?: number | null;
  closingKm?: number | null;
  totalKm?: number | null;
  endRequestedAt?: string | null;
  endRequestSeenAt?: string | null;
  pausedSeconds?: number;
  dutyPlace?: 'trip' | 'parking' | null;
  parkingAsked?: boolean;
  tripSeconds?: number | null;
  parkingSeconds?: number | null;
  placeSince?: string | null;
  placeSpans?: { place: 'trip' | 'parking'; at: string }[] | null;
  reportingTime?: string | null;
  reportingLocation?: string | null;
  driverPhotoId?: number | null;
  openingGps?: { lat: number; lng: number; accuracy?: number | null; address?: string | null } | null;
};

export type ShareStats = {
  totalVehicles: number;
  started: number;
  completed: number;
  pending: number;
};

export type EventSharePayload = {
  event: { id: number; name: string; eventCode: string; startDate: string; endDate: string; showSerialNo?: boolean };
  dates: string[];
  selectedDate: string;
  stats: ShareStats;
  vehicles: ShareVehicle[];
};

export type TrackVehicle = {
  dutyId: number;
  vehicleNumber: string;
  driverName: string;
  driverMobile?: string | null;
  vehicleType?: string | null;
  dutySlipNo?: string | null;
  status?: string | null;
  lat: number | null;
  lng: number | null;
  accuracy?: number | null;
  address?: string | null;
  lastGpsAt?: string | null;
  signal: 'live' | 'stale' | 'offline' | 'none';
};

export type EventDocInfo = {
  id: number;
  docType: string;
  status: string;
  uploaded?: boolean;
};

export type EventAssignmentRow = {
  id: number;
  eventId?: number;
  vehicleId?: number | null;
  driverId?: number | null;
  vehicleType?: string;
  vehicleTypeLabel?: string;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverMobile?: string | null;
  licenseNo?: string | null;
  aadhaarMasked?: string | null;
  status?: string;
  dates?: string[];
  driverDocuments?: Record<string, EventDocInfo>;
  vehicleDocuments?: Record<string, EventDocInfo>;
  hasDriverLink?: boolean;
};

export type EventDutyRow = {
  id: number;
  dutySlipNo?: string;
  dutyDate?: string;
  vehicleNumber?: string | null;
  vehicleTypeLabel?: string | null;
  driverName?: string | null;
  status?: string;
  totalKm?: number | null;
  openingKm?: number | null;
  closingKm?: number | null;
  openingAt?: string | null;
  closingAt?: string | null;
  openingPhotoId?: number | null;
  closingPhotoId?: number | null;
  openingGps?: { address?: string | null } | null;
  endRequestedAt?: string | null;
  endRequestSeenAt?: string | null;
  pausedSeconds?: number;
};

export type EventDocumentItem = {
  id: number;
  docType: string;
  status: string;
  driverName?: string | null;
  vehicleNumber?: string | null;
  dutyDate?: string | null;
  rejectionReason?: string | null;
};

export type EventShareToken = {
  id: number;
  type: string;
  active: boolean;
  revokedAt?: string | null;
  createdAt: string;
  url?: string | null;
};

export type EventAuditEntry = {
  id: number;
  actorType: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
};

export type DutyNotice = {
  id: number;
  status: string;
  openingAt?: string | null;
  closingAt?: string | null;
  endRequestedAt?: string | null;
  endRequestSeenAt?: string | null;
  endRequestNonce?: string | null;
  pausedSeconds?: number;
  dutyPlace?: 'trip' | 'parking';
  parkingPromptAt?: string | null;
  parkingPromptNonce?: string | null;
};

export type DriverGps = {
  lat?: number | string | null;
  lng?: number | string | null;
  accuracy?: number | null;
  address?: string | null;
};

export type DriverDuty = {
  id: number;
  dutySlipNo?: string;
  dutyDate: string;
  status: string;
  vehicleNumber?: string | null;
  reportingTime?: string | null;
  reportingLocation?: string | null;
  openingKm?: number | null;
  closingKm?: number | null;
  totalKm?: number | null;
  openingAt?: string | null;
  closingAt?: string | null;
  openingPhotoId?: number | null;
  closingPhotoId?: number | null;
  needsOpeningReupload?: boolean;
  needsClosingReupload?: boolean;
  openingGps?: DriverGps | null;
  closingGps?: DriverGps | null;
  endRequestedAt?: string | null;
  endRequestSeenAt?: string | null;
  endRequestNonce?: string | null;
  pausedSeconds?: number;
  dutyPlace?: 'trip' | 'parking' | null;
  parkingPromptAt?: string | null;
  parkingPromptNonce?: string | null;
};

export type DriverPortalData = {
  event: {
    id: number;
    eventCode?: string;
    name: string;
    startDate?: string;
    endDate?: string;
    reportingLocation?: string | null;
    defaultReportingTime?: string | null;
    gpsRequired?: boolean;
    supportMobile?: string | null;
  };
  assignment: {
    id: number;
    vehicleType: string;
    vehicleTypeLabel: string;
    vehicleNumber?: string | null;
    driverName?: string | null;
    driverMobile?: string | null;
    licenseNo?: string | null;
    dates: string[];
    reportingTime?: string | null;
    reportingLocation?: string | null;
  };
  registered: boolean;
  documents?: Record<string, { id?: number }> | null;
  driverPhoto?: string | null;
  needVehicleDocuments: boolean;
  duties: DriverDuty[];
  gpsRequired: boolean;
};

export function driverMediaUrl(token: string, id: number): string {
  return `${apiBase()}/api/events/media.php?id=${id}&driverToken=${encodeURIComponent(token)}`;
}

const driverMediaCache = new Map<string, Promise<string | null>>();

function mediaExt(mime: string, raw: string): string | null {
  if (mime.includes('png') || raw.startsWith('iVBOR')) return 'png';
  if (mime.includes('webp') || raw.startsWith('UklGR')) return 'webp';
  if (mime.startsWith('image/') || raw.startsWith('/9j/')) return 'jpg';
  return null;
}

/** Android Image will not decode media.php URLs. Save the file and return a local uri. */
export function loadDriverMedia(token: string, id: number): Promise<string | null> {
  const key = `${id}`;
  const cached = driverMediaCache.get(key);
  if (cached) return cached;
  const job = (async () => {
    const { data } = await axios.get(`${apiBase()}/api/events/media.php`, {
      params: { id, format: 'json', driverToken: token },
      headers: { 'X-Event-Driver-Token': token },
      timeout: 45000,
    });
    const mime = typeof data?.mime === 'string' ? data.mime : '';
    const raw = typeof data?.data === 'string' ? data.data : '';
    const ext = mediaExt(mime, raw);
    if (!raw || !ext) return null;
    if (!cacheDirectory) return `data:${ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'};base64,${raw}`;
    const path = `${cacheDirectory}duty-media-${id}.${ext}`;
    await writeAsStringAsync(path, raw, { encoding: 'base64' });
    return path;
  })().then((uri) => {
    if (!uri) driverMediaCache.delete(key);
    return uri;
  }).catch(() => {
    driverMediaCache.delete(key);
    return null;
  });
  driverMediaCache.set(key, job);
  return job;
}

async function driverRequest<T>(token: string, action: string, extra?: Record<string, unknown>): Promise<T> {
  try {
    const { data } = await axios.post(
      `${apiBase()}/api/events/driver-public.php`,
      { token, action, ...(extra || {}) },
      { headers: { 'Content-Type': 'application/json', 'X-Event-Driver-Token': token }, timeout: 30000 },
    );
    assertOk(data);
    return data as T;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const msg = (err.response?.data as { message?: string } | undefined)?.message;
      throw new Error(msg || err.message || 'Request failed');
    }
    throw err;
  }
}

async function driverForm<T>(
  token: string,
  action: string,
  fields: Record<string, string>,
  files: Record<string, UploadPart | null | undefined>,
): Promise<T> {
  const form = new FormData();
  form.append('token', token);
  form.append('action', action);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  for (const [key, file] of Object.entries(files)) {
    if (!file) continue;
    form.append(key, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  try {
    const { data } = await axios.post(`${apiBase()}/api/events/driver-public.php`, form, {
      headers: { 'X-Event-Driver-Token': token, 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    assertOk(data);
    return data as T;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const msg = (err.response?.data as { message?: string } | undefined)?.message;
      throw new Error(msg || err.message || 'Request failed');
    }
    throw err;
  }
}

type ApiOk = { success?: boolean; status?: string; message?: string };

function assertOk(data: ApiOk): void {
  if (!data?.success && data?.status !== 'success') {
    throw new Error(data?.message || 'Request failed');
  }
}

export type UploadPart = { uri: string; name: string; type: string };

async function adminForm<T>(path: string, fields: Record<string, string>, files: Record<string, UploadPart | null | undefined>): Promise<T> {
  const token = await authAPI.getStoredToken();
  if (!token) throw new Error('Not authenticated');
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  for (const [key, file] of Object.entries(files)) {
    if (!file) continue;
    form.append(key, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  const { data } = await axios.post(`${apiBase()}${path}`, form, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  assertOk(data);
  return data as T;
}

async function adminPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await authAPI.getStoredToken();
  if (!token) throw new Error('Not authenticated');
  const { data } = await axios.post(`${apiBase()}${path}`, body, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 20000,
  });
  assertOk(data);
  return data as T;
}

export const mobileEventAPI = {
  listAppAccess: async (): Promise<Array<{ userId: number; access: string }>> => {
    const data = await adminPost<{ accesses?: Array<{ userId: number; access: string }> }>('/api/admin/events.php', { action: 'list_app_access' });
    return data.accesses ?? [];
  },

  myAppAccess: async (): Promise<{ access: 'full' | 'event_manager' | 'event_driver'; driverToken: string | null }> => {
    const data = await adminPost<{ access?: string; driverToken?: string | null }>('/api/admin/events.php', { action: 'my_app_access' });
    const access = data.access === 'event_manager' || data.access === 'event_driver' ? data.access : 'full';
    return { access, driverToken: data.driverToken || null };
  },

  setAppAccess: async (userId: number, access: 'full' | 'event_manager' | 'event_driver'): Promise<void> => {
    await adminPost('/api/admin/events.php', { action: 'set_app_access', userId, access });
  },

  listEvents: async (q?: string, status?: string): Promise<{ events: MobileEvent[]; dashboard: EventDashboard }> => {
    const data = await adminPost<{ events?: MobileEvent[]; dashboard?: EventDashboard }>('/api/admin/events.php', {
      action: 'list',
      q: q?.trim() || undefined,
      status: status && status !== 'all' ? status : undefined,
    });
    return { events: data.events ?? [], dashboard: data.dashboard ?? EMPTY_DASHBOARD };
  },

  getEvent: async (id: number): Promise<MobileEvent> => {
    const data = await adminPost<{ event: MobileEvent }>('/api/admin/events.php', { action: 'get', id });
    return data.event;
  },

  updateEvent: async (payload: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    clientName?: string;
  }): Promise<MobileEvent> => {
    const data = await adminPost<{ event: MobileEvent }>('/api/admin/events.php', { action: 'update', ...payload });
    return data.event;
  },

  archiveEvent: async (id: number): Promise<void> => {
    await adminPost('/api/admin/events.php', { action: 'archive', id });
  },

  deleteEvent: async (id: number): Promise<void> => {
    await adminPost('/api/admin/events.php', { action: 'delete', id });
  },

  duplicateEvent: async (id: number): Promise<MobileEvent> => {
    const data = await adminPost<{ event: MobileEvent }>('/api/admin/events.php', { action: 'duplicate', id });
    return data.event;
  },

  applyOctoberTemplate: async (id: number): Promise<MobileEvent> => {
    const data = await adminPost<{ event: MobileEvent }>('/api/admin/events.php', { action: 'apply_october_template', id });
    return data.event;
  },

  fleetOptions: async (eventId: number): Promise<{ vehicles: EventFleetVehicle[]; drivers: EventPerson[] }> => {
    const data = await adminPost<{ vehicles?: EventFleetVehicle[]; eventDrivers?: EventPerson[] }>(
      '/api/admin/events.php',
      { action: 'fleet_options', eventId },
    );
    return { vehicles: data.vehicles ?? [], drivers: data.eventDrivers ?? [] };
  },

  createEvent: async (payload: {
    name: string;
    startDate: string;
    endDate: string;
    clientName?: string;
    reportingLocation?: string;
    status?: 'draft' | 'active';
  }): Promise<MobileEvent> => {
    const data = await adminPost<{ event: MobileEvent }>('/api/admin/events.php', {
      action: 'create',
      status: 'active',
      gpsRequired: true,
      defaultReportingTime: '06:00',
      ...payload,
    });
    return data.event;
  },

  listAssignments: async (eventId: number): Promise<EventAssignmentRow[]> => {
    const data = await adminPost<{ assignments?: EventAssignmentRow[] }>('/api/admin/event-assignments.php', {
      action: 'list',
      eventId,
    });
    return data.assignments ?? [];
  },

  createAssignment: async (payload: {
    eventId: number;
    vehicleType: string;
    dates: string[];
    vehicleId?: number | null;
    driverId?: number | null;
    notes?: string;
  }): Promise<void> => {
    await adminPost('/api/admin/event-assignments.php', { action: 'create', ...payload });
  },

  createVehicle: async (eventId: number, fields: Record<string, string>, files: { rc: UploadPart; insurance: UploadPart; rcBack?: UploadPart | null; insuranceBack?: UploadPart | null }): Promise<void> => {
    await adminForm('/api/admin/events.php', { action: 'create_vehicle', eventId: String(eventId), ...fields }, {
      rc: files.rc,
      insurance: files.insurance,
      rc_back: files.rcBack ?? null,
      insurance_back: files.insuranceBack ?? null,
    });
  },

  updateVehicle: async (
    eventId: number,
    id: number,
    fields: Record<string, string>,
    files: { rc?: UploadPart | null; insurance?: UploadPart | null; rcBack?: UploadPart | null; insuranceBack?: UploadPart | null },
  ): Promise<void> => {
    await adminForm('/api/admin/events.php', { action: 'update_vehicle', eventId: String(eventId), id: String(id), ...fields }, {
      rc: files.rc ?? null,
      insurance: files.insurance ?? null,
      rc_back: files.rcBack ?? null,
      insurance_back: files.insuranceBack ?? null,
    });
  },

  deleteVehicle: async (id: number, eventId: number): Promise<void> => {
    await adminPost('/api/admin/events.php', { action: 'delete_vehicle', id, eventId });
  },

  createDriver: async (eventId: number, fields: Record<string, string>, files: Partial<Record<'driver_photo' | 'dl_front' | 'dl_back' | 'aadhaar' | 'aadhaar_back', UploadPart | null>>): Promise<void> => {
    await adminForm('/api/admin/events.php', { action: 'create_driver', eventId: String(eventId), ...fields }, files);
  },

  removeDriver: async (eventId: number, driverId: number): Promise<void> => {
    await adminPost('/api/admin/events.php', { action: 'remove_event_driver', eventId, driverId });
  },

  listDuties: async (eventId: number): Promise<EventDutyRow[]> => {
    const data = await adminPost<{ duties?: EventDutyRow[] }>('/api/admin/event-duties.php', {
      action: 'list',
      eventId,
    });
    return data.duties ?? [];
  },

  listDocuments: async (eventId: number): Promise<EventDocumentItem[]> => {
    const data = await adminPost<{ documents?: EventDocumentItem[] }>('/api/admin/event-documents.php', {
      action: 'list',
      eventId,
    });
    return data.documents ?? [];
  },

  downloadDocument: async (id: number): Promise<{ mime: string; data: string; name: string }> => {
    const data = await adminPost<{ mime?: string; data?: string; name?: string }>('/api/admin/event-documents.php', {
      action: 'media',
      id,
    });
    if (!data.data) throw new Error('File missing');
    return { mime: data.mime || 'application/octet-stream', data: data.data, name: data.name || 'document' };
  },

  verifyDocument: async (id: number): Promise<void> => {
    await adminPost('/api/admin/event-documents.php', { action: 'verify', id });
  },

  rejectDocument: async (id: number, reason: string): Promise<void> => {
    await adminPost('/api/admin/event-documents.php', { action: 'reject', id, reason });
  },

  deleteDocument: async (id: number): Promise<void> => {
    await adminPost('/api/admin/event-documents.php', { action: 'delete', id });
  },

  updateAssignment: async (payload: {
    id: number;
    eventId: number;
    dates?: string[];
    vehicleType?: string;
    vehicleId?: number | null;
    driverId?: number | null;
  }): Promise<void> => {
    await adminPost('/api/admin/event-assignments.php', { action: 'update', ...payload });
  },

  replaceAssignment: async (payload: {
    id: number;
    fromDate: string;
    vehicleId?: number | null;
    driverId?: number | null;
    vehicleType?: string;
  }): Promise<void> => {
    await adminPost('/api/admin/event-assignments.php', { action: 'replace', ...payload });
  },

  expandRequirement: async (payload: {
    eventId: number;
    vehicleType: string;
    quantity: number;
    passengerCount?: number | null;
    dates: string[];
  }): Promise<void> => {
    await adminPost('/api/admin/event-assignments.php', { action: 'expand_requirement', ...payload });
  },

  deleteAssignment: async (id: number): Promise<void> => {
    await adminPost('/api/admin/event-assignments.php', { action: 'delete', id });
  },

  deleteDuty: async (id: number): Promise<void> => {
    await adminPost('/api/admin/event-duties.php', { action: 'delete', id });
  },

  requestDutyEnd: async (id: number): Promise<void> => {
    await adminPost('/api/admin/event-duties.php', { action: 'request_end', id });
  },

  revokeDutyEnd: async (id: number): Promise<void> => {
    await adminPost('/api/admin/event-duties.php', { action: 'revoke_end', id });
  },

  resumeDuty: async (id: number): Promise<void> => {
    await adminPost('/api/admin/event-duties.php', { action: 'resume_duty', id });
  },

  createDriverLink: async (assignmentId: number): Promise<string> => {
    const data = await adminPost<{ url?: string }>('/api/admin/event-share.php', {
      action: 'create_driver_token',
      assignmentId,
    });
    if (!data.url) throw new Error('Could not create the registration link');
    return data.url;
  },

  listShareTokens: async (eventId: number): Promise<EventShareToken[]> => {
    const data = await adminPost<{ tokens?: EventShareToken[] }>('/api/admin/event-share.php', { action: 'list', eventId });
    return (data.tokens ?? []).filter((row) => row.type === 'event_share');
  },

  createShare: async (eventId: number): Promise<string> => {
    const data = await adminPost<{ url?: string; token?: string }>('/api/admin/event-share.php', {
      action: 'create_event_share',
      eventId,
    });
    if (data.url) return data.url;
    if (data.token) return `${data.token}`;
    throw new Error('Could not create the share link');
  },

  revokeShare: async (id: number, eventId: number): Promise<void> => {
    await adminPost('/api/admin/event-share.php', { action: 'revoke_event_share', id, eventId });
  },

  audit: async (eventId: number): Promise<EventAuditEntry[]> => {
    const data = await adminPost<{ logs?: EventAuditEntry[] }>('/api/admin/events.php', { action: 'audit', eventId });
    return data.logs ?? [];
  },

  ensureShareToken: async (eventId: number): Promise<string> => {
    const listed = await adminPost<{ tokens?: Array<{ type?: string; active?: boolean; revokedAt?: string | null; url?: string | null }> }>(
      '/api/admin/event-share.php',
      { action: 'list', eventId },
    );
    const existing = (listed.tokens ?? []).find((row) => row.type === 'event_share' && row.active && !row.revokedAt && row.url);
    const fromUrl = existing?.url?.match(/\/event\/share\/([A-Za-z0-9]+)/)?.[1];
    if (fromUrl) return fromUrl;
    const created = await adminPost<{ token?: string }>('/api/admin/event-share.php', {
      action: 'create_event_share',
      eventId,
    });
    if (!created.token) throw new Error('Could not open the event link');
    return created.token;
  },

  fetchShare: async (token: string, date?: string): Promise<EventSharePayload> => {
    const { data } = await axios.post(
      `${apiBase()}/api/events/share-public.php`,
      { token, action: 'share', date: date || undefined },
      { headers: { 'Content-Type': 'application/json', 'X-Event-Share-Token': token }, timeout: 20000 },
    );
    assertOk(data);
    return data as EventSharePayload;
  },

  listTracking: async (eventId: number, date?: string): Promise<TrackVehicle[]> => {
    const data = await adminPost<{ vehicles?: TrackVehicle[] }>('/api/admin/event-duties.php', {
      action: 'tracking',
      eventId,
      date: date || undefined,
    });
    return data.vehicles ?? [];
  },

  fetchTracking: async (token: string, date?: string): Promise<TrackVehicle[]> => {
    const { data } = await axios.get(`${apiBase()}/api/events/share-public.php`, {
      params: { token, action: 'tracking', date: date || undefined },
      headers: { 'X-Event-Share-Token': token },
      timeout: 20000,
    });
    assertOk(data);
    return (data.vehicles ?? []) as TrackVehicle[];
  },

  askInTrip: async (token: string, dutyId: number): Promise<void> => {
    await mobileEventAPI.setDutyPlace(token, dutyId, 'trip');
  },

  setDutyPlace: async (token: string, dutyId: number, place: 'trip' | 'parking'): Promise<void> => {
    const { data } = await axios.post(
      `${apiBase()}/api/events/share-public.php`,
      { token, action: 'set_place', dutyId, place },
      { headers: { 'Content-Type': 'application/json', 'X-Event-Share-Token': token }, timeout: 20000 },
    );
    assertOk(data);
  },

  askEndDuty: async (token: string, dutyId: number): Promise<void> => {
    const { data } = await axios.post(
      `${apiBase()}/api/events/share-public.php`,
      { token, action: 'request_end', dutyId },
      { headers: { 'Content-Type': 'application/json', 'X-Event-Share-Token': token }, timeout: 20000 },
    );
    assertOk(data);
  },

  revokeEndDuty: async (token: string, dutyId: number): Promise<void> => {
    const { data } = await axios.post(
      `${apiBase()}/api/events/share-public.php`,
      { token, action: 'revoke_end', dutyId },
      { headers: { 'Content-Type': 'application/json', 'X-Event-Share-Token': token }, timeout: 20000 },
    );
    assertOk(data);
  },

  resumeDutyShare: async (token: string, dutyId: number): Promise<void> => {
    const { data } = await axios.post(
      `${apiBase()}/api/events/share-public.php`,
      { token, action: 'resume_duty', dutyId },
      { headers: { 'Content-Type': 'application/json', 'X-Event-Share-Token': token }, timeout: 20000 },
    );
    assertOk(data);
  },

  driverNotices: async (token: string): Promise<DutyNotice[]> => {
    const { data } = await axios.post(
      `${apiBase()}/api/events/driver-public.php`,
      { token, action: 'end_notices' },
      { headers: { 'Content-Type': 'application/json', 'X-Event-Driver-Token': token }, timeout: 20000 },
    );
    assertOk(data);
    return (data.notices ?? []) as DutyNotice[];
  },

  markParking: async (token: string, dutyId: number): Promise<void> => {
    const { data } = await axios.post(
      `${apiBase()}/api/events/driver-public.php`,
      { token, action: 'mark_parking', dutyId },
      { headers: { 'Content-Type': 'application/json', 'X-Event-Driver-Token': token }, timeout: 20000 },
    );
    assertOk(data);
  },

  ackEndNotice: async (token: string, dutyId: number): Promise<void> => {
    const { data } = await axios.post(
      `${apiBase()}/api/events/driver-public.php`,
      { token, action: 'ack_end_notice', dutyId },
      { headers: { 'Content-Type': 'application/json', 'X-Event-Driver-Token': token }, timeout: 20000 },
    );
    assertOk(data);
  },

  driverBootstrap: async (token: string): Promise<DriverPortalData> => {
    const data = await driverRequest<DriverPortalData>(token, 'bootstrap');
    return {
      ...data,
      duties: data.duties ?? [],
      assignment: { ...data.assignment, dates: data.assignment?.dates ?? [] },
      registered: Boolean(data.registered),
      needVehicleDocuments: Boolean(data.needVehicleDocuments),
      gpsRequired: Boolean(data.gpsRequired),
    };
  },

  driverRegister: async (token: string, fields: Record<string, string>, files: Record<string, UploadPart | null | undefined>): Promise<void> => {
    await driverForm(token, 'register', fields, files);
  },

  driverStartDuty: async (token: string, fields: Record<string, string>, photo: UploadPart): Promise<void> => {
    await driverForm(token, 'start_duty', fields, { photo });
  },

  driverEndDuty: async (token: string, fields: Record<string, string>, photo: UploadPart): Promise<void> => {
    await driverForm(token, 'end_duty', fields, { photo });
  },

  registerExpoPush: async (token: string, expoToken: string): Promise<void> => {
    await driverRequest(token, 'register_expo', { expoToken });
  },

  driverOcr: async (token: string, file: UploadPart): Promise<{ reading?: number | null; text?: string }> => {
    const form = new FormData();
    form.append('token', token);
    form.append('image', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    try {
      const { data } = await axios.post(`${apiBase()}/api/events/ocr-odometer.php`, form, {
        headers: { 'X-Event-Driver-Token': token, 'Content-Type': 'multipart/form-data' },
        timeout: 45000,
      });
      return data as { reading?: number | null; text?: string };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message;
        throw new Error(msg || 'Could not read the photo');
      }
      throw err;
    }
  },
};
