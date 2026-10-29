export const EVENT_VEHICLE_TYPES = [
  'sedan',
  'innova',
  'innova_crysta',
  'ertiga',
  'fortuner',
  'mini_bus',
  'tempo_traveller',
  'urbania',
  'other',
] as const;

export type EventVehicleType = (typeof EVENT_VEHICLE_TYPES)[number];

export const EVENT_DUTY_STATUSES = [
  'scheduled',
  'not_started',
  'in_progress',
  'completed',
  'missing_opening',
  'missing_closing',
  'exception',
  'cancelled',
] as const;

export type EventDutyStatus = (typeof EVENT_DUTY_STATUSES)[number];

export type EventStatus = 'draft' | 'active' | 'archived';

export interface EventGps {
  lat: number;
  lng: number;
  accuracy: number | null;
  address?: string | null;
}

export interface VthEvent {
  id: number;
  eventCode: string;
  name: string;
  clientName?: string | null;
  clientMobile?: string | null;
  startDate: string;
  endDate: string;
  reportingLocation?: string | null;
  defaultReportingTime: string;
  notes?: string | null;
  status: EventStatus;
  gpsRequired: boolean;
  showSerialNo?: boolean;
  billingIncludedHours?: number | null;
  billingIncludedKm?: number | null;
  supportMobile?: string | null;
  assignmentCount?: number;
  dutyCount?: number;
  createdAt?: string;
  updatedAt?: string;
  requirementGroups?: EventRequirementGroup[];
  dashboard?: EventDailyStats;
}

export interface EventRequirementGroup {
  id: number;
  vehicleType: EventVehicleType | string;
  vehicleTypeLabel: string;
  quantity: number;
  passengerCount?: number | null;
  notes?: string | null;
  dates: string[];
}

export interface EventDailyStats {
  date: string;
  totalVehicles: number;
  started: number;
  inProgress: number;
  completed: number;
  pending: number;
  missingOpening?: number;
  missingClosing?: number;
  exception?: number;
}

export interface EventDashboard {
  activeEvents: number;
  vehiclesAssigned: number;
  driversRegistered: number;
  todaysDuties: number;
  completedDuties: number;
  pendingDuties: number;
  missingDocuments: number;
}

export interface EventAssignment {
  id: number;
  eventId: number;
  requirementGroupId?: number | null;
  vehicleId?: number | null;
  driverId?: number | null;
  vehicleType: string;
  vehicleTypeLabel: string;
  vehicleNumber?: string | null;
  make?: string | null;
  model?: string | null;
  ownerName?: string | null;
  ownerMobile?: string | null;
  driverName?: string | null;
  driverMobile?: string | null;
  licenseNo?: string | null;
  aadhaarMasked?: string | null;
  passengerCount?: number | null;
  reportingTime?: string | null;
  reportingLocation?: string | null;
  notes?: string | null;
  serialNo?: number | null;
  status: 'active' | 'replaced' | 'cancelled';
  replacedFromAssignmentId?: number | null;
  dates: string[];
  driverDocuments?: Record<string, EventDocumentInfo>;
  vehicleDocuments?: Record<string, EventDocumentInfo>;
  hasDriverLink?: boolean;
  driverLinkCreatedAt?: string | null;
}

export interface EventDocumentInfo {
  id: number;
  docType: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string | null;
  createdAt?: string;
  uploaded: boolean;
}

export interface EventDocumentRow {
  id: number;
  ownerType: 'driver' | 'vehicle' | 'duty';
  ownerId: number;
  docType: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string | null;
  driverName?: string | null;
  vehicleNumber?: string | null;
  dutyDate?: string | null;
  dutySlipNo?: string | null;
  createdAt: string;
  sensitive: boolean;
}

export interface EventDuty {
  id: number;
  dutySlipNo: string;
  eventId: number;
  eventName?: string | null;
  eventCode?: string | null;
  assignmentId: number;
  vehicleId?: number | null;
  driverId?: number | null;
  vehicleType?: string | null;
  vehicleTypeLabel?: string;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverMobile?: string | null;
  dutyDate: string;
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
  openingGps?: EventGps | null;
  closingGps?: EventGps | null;
  status: EventDutyStatus | string;
  endRequestedAt?: string | null;
  endRequestSeenAt?: string | null;
  endRequestNonce?: string | null;
  pausedSeconds?: number;
  tollParking?: number | null;
  dutyPlace?: 'trip' | 'parking' | null;
  parkingPromptAt?: string | null;
  parkingPromptNonce?: string | null;
  notes?: string | null;
  verificationCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventVehicleRates {
  vendorPackagePrice?: number | null;
  vendorExtraHour?: number | null;
  vendorExtraKm?: number | null;
  vthPackagePrice?: number | null;
  vthExtraHour?: number | null;
  vthExtraKm?: number | null;
}

export interface EventVehicleRateInput extends EventVehicleRates {
  id: number;
}

export interface EventFleetOption extends EventVehicleRates {
  id: number;
  vehicleNumber: string;
  name: string;
  make?: string;
  model?: string;
  vehicleType?: string;
  capacity?: number | null;
  ownerName?: string | null;
  ownerMobile?: string | null;
  serialNo?: number | null;
  status?: string;
  documents?: Record<string, EventDocumentInfo>;
}

export interface EventDriverOption {
  id: number;
  name: string;
  phone: string;
  licenseNo?: string | null;
  aadhaarMasked?: string | null;
  status?: string;
  documents?: Record<string, EventDocumentInfo>;
}

export interface EventSharePayload {
  token: string;
  url: string;
  todayUrl?: string;
  expiresAt?: string | null;
}

export interface EventDriverLinkPayload {
  token: string;
  url: string;
  expiresAt?: string | null;
}

export interface EventTokenRow {
  id: number;
  type: 'driver' | 'event_share';
  assignmentId?: number | null;
  driverId?: number | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
  active: boolean;
  url?: string | null;
}

export interface EventAuditRow {
  id: number;
  actorType: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
  createdAt: string;
}

export interface EventSummary {
  event: VthEvent;
  totalVehicles: number;
  totalDrivers: number;
  totalDutyDays: number;
  completedDutySlips: number;
  pendingDutySlips: number;
  totalKm: number;
  vehicleWise: Array<{ vehicle: string | null; driver: string | null; dutyDays: number; totalKm: number }>;
  driverWise: Array<{ driver: string | null; vehicle: string | null; dutyDays: number; totalKm: number }>;
}

export type EventTrackSignal = 'live' | 'stale' | 'offline' | 'none';

export interface EventTrackVehicle {
  dutyId: number;
  dutySlipNo: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  driverMobile: string;
  status: string;
  openingAt?: string | null;
  closingAt?: string | null;
  lat: number | null;
  lng: number | null;
  accuracy?: number | null;
  address?: string | null;
  lastGpsAt?: string | null;
  signal: EventTrackSignal;
}

export interface EventShareView {
  event: Pick<VthEvent, 'id' | 'eventCode' | 'name' | 'startDate' | 'endDate' | 'updatedAt' | 'status' | 'gpsRequired' | 'showSerialNo'>;
  dates: string[];
  selectedDate: string;
  stats: EventDailyStats;
  vehicles: Array<{
    dutyId?: number;
    vehicleType: string;
    vehicleNumber: string;
    driverName: string;
    driverMobile: string;
    serialNo?: number | null;
    driverPhotoId?: number | null;
    driverPhoto?: string | null;
    reportingTime?: string | null;
    reportingLocation?: string | null;
    status: string;
    openingKm?: number | null;
    closingKm?: number | null;
    totalKm?: number | null;
    openingPhotoId?: number | null;
    closingPhotoId?: number | null;
    dutySlipNo: string;
    openingAt?: string | null;
    closingAt?: string | null;
    endRequestedAt?: string | null;
    endRequestSeenAt?: string | null;
    pausedSeconds?: number;
    dutyPlace?: 'trip' | 'parking' | null;
    parkingAsked?: boolean;
    openingGps?: EventGps | null;
    closingGps?: EventGps | null;
  }>;
}

export interface DriverPortalBootstrap {
  event: Pick<VthEvent, 'id' | 'eventCode' | 'name' | 'startDate' | 'endDate' | 'reportingLocation' | 'defaultReportingTime' | 'gpsRequired' | 'supportMobile'>;
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
  documents: Record<string, EventDocumentInfo> | Record<string, never>;
  driverPhoto?: string | null;
  needVehicleDocuments: boolean;
  duties: EventDuty[];
  gpsRequired: boolean;
}

export interface EventSavePayload {
  id?: number;
  name: string;
  eventCode?: string;
  clientName?: string;
  clientMobile?: string;
  startDate: string;
  endDate: string;
  reportingLocation?: string;
  defaultReportingTime?: string;
  notes?: string;
  status?: EventStatus;
  gpsRequired?: boolean;
  showSerialNo?: boolean;
  supportMobile?: string;
}
