import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { DateChipPicker } from '@/components/admin/events/DateChipPicker';
import { DutyDuration, DutyStamp } from '@/components/admin/events/DutyReportDetails';
import { EventFormDialog } from '@/components/admin/events/EventFormDialog';
import { EventListFilters } from '@/components/admin/events/EventListFilters';
import { AskDriverEndButton } from '@/components/events/AskDriverEndButton';
import { ContinueDutyButton } from '@/components/events/ContinueDutyButton';
import { CroppableFileField } from '@/components/events/CroppableFileField';
import { EventMediaViewer, type EventMediaPreview } from '@/components/events/EventMediaViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CalendarDays, Car, Clock, Download, RefreshCw, Save, StickyNote, Trash2, UserRound, Users, X } from 'lucide-react';
import { EventTrackingMap } from '@/components/events/EventTrackingMap';
import { eventDutyAPI } from '@/services/api/eventDutyAPI';
import { printHtmlReport } from '@/lib/eventDutyReportPdf';
import { zipSafeName } from '@/lib/zipStore';
import {
  billableDutyEnd,
  dutyClosingTime,
  datesBetween,
  downloadCsv,
  driverRegistrationMessage,
  dutySlipMessage,
  dutyStatusLabel,
  escapeHtml,
  eventShareMessage,
  eventVehicleTypeLabel,
  formatDutyDate,
  formatDutyDateRange,
  formatDutyDateShort,
  formatReportDutyDuration,
  toLocalIsoDate,
  formatReportingTime,
  fromDutyTimeInput,
  reportDutyStart,
  formatGps,
  formatServerDateTime,
  isRegisteredEventVehicle,
  keepFilled,
  qrImageUrl,
  todayIsoDate,
  toDutyTimeInput,
  whatsappUrl,
  type DocumentOcrFields,
} from '@/lib/eventDuty';
import { EVENT_DUTY_STATUSES, EVENT_VEHICLE_TYPES } from '@/types/eventDuty';
import type {
  EventAssignment,
  EventAuditRow,
  EventDocumentInfo,
  EventDocumentRow,
  EventDriverOption,
  EventDuty,
  EventFleetOption,
  EventSavePayload,
  EventSummary,
  EventTokenRow,
  EventTrackVehicle,
  VthEvent,
} from '@/types/eventDuty';

const TABS = ['overview', 'vehicles', 'drivers', 'assignments', 'duties', 'documents', 'reports', 'share', 'tracking', 'settings'] as const;
const FILTER_TABS = ['overview', 'vehicles', 'drivers', 'assignments', 'duties', 'documents', 'reports'] as const;

function confirmAction(message: string): boolean {
  return window.confirm(message);
}

export default function EventDetailPage() {
  const { eventId } = useParams();
  const id = Number(eventId);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab') as typeof TABS[number]) ? (params.get('tab') as string) : 'overview';
  const [event, setEvent] = useState<VthEvent | null>(null);
  const [assignments, setAssignments] = useState<EventAssignment[]>([]);
  const [duties, setDuties] = useState<EventDuty[]>([]);
  const [documents, setDocuments] = useState<EventDocumentRow[]>([]);
  const [vehicles, setVehicles] = useState<EventFleetOption[]>([]);
  const [drivers, setDrivers] = useState<EventDriverOption[]>([]);
  const [eventDrivers, setEventDrivers] = useState<EventDriverOption[]>([]);
  const [tokens, setTokens] = useState<EventTokenRow[]>([]);
  const [audit, setAudit] = useState<EventAuditRow[]>([]);
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<EventAssignment | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [replaceFor, setReplaceFor] = useState<EventAssignment | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [driverLink, setDriverLink] = useState<{ assignmentId: number; url: string } | null>(null);
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [mediaPreview, setMediaPreview] = useState<EventMediaPreview[] | null>(null);
  const [mediaFolder, setMediaFolder] = useState('');
  const [booted, setBooted] = useState(false);
  const bootedFor = useRef(0);

  const viewFile = async (url: string, title: string) => {
    try {
      const file = await eventDutyAPI.fetchAuthedFile(url);
      setMediaFolder(zipSafeName(title));
      setMediaPreview((prev) => {
        prev?.forEach((item) => {
          if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
        });
        return [{ url: file.objectUrl, ext: file.ext, title, blob: file.blob }];
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open file');
    }
  };

  const viewAssignmentFiles = async (assignment: EventAssignment) => {
    try {
      const files = await eventDutyAPI.loadAssignmentDocuments(assignment);
      setMediaFolder(
        [assignment.vehicleNumber, assignment.driverName].filter(Boolean).map((part) => zipSafeName(String(part))).join('_') || 'documents',
      );
      setMediaPreview((prev) => {
        prev?.forEach((item) => {
          if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
        });
        return files;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open files');
    }
  };
  const driverLinkAssignment = driverLink
    ? assignments.find((a) => a.id === driverLink.assignmentId)
    : undefined;

  const reload = async () => {
    if (!id) return;
    const switching = bootedFor.current !== id;
    if (switching) {
      setBooted(false);
    }
    setRefreshing(true);
    try {
      const ev = await eventDutyAPI.getEvent(id);
      setEvent(ev.event);
      const [asg, duty, opts] = await Promise.all([
        eventDutyAPI.listAssignments(id),
        eventDutyAPI.listDuties(id),
        eventDutyAPI.fleetOptions(id),
      ]);
      setAssignments(asg.assignments || []);
      setDuties(duty.duties || []);
      setVehicles(opts.vehicles || []);
      setEventDrivers(opts.eventDrivers || []);
      if ((opts.drivers || []).length > 0) {
        setDrivers(opts.drivers || []);
      }
      bootedFor.current = id;
      setBooted(true);
      void Promise.all([
        eventDutyAPI.listDocuments(id).then((docs) => setDocuments(docs.documents || [])).catch(() => undefined),
        eventDutyAPI.summary(id).then((sum) => setSummary(sum.summary)).catch(() => undefined),
        eventDutyAPI.listTokens(id).then((toks) => setTokens(toks.tokens || [])).catch(() => undefined),
        eventDutyAPI.audit(id).then((logs) => setAudit(logs.logs || [])).catch(() => undefined),
      ]);
      if (tab === 'drivers' || assignOpen || replaceFor) {
        void eventDutyAPI.masterDrivers().then((res) => setDrivers(res.drivers || [])).catch(() => undefined);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load event');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void reload();
    // Load once per event id; reload() is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const needMasters = tab === 'drivers' || assignOpen || replaceFor != null;
    if (!id || !needMasters) return;
    let cancelled = false;
    void eventDutyAPI.masterDrivers().then((res) => {
      if (!cancelled) setDrivers(res.drivers || []);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, tab, assignOpen, replaceFor]);

  const eventDates = useMemo(
    () => (event ? datesBetween(event.startDate, event.endDate) : []),
    [event],
  );

  useEffect(() => {
    if (!event) return;
    setFilterFrom(event.startDate);
    setFilterTo(event.endDate);
  }, [event?.id, event?.startDate, event?.endDate]);

  useEffect(() => {
    setFilterVehicle('all');
  }, [id]);

  if (!event) {
    return <AdminLayout activeTab="events"><div className="p-6">Loading event…</div></AdminLayout>;
  }

  const from = filterFrom || event.startDate;
  const to = filterTo || event.endDate;
  const vehicleOptions = vehicleChoices(duties, [...vehicles, ...assignments]);
  const filteredAssignments = sortAssignments(assignments.filter((a) => assignmentMatchesFilter(a, filterVehicle, from, to)));
  const filteredDuties = dutiesMatchingFilter(duties, filterVehicle, from, to);
  const reportDuties = dutiesForReport(duties, filterVehicle, from, to);
  const filteredDocuments = documents.filter((doc) => documentMatchesFilter(doc, filterVehicle, from, to));
  const filteredVehicles = vehicles.filter((v) => filterVehicle === 'all' || v.vehicleNumber === filterVehicle);
  const filteredKm = reportDuties.reduce((sum, d) => sum + (d.totalKm || 0), 0);
  const showFilters = (FILTER_TABS as readonly string[]).includes(tab);

  return (
    <AdminLayout activeTab="events">
      <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <Link to="/admin/events" className="text-sm text-blue-600">← All events</Link>
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <p className="text-sm text-muted-foreground">{event.eventCode} · {formatDutyDate(event.startDate)} – {formatDutyDate(event.endDate)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={refreshing} onClick={() => { void reload(); }}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>Edit / change dates</Button>
            <Button variant="outline" onClick={async () => {
              await eventDutyAPI.archiveEvent(event.id);
              toast.success('Event archived');
              void reload();
            }}>Archive</Button>
            <Button variant="outline" className="text-red-600" onClick={async () => {
              if (!confirmAction(`Delete “${event.name}”? Unstarted duties will be removed. Started duties must be cancelled first.`)) return;
              try {
                await eventDutyAPI.deleteEvent(event.id);
                toast.success('Event deleted');
                navigate('/admin/events');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Could not delete event');
              }
            }}>Delete</Button>
            <Button onClick={() => navigate(`/admin/events/${event.id}/daily-report`)}>Daily report</Button>
          </div>
        </div>

        {booted ? <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
          <TabsList className="flex h-auto w-full min-w-0 flex-wrap">
            {TABS.map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t === 'reports' ? 'Daily Reports' : t === 'share' ? 'Share Event' : t === 'tracking' ? 'Live tracking' : t}</TabsTrigger>)}
          </TabsList>

          {showFilters && (
            <EventListFilters
              vehicles={vehicleOptions}
              value={{ vehicle: filterVehicle, from, to }}
              onChange={(next) => {
                setFilterVehicle(next.vehicle);
                setFilterFrom(next.from);
                setFilterTo(next.to);
              }}
              extra={(
                <>
                  <Button variant="outline" onClick={() => exportTabExcel(tab, event, filterVehicle, {
                    assignments: filteredAssignments,
                    duties: tab === 'duties' ? filteredDuties : reportDuties,
                    documents: filteredDocuments,
                    vehicles: filteredVehicles,
                  })}>Excel</Button>
                  <Button variant="outline" onClick={() => exportTabPdf(tab, event, from, to, filterVehicle, {
                    assignments: filteredAssignments,
                    duties: tab === 'duties' ? filteredDuties : reportDuties,
                    documents: filteredDocuments,
                    vehicles: filteredVehicles,
                  })}>PDF</Button>
                </>
              )}
            />
          )}

          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3">
              <Stat title="Assignments" value={filteredAssignments.length} />
              <Stat title="Duty days" value={reportDuties.length} />
              <Stat title="Completed" value={reportDuties.filter((d) => d.status === 'completed').length} />
              <Stat title="Total KM" value={filteredKm} />
            </div>
            <Card>
              <CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(event.requirementGroups || []).filter((g) => {
                  const dates = g.dates || [];
                  if (dates.length === 0) return true;
                  return dates.some((d) => (!from || d >= from) && (!to || d <= to));
                }).map((g) => (
                  <div key={g.id} className="rounded-md border p-3 text-sm">
                    <strong>{g.quantity} × {g.vehicleTypeLabel}</strong>
                    {g.passengerCount ? ` · ${g.passengerCount} pax` : ''}
                    <div className="text-muted-foreground">{formatDutyDateRange(g.dates)}</div>
                  </div>
                ))}
                <Button variant="outline" onClick={async () => {
                  if ((event.requirementGroups || []).length > 0) {
                    toast.message('October requirements are already listed above');
                    return;
                  }
                  await eventDutyAPI.applyOctoberTemplate(event.id);
                  toast.success('October 2026 requirements added');
                  void reload();
                }}>Load October 2026 vehicle requirements</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicles">
            <MasterVehicles
              assignments={filteredAssignments}
              vehicles={filteredVehicles}
              eventDates={eventDates}
              eventId={event.id}
              onCreated={reload}
              onViewFile={viewFile}
            />
          </TabsContent>

          <TabsContent value="drivers">
            <MasterDrivers assignments={filteredAssignments} drivers={drivers} eventDrivers={eventDrivers} eventId={event.id} onCreated={reload} onViewFile={viewFile} />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-3">
            <div className="flex gap-2">
              <Button onClick={() => { setEditAssignment(null); setAssignOpen(true); }}>Add vehicle to event</Button>
              <Button variant="outline" onClick={() => setBulkOpen(true)}>Bulk requirement</Button>
            </div>
            <AssignmentTable
              assignments={filteredAssignments}
              duties={duties}
              eventDates={eventDates}
              onEdit={(asg) => { setEditAssignment(asg); setAssignOpen(true); }}
              onReplace={setReplaceFor}
              onSendLink={async (asg) => {
                const res = await eventDutyAPI.createDriverLink(asg.id);
                setDriverLink({ assignmentId: asg.id, url: res.url });
                toast.success('Driver registration link created');
              }}
              onReload={reload}
              onViewDocuments={viewAssignmentFiles}
            />
          </TabsContent>

          <TabsContent value="duties">
            <DutyAdminTable duties={filteredDuties} onReload={reload} onViewFile={viewFile} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsPanel documents={filteredDocuments} onReload={reload} onViewFile={viewFile} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <VehicleReportPanel event={event} duties={reportDuties} vehicle={filterVehicle} from={from} to={to} />
            <EventSummaryPanel summary={summary} vehicle={filterVehicle} duties={reportDuties} />
            <Button asChild><Link to={`/admin/events/${event.id}/daily-report`}>Open daily report</Link></Button>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <EventTrackingPanel eventId={event.id} defaultDate={from || todayIsoDate()} />
          </TabsContent>

          <TabsContent value="share" className="space-y-4">
            <SharePanel
              event={event}
              shareUrl={shareUrl}
              tokens={tokens}
              onCreate={async () => {
                const res = await eventDutyAPI.createShare(event.id);
                setShareUrl(res.url);
                toast.success('Share link created');
                void reload();
              }}
              onRevoke={async (tokenId) => {
                await eventDutyAPI.revokeToken(tokenId, 'event_share', event.id);
                toast.success('Share link revoked');
                void reload();
              }}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Audit trail</CardTitle></CardHeader>
              <CardContent className="max-h-[480px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Record</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">{formatServerDateTime(row.createdAt)}</TableCell>
                        <TableCell>{row.actorType} {row.actorId || ''}</TableCell>
                        <TableCell>{row.action}</TableCell>
                        <TableCell>{row.entityType} #{row.entityId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs> : <p className="text-sm text-muted-foreground">Loading duties and drivers…</p>}
      </div>

      <EventFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        event={event}
        onSubmit={async (payload: EventSavePayload) => {
          await eventDutyAPI.updateEvent({ ...payload, id: event.id });
          toast.success('Event updated');
          void reload();
        }}
      />

      <AssignmentDialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setEditAssignment(null);
        }}
        event={event}
        eventDates={eventDates}
        vehicles={vehicles}
        drivers={drivers}
        duties={duties}
        initial={editAssignment}
        preferredVehicleNumber={filterVehicle !== 'all' ? filterVehicle : ''}
        onSaved={(saved) => {
          if (filterVehicle !== 'all' && (saved?.vehicleNumber || '') !== filterVehicle) {
            setFilterVehicle('all');
          }
          void reload();
        }}
      />
      <BulkRequirementDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        event={event}
        eventDates={eventDates}
        onSaved={reload}
      />
      {replaceFor && (
        <ReplaceDialog
          assignment={replaceFor}
          eventDates={eventDates}
          vehicles={vehicles}
          drivers={drivers}
          onClose={() => setReplaceFor(null)}
          onSaved={reload}
        />
      )}
      <EventMediaViewer
        items={mediaPreview}
        folderName={mediaFolder}
        onClose={() => {
          setMediaPreview(null);
          setMediaFolder('');
        }}
      />
      {driverLink && (
        <LinkDialog
          title="Driver registration"
          url={driverLink.url}
          whatsappText={driverRegistrationMessage({
            eventName: event.name,
            vehicleType: driverLinkAssignment?.vehicleTypeLabel || 'Vehicle',
            vehicleNumber: driverLinkAssignment?.vehicleNumber,
            pickupLocation: driverLinkAssignment?.reportingLocation || event.reportingLocation,
            reportingTime: driverLinkAssignment?.reportingTime || event.defaultReportingTime,
            dates: driverLinkAssignment?.dates,
            url: driverLink.url,
          })}
          onClose={() => setDriverLink(null)}
        />
      )}
    </AdminLayout>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function fileHint(onFile: boolean, optional = false): string | undefined {
  if (onFile) return 'Already on file — leave blank to keep';
  if (optional) return 'Optional';
  return undefined;
}

function ViewDocButton({
  docs, type, title, onViewFile,
}: {
  docs?: Record<string, EventDocumentInfo>;
  type: string;
  title: string;
  onViewFile: (url: string, title: string) => void;
}) {
  const id = docs?.[type]?.id;
  if (!id) return null;
  return (
    <Button size="sm" variant="outline" onClick={() => { void onViewFile(eventDutyAPI.mediaUrl(id), title); }}>
      View {title}
    </Button>
  );
}

function DocSlot({
  id, label, type, docs, value, onChange, onReload, optional, kind, ocr, onExtracted,
}: {
  id: string;
  label: string;
  type: string;
  docs?: Record<string, EventDocumentInfo>;
  value: File | null;
  onChange: (file: File | null) => void;
  onReload: () => void;
  optional?: boolean;
  kind?: 'rc' | 'insurance' | 'dl' | 'aadhaar';
  ocr?: (file: File) => Promise<{ text?: string | null }>;
  onExtracted?: (fields: DocumentOcrFields) => void;
}) {
  const existingId = docs?.[type]?.id ?? null;
  return (
    <CroppableFileField
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      existingId={existingId}
      hint={fileHint(Boolean(existingId), optional)}
      kind={kind}
      ocr={ocr}
      onExtracted={onExtracted}
      onRemoveExisting={async () => {
        if (!existingId) return;
        if (!confirmAction('Remove this file? You can upload a new one after.')) return;
        await eventDutyAPI.deleteDocument(existingId);
        toast.success('File removed');
        onReload();
      }}
    />
  );
}

function MasterVehicles({
  assignments, vehicles, eventDates, eventId, onCreated, onViewFile,
}: { assignments: EventAssignment[]; vehicles: EventFleetOption[]; eventDates: string[]; eventId: number; onCreated: () => void; onViewFile: (url: string, title: string) => void }) {
  const [reg, setReg] = useState('');
  const [type, setType] = useState('innova_crysta');
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('Innova Crysta');
  const [capacity, setCapacity] = useState('7');
  const [owner, setOwner] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [rc, setRc] = useState<File | null>(null);
  const [rcBack, setRcBack] = useState<File | null>(null);
  const [insurance, setInsurance] = useState<File | null>(null);
  const [insuranceBack, setInsuranceBack] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EventFleetOption | null>(null);
  const [datesFor, setDatesFor] = useState<EventAssignment | null>(null);
  const visibleAssignments = assignments.filter((a) => a.status === 'active');
  const liveVehicleDocs = editing
    ? (vehicles.find((item) => item.id === editing.id)?.documents || editing.documents)
    : undefined;
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader><CardTitle>Event vehicles</CardTitle></CardHeader>
        <CardContent>
          {vehicles.map((v) => (
            <div key={v.id} className="border-b py-2 text-sm">
              <div className="font-medium">{v.vehicleNumber} · {v.model || v.name}</div>
              <div className="text-muted-foreground">
                RC {v.documents?.rc ? '✓' : '—'}{v.documents?.rc_back ? ' +back' : ''} · Insurance {v.documents?.insurance ? '✓' : '—'}{v.documents?.insurance_back ? ' +back' : ''}
                {v.ownerName ? ` · ${v.ownerName}` : ''}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <ViewDocButton docs={v.documents} type="rc" title={`${v.vehicleNumber} RC front`} onViewFile={onViewFile} />
                <ViewDocButton docs={v.documents} type="rc_back" title={`${v.vehicleNumber} RC back`} onViewFile={onViewFile} />
                <ViewDocButton docs={v.documents} type="insurance" title={`${v.vehicleNumber} Insurance front`} onViewFile={onViewFile} />
                <ViewDocButton docs={v.documents} type="insurance_back" title={`${v.vehicleNumber} Insurance back`} onViewFile={onViewFile} />
                <Button size="sm" variant="outline" onClick={() => {
                  setEditing(v);
                  setReg(v.vehicleNumber);
                  setType(v.vehicleType || 'other');
                  setMake(v.make || '');
                  setModel(v.model || '');
                  setCapacity(v.capacity != null ? String(v.capacity) : '');
                  setOwner(v.ownerName || '');
                  setOwnerMobile(v.ownerMobile || '');
                  setRc(null);
                  setRcBack(null);
                  setInsurance(null);
                  setInsuranceBack(null);
                }}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirmAction('Remove this vehicle from the event? Unstarted duties will be cancelled.')) return;
                  try {
                    await eventDutyAPI.deleteVehicle(v.id, eventId);
                    toast.success('Vehicle removed from this event');
                    if (editing?.id === v.id) setEditing(null);
                    onCreated();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not remove vehicle');
                  }
                }}>Delete</Button>
              </div>
            </div>
          ))}
          {vehicles.length === 0 && (
            <p className="text-sm text-muted-foreground">No event vehicles yet. Add one here — it stays on this event only.</p>
          )}
          {visibleAssignments.length > 0 && (
            <div className="pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                {visibleAssignments.length} assignment{visibleAssignments.length === 1 ? '' : 's'} in this filter.
              </p>
              {visibleAssignments.map((a) => (
                <div key={a.id} className="rounded-md border p-2 text-sm space-y-1">
                  <div className="font-medium">{a.vehicleNumber || 'Vehicle not assigned'} · {a.vehicleTypeLabel}</div>
                  <div className="text-muted-foreground">{a.driverName || 'Driver not assigned'}</div>
                  <div className="text-xs">{formatDutyDateRange(a.dates)}</div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => setDatesFor(a)}>Add dates</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirmAction('Delete this assignment? Unstarted duties will be removed.')) return;
                      try {
                        await eventDutyAPI.cancelAssignment(a.id);
                        toast.success('Assignment deleted');
                        onCreated();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Could not delete assignment');
                      }
                    }}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {datesFor && (
            <AddDatesDialog
              assignment={datesFor}
              eventDates={eventDates}
              onClose={() => setDatesFor(null)}
              onSaved={() => { setDatesFor(null); onCreated(); }}
            />
          )}
        </CardContent>
      </Card>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader><CardTitle>{editing ? 'Edit event vehicle' : 'Add event vehicle'}</CardTitle></CardHeader>
        <CardContent className="min-w-0 space-y-2 overflow-hidden">
          <Input placeholder="Registration number" value={reg} onChange={(e) => setReg(e.target.value.toUpperCase())} />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENT_VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{eventVehicleTypeLabel(t)}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} />
            <Input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <Input placeholder="Seating capacity" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <Input placeholder="Vehicle owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
          <Input placeholder="Owner mobile" value={ownerMobile} onChange={(e) => setOwnerMobile(e.target.value)} />
          <DocSlot
            id="event-vehicle-rc"
            label="RC front (image or PDF)"
            type="rc"
            docs={liveVehicleDocs}
            value={rc}
            onChange={setRc}
            onReload={onCreated}
            kind="rc"
            ocr={(file) => eventDutyAPI.ocrDocument(file)}
            onExtracted={(fields) => {
              setReg((v) => keepFilled(v, fields.registrationNumber));
              setOwner((v) => keepFilled(v, fields.ownerName));
              setMake((v) => keepFilled(v, fields.make));
              setModel((v) => keepFilled(v, fields.model));
              setCapacity((v) => keepFilled(v, fields.capacity));
              if (fields.vehicleType) setType(fields.vehicleType);
              if (fields.registrationNumber || fields.model || fields.ownerName) {
                toast.success('Vehicle details filled from the RC photo');
              }
            }}
          />
          <DocSlot
            id="event-vehicle-rc-back"
            label="RC back"
            type="rc_back"
            docs={liveVehicleDocs}
            value={rcBack}
            onChange={setRcBack}
            onReload={onCreated}
            optional
          />
          <DocSlot
            id="event-vehicle-insurance"
            label="Insurance front (image or PDF)"
            type="insurance"
            docs={liveVehicleDocs}
            value={insurance}
            onChange={setInsurance}
            onReload={onCreated}
            kind="insurance"
            ocr={(file) => eventDutyAPI.ocrDocument(file)}
            onExtracted={(fields) => {
              setReg((v) => keepFilled(v, fields.registrationNumber));
            }}
          />
          <DocSlot
            id="event-vehicle-insurance-back"
            label="Insurance back"
            type="insurance_back"
            docs={liveVehicleDocs}
            value={insuranceBack}
            onChange={setInsuranceBack}
            onReload={onCreated}
            optional
          />
          <Button disabled={saving} onClick={async () => {
            if (!reg.trim()) {
              toast.error('Registration number is required');
              return;
            }
            if (!editing && (!rc || !insurance)) {
              toast.error('Upload both RC and Insurance');
              return;
            }
            const form = new FormData();
            form.append('action', editing ? 'update_vehicle' : 'create_vehicle');
            form.append('eventId', String(eventId));
            if (editing) form.append('id', String(editing.id));
            form.append('registrationNumber', reg);
            form.append('vehicleType', type);
            form.append('make', make);
            form.append('model', model);
            form.append('seatingCapacity', capacity);
            form.append('ownerName', owner);
            form.append('ownerMobile', ownerMobile);
            if (rc) form.append('rc', rc);
            if (rcBack) form.append('rc_back', rcBack);
            if (insurance) form.append('insurance', insurance);
            if (insuranceBack) form.append('insurance_back', insuranceBack);
            setSaving(true);
            try {
              if (editing) await eventDutyAPI.updateVehicle(form);
              else await eventDutyAPI.createVehicle(form);
              toast.success(editing ? 'Vehicle updated' : 'Event vehicle saved. It was not added to the company fleet.');
              setEditing(null);
              setReg('');
              setOwner('');
              setOwnerMobile('');
              setRc(null);
              setRcBack(null);
              setInsurance(null);
              setInsuranceBack(null);
              onCreated();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Could not save vehicle');
            } finally {
              setSaving(false);
            }
          }}>{saving ? 'Saving…' : editing ? 'Update vehicle' : 'Save vehicle'}</Button>
          {editing && (
            <Button variant="outline" onClick={() => {
              setEditing(null);
              setReg('');
              setRc(null);
              setRcBack(null);
              setInsurance(null);
              setInsuranceBack(null);
            }}>Cancel edit</Button>
          )}
          <p className="text-xs text-muted-foreground">
            This vehicle is only for this event. RC and insurance are stored privately in Google Cloud and are not added to the main fleet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MasterDrivers({
  assignments, drivers, eventDrivers, eventId, onCreated, onViewFile,
}: { assignments: EventAssignment[]; drivers: EventDriverOption[]; eventDrivers: EventDriverOption[]; eventId: number; onCreated: () => void; onViewFile: (url: string, title: string) => void }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alt, setAlt] = useState('');
  const [dl, setDl] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [dlFront, setDlFront] = useState<File | null>(null);
  const [dlBack, setDlBack] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editingDriverDocs = assignments.find((a) => a.driverId === editingId)?.driverDocuments
    || eventDrivers.find((d) => d.id === editingId)?.documents
    || drivers.find((d) => d.id === editingId)?.documents;
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader><CardTitle>Assigned drivers</CardTitle></CardHeader>
        <CardContent>
          {assignments.filter((a) => a.driverId).length === 0 && eventDrivers.length === 0 && (
            <p className="text-sm text-muted-foreground">No drivers added yet. Use Add driver on the right.</p>
          )}
          {assignments.filter((a) => a.driverId).map((a) => (
            <div key={a.id} className="border-b py-2 text-sm">
              <div className="font-medium">{a.driverName} · {a.driverMobile}</div>
              <div className="text-muted-foreground">{a.vehicleTypeLabel}</div>
              <div className="text-muted-foreground">
                Photo {a.driverDocuments?.driver_photo ? '✓' : '—'} · DL {a.driverDocuments?.dl_front ? '✓' : '—'}{a.driverDocuments?.dl_back ? ' +back' : ''} · Aadhaar {a.driverDocuments?.aadhaar ? '✓' : '—'}{a.driverDocuments?.aadhaar_back ? ' +back' : ''}
                {a.aadhaarMasked ? ` · ${a.aadhaarMasked}` : a.driverDocuments?.aadhaar ? ' · Aadhaar photo uploaded' : ' · Aadhaar number not entered'}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <ViewDocButton docs={a.driverDocuments} type="driver_photo" title={`${a.driverName || 'Driver'} photo`} onViewFile={onViewFile} />
                <ViewDocButton docs={a.driverDocuments} type="dl_front" title="Driving licence front" onViewFile={onViewFile} />
                <ViewDocButton docs={a.driverDocuments} type="dl_back" title="Driving licence back" onViewFile={onViewFile} />
                <ViewDocButton docs={a.driverDocuments} type="aadhaar" title="Aadhaar front" onViewFile={onViewFile} />
                <ViewDocButton docs={a.driverDocuments} type="aadhaar_back" title="Aadhaar back" onViewFile={onViewFile} />
                <Button size="sm" variant="outline" onClick={() => {
                  setName(a.driverName || '');
                  setMobile(a.driverMobile || '');
                  setDl(a.licenseNo || '');
                  setAadhaar('');
                  setPhoto(null);
                  setDlFront(null);
                  setDlBack(null);
                  setAadhaarFile(null);
                  setAadhaarBack(null);
                  setEditingId(a.driverId);
                }}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!a.driverId || !confirmAction('Remove this driver from the event assignments?')) return;
                  try {
                    await eventDutyAPI.unassignDriver(eventId, a.driverId);
                    toast.success('Driver removed from this event');
                    onCreated();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not remove driver');
                  }
                }}>Remove</Button>
              </div>
            </div>
          ))}
          {eventDrivers.filter((d) => !assignments.some((a) => a.driverId === d.id)).map((d) => (
            <div key={`event-driver-${d.id}`} className="border-b py-2 text-sm">
              <div className="font-medium">{d.name} · {d.phone}</div>
              <div className="text-muted-foreground">Saved for this event · not assigned to a vehicle yet</div>
              <div className="text-muted-foreground">
                Photo {d.documents?.driver_photo ? '✓' : '—'} · DL {d.documents?.dl_front ? '✓' : '—'} · Aadhaar {d.documents?.aadhaar ? '✓' : '—'}
                {d.aadhaarMasked ? ` · ${d.aadhaarMasked}` : ''}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <ViewDocButton docs={d.documents} type="driver_photo" title={`${d.name || 'Driver'} photo`} onViewFile={onViewFile} />
                <ViewDocButton docs={d.documents} type="dl_front" title="Driving licence front" onViewFile={onViewFile} />
                <ViewDocButton docs={d.documents} type="dl_back" title="Driving licence back" onViewFile={onViewFile} />
                <ViewDocButton docs={d.documents} type="aadhaar" title="Aadhaar front" onViewFile={onViewFile} />
                <ViewDocButton docs={d.documents} type="aadhaar_back" title="Aadhaar back" onViewFile={onViewFile} />
                <Button size="sm" variant="outline" onClick={() => {
                  setName(d.name || '');
                  setMobile(d.phone || '');
                  setDl(d.licenseNo || '');
                  setAadhaar('');
                  setPhoto(null);
                  setDlFront(null);
                  setDlBack(null);
                  setAadhaarFile(null);
                  setAadhaarBack(null);
                  setEditingId(d.id);
                }}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirmAction('Remove this driver from the event?')) return;
                  try {
                    await eventDutyAPI.removeEventDriver(eventId, d.id);
                    toast.success('Driver removed from this event');
                    onCreated();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not remove driver');
                  }
                }}>Delete</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader><CardTitle>{editingId ? 'Edit driver' : 'Add driver'}</CardTitle></CardHeader>
        <CardContent className="min-w-0 space-y-2 overflow-hidden">
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <Input placeholder="Alternate mobile" value={alt} onChange={(e) => setAlt(e.target.value)} />
          <Input placeholder="Driving licence number" value={dl} onChange={(e) => setDl(e.target.value.toUpperCase())} />
          <Input placeholder="Aadhaar (stored masked)" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} />
          <DocSlot
            id="event-driver-photo"
            label="Driver photo"
            type="driver_photo"
            docs={editingDriverDocs}
            value={photo}
            onChange={setPhoto}
            onReload={onCreated}
          />
          <DocSlot
            id="event-driver-dl"
            label="Driving licence front"
            type="dl_front"
            docs={editingDriverDocs}
            value={dlFront}
            onChange={setDlFront}
            onReload={onCreated}
            kind="dl"
            ocr={(file) => eventDutyAPI.ocrDocument(file)}
            onExtracted={(fields) => {
              setName((v) => keepFilled(v, fields.fullName));
              setDl((v) => keepFilled(v, fields.licenseNumber));
              setMobile((v) => keepFilled(v, fields.mobile));
              if (fields.fullName || fields.licenseNumber) {
                toast.success('Driver details filled from the licence photo');
              }
            }}
          />
          <DocSlot
            id="event-driver-dl-back"
            label="Driving licence back"
            type="dl_back"
            docs={editingDriverDocs}
            value={dlBack}
            onChange={setDlBack}
            onReload={onCreated}
            optional
          />
          <DocSlot
            id="event-driver-aadhaar"
            label="Aadhaar front"
            type="aadhaar"
            docs={editingDriverDocs}
            value={aadhaarFile}
            onChange={setAadhaarFile}
            onReload={onCreated}
            kind="aadhaar"
            ocr={(file) => eventDutyAPI.ocrDocument(file)}
            onExtracted={(fields) => {
              setName((v) => keepFilled(v, fields.fullName));
              setAadhaar((v) => keepFilled(v, fields.aadhaarNumber));
              if (fields.fullName || fields.aadhaarNumber) {
                toast.success('Aadhaar details filled from the photo');
              }
            }}
          />
          <DocSlot
            id="event-driver-aadhaar-back"
            label="Aadhaar back"
            type="aadhaar_back"
            docs={editingDriverDocs}
            value={aadhaarBack}
            onChange={setAadhaarBack}
            onReload={onCreated}
            optional
          />
          <Button disabled={saving} onClick={async () => {
            const form = new FormData();
            form.append('action', editingId ? 'update_driver' : 'create_driver');
            form.append('eventId', String(eventId));
            if (editingId) form.append('id', String(editingId));
            form.append('fullName', name);
            form.append('mobile', mobile);
            form.append('altMobile', alt);
            form.append('licenseNumber', dl);
            form.append('aadhaarNumber', aadhaar);
            if (photo) form.append('driver_photo', photo);
            if (dlFront) form.append('dl_front', dlFront);
            if (dlBack) form.append('dl_back', dlBack);
            if (aadhaarFile) form.append('aadhaar', aadhaarFile);
            if (aadhaarBack) form.append('aadhaar_back', aadhaarBack);
            setSaving(true);
            try {
              if (editingId) await eventDutyAPI.updateDriver(form);
              else await eventDutyAPI.createDriver(form);
              toast.success(editingId ? 'Driver updated' : 'Driver saved');
              setEditingId(null);
              setName(''); setMobile(''); setAlt(''); setDl(''); setAadhaar('');
              setPhoto(null); setDlFront(null); setDlBack(null); setAadhaarFile(null); setAadhaarBack(null);
              onCreated();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Could not save driver');
            } finally {
              setSaving(false);
            }
          }}>{saving ? 'Saving…' : editingId ? 'Update driver' : 'Save driver'}</Button>
          {editingId && (
            <Button variant="outline" onClick={() => {
              setEditingId(null);
              setName(''); setMobile(''); setAlt(''); setDl(''); setAadhaar('');
              setPhoto(null); setDlFront(null); setDlBack(null); setAadhaarFile(null); setAadhaarBack(null);
            }}>Cancel edit</Button>
          )}
          <p className="text-xs text-muted-foreground">
            {drivers.length} drivers in master list. Photo, Aadhaar and DL are stored privately in Google Cloud. Aadhaar numbers stay masked on this screen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function nextDutyReport(assignment: EventAssignment, duties: EventDuty[]) {
  const today = todayIsoDate();
  const rows = duties
    .filter((duty) => duty.assignmentId === assignment.id && duty.status !== 'cancelled' && duty.dutyDate > today)
    .sort((a, b) => a.dutyDate.localeCompare(b.dutyDate));
  const upcoming = rows[0];
  if (upcoming) {
    return {
      date: upcoming.dutyDate,
      time: formatReportingTime(upcoming.reportingTime) || formatReportingTime(assignment.reportingTime) || '—',
      location: (upcoming.reportingLocation || assignment.reportingLocation || '').trim() || '—',
    };
  }
  const date = [...assignment.dates].sort().find((item) => item > today) || '';
  if (!date) {
    return { date: '', time: '—', location: '—' };
  }
  return {
    date,
    time: formatReportingTime(assignment.reportingTime) || '—',
    location: (assignment.reportingLocation || '').trim() || '—',
  };
}

function AssignmentTable({
  assignments, duties, eventDates, onEdit, onReplace, onSendLink, onReload, onViewDocuments,
}: {
  assignments: EventAssignment[];
  duties: EventDuty[];
  eventDates: string[];
  onEdit: (a: EventAssignment) => void;
  onReplace: (a: EventAssignment) => void;
  onSendLink: (a: EventAssignment) => void;
  onReload: () => void;
  onViewDocuments: (a: EventAssignment) => Promise<void>;
}) {
  const [datesFor, setDatesFor] = useState<EventAssignment | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const rows = assignments.filter((a) => a.status === 'active');

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">SL.No</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Next reporting</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Docs</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a, index) => {
            const nextDuty = nextDutyReport(a, duties);
            const shownSerial = a.serialNo ?? index + 1;
            return (
            <TableRow key={a.id}>
              <TableCell className="w-16 px-2">
                <Input
                  key={`${a.id}-${shownSerial}`}
                  className="h-8 w-14 px-1 text-center tabular-nums"
                  inputMode="numeric"
                  aria-label={`Serial number for ${a.vehicleNumber || 'assignment'}`}
                  defaultValue={String(shownSerial)}
                  onBlur={(event) => {
                    const raw = event.target.value.trim();
                    const next = raw === '' ? null : Number(raw);
                    if (next !== null && (!Number.isInteger(next) || next < 1 || next > 9999)) {
                      toast.error('Enter a serial number from 1 to 9999');
                      event.target.value = String(shownSerial);
                      return;
                    }
                    if ((next == null && a.serialNo == null) || next === a.serialNo || (a.serialNo == null && next === index + 1)) return;
                    void eventDutyAPI.setAssignmentSerial(a.id, next).then(() => {
                      onReload();
                    }).catch((err: unknown) => {
                      toast.error(err instanceof Error ? err.message : 'Could not save the serial number');
                      event.target.value = String(shownSerial);
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                />
              </TableCell>
              <TableCell>
                <div className="font-medium">{a.vehicleNumber || 'Not assigned'}</div>
                <div className="text-xs text-muted-foreground">{a.vehicleTypeLabel}{a.passengerCount ? ` · ${a.passengerCount} pax` : ''}</div>
              </TableCell>
              <TableCell>
                <div>{a.driverName || 'Not assigned'}</div>
                <div className="text-xs text-muted-foreground">{a.driverMobile || ''}</div>
              </TableCell>
              <TableCell className="text-sm">
                <div>{nextDuty.time}</div>
                {nextDuty.date ? <div className="text-xs text-muted-foreground">{formatDutyDateShort(nextDuty.date)}</div> : null}
              </TableCell>
              <TableCell className="text-sm">{nextDuty.location}</TableCell>
              <TableCell className="text-xs">
                Photo {a.driverDocuments?.driver_photo ? '✓' : '—'} · DL {a.driverDocuments?.dl_front ? '✓' : '—'}{a.driverDocuments?.dl_back ? ' +back' : ''} · Aadhaar {a.driverDocuments?.aadhaar ? '✓' : '—'}{a.driverDocuments?.aadhaar_back ? ' +back' : ''}
                <div>RC {a.vehicleDocuments?.rc ? '✓' : '—'}{a.vehicleDocuments?.rc_back ? ' +back' : ''} · Insurance {a.vehicleDocuments?.insurance ? '✓' : '—'}{a.vehicleDocuments?.insurance_back ? ' +back' : ''}</div>
              </TableCell>
              <TableCell className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => onSendLink(a)}>Send registration</Button>
                <Button size="sm" variant="outline" onClick={() => setDatesFor(a)}>Add dates</Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(a)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => onReplace(a)}>Replace</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirmAction('Delete this assignment? Unstarted duties will be removed.')) return;
                  try {
                    await eventDutyAPI.cancelAssignment(a.id);
                    toast.success('Assignment deleted');
                    onReload();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not delete assignment');
                  }
                }}>Delete</Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={downloadingId === a.id}
                  onClick={async () => {
                    setDownloadingId(a.id);
                    try {
                      await onViewDocuments(a);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Could not open files');
                    } finally {
                      setDownloadingId(null);
                    }
                  }}
                >
                  <Download className="mr-1 h-3 w-3" />
                  {downloadingId === a.id ? 'Opening…' : 'View files'}
                </Button>
              </TableCell>
            </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-sm text-muted-foreground">
                No assignments in this filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {datesFor && (
        <AddDatesDialog
          assignment={datesFor}
          eventDates={eventDates}
          onClose={() => setDatesFor(null)}
          onSaved={() => { setDatesFor(null); onReload(); }}
        />
      )}
    </div>
  );
}

function AddDatesDialog({
  assignment, eventDates, onClose, onSaved,
}: {
  assignment: EventAssignment;
  eventDates: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dates, setDates] = useState<string[]>(assignment.dates);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Duty dates · {assignment.vehicleNumber || assignment.vehicleTypeLabel}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Select dates on the calendar. New dates create duty slips. Unstarted dates you clear are removed.</p>
        <DateChipPicker dates={eventDates} selected={dates} onChange={setDates} />
        <Button onClick={async () => {
          try {
            await eventDutyAPI.updateAssignment({ id: assignment.id, eventId: assignment.eventId, dates });
            toast.success('Duty dates updated');
            onSaved();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not update dates');
          }
        }}>Save dates</Button>
      </DialogContent>
    </Dialog>
  );
}

type DateReport = { date: string; time: string; location: string; dutyId?: number | null };

function dutyWeekday(iso: string): string {
  const day = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(day.getTime())) return '';
  return day.toLocaleDateString('en-IN', { weekday: 'short' });
}

function clockValue(value: string | null | undefined, fallback: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec((value || '').trim());
  if (!match) {
    const fallbackMatch = /^(\d{1,2}):(\d{2})/.exec(fallback.trim());
    return fallbackMatch ? `${fallbackMatch[1].padStart(2, '0')}:${fallbackMatch[2]}` : '06:00';
  }
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function isoDay(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match ? match[1] : value.trim();
}

function unknownAction(err: unknown): boolean {
  return /unknown action/i.test(err instanceof Error ? err.message : '');
}

function logSchedule(step: string, detail?: unknown) {
  console.log('[duty-schedule]', step, detail ?? '');
}

function clockOrEmpty(value: string | null | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec((value || '').trim());
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
}

function scheduleText(rows: Array<{ date: string; time: string; location: string; dutyId?: number | null }>): string {
  return rows.map((row) => `${isoDay(row.date)}#${row.dutyId ?? '-'} ${row.time || '-'} @ ${row.location || '-'}`).join(' | ');
}

function sameDateKey(dates: string[]): string {
  return dates.map((date) => isoDay(date)).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort().join(',');
}

function dutyForDate(
  duties: EventDuty[],
  assignmentId: number,
  row: Pick<DateReport, 'date' | 'dutyId'>,
  vehicle?: { id?: number | null; number?: string },
): EventDuty | undefined {
  const day = isoDay(row.date);
  const sameDay = duties.filter((item) => (
    isoDay(String(item.dutyDate || '')) === day
    && Number(item.assignmentId) === Number(assignmentId)
  ));
  const own = sameDay.find((item) => item.status !== 'cancelled')
    || sameDay[0]
    || duties.find((item) => row.dutyId != null && Number(item.id) === Number(row.dutyId));
  if (own) return own;
  const number = (vehicle?.number || '').trim();
  const vehicleId = vehicle?.id ?? null;
  if (!number && vehicleId == null) return undefined;
  const sameVehicle = duties.filter((item) => {
    if (isoDay(String(item.dutyDate || '')) !== day) return false;
    const sameNumber = number !== '' && (item.vehicleNumber || '').trim() === number;
    const sameId = vehicleId != null && Number(item.vehicleId) === vehicleId;
    return sameNumber || sameId;
  });
  return sameVehicle.find((item) => item.status !== 'cancelled') || sameVehicle[0];
}

function readDutyRows(rows: DateReport[]): DateReport[] {
  const times = new Map<string, string>();
  const locations = new Map<string, string>();
  document.querySelectorAll<HTMLInputElement>('input[data-duty-time]').forEach((input) => {
    const date = input.dataset.dutyTime;
    if (date && /^\d{2}:\d{2}/.test(input.value)) times.set(date, input.value.slice(0, 5));
  });
  document.querySelectorAll<HTMLInputElement>('input[data-duty-location]').forEach((input) => {
    const date = input.dataset.dutyLocation;
    if (date) locations.set(date, input.value);
  });
  const next = rows.map((row) => ({
    ...row,
    time: times.get(row.date) || row.time,
    location: locations.has(row.date) ? (locations.get(row.date) || '') : row.location,
  }));
  logSchedule('inputs on screen', scheduleText(next));
  return next;
}

async function persistDutySchedules(
  rows: DateReport[],
  duties: EventDuty[],
  assignmentId: number,
  vehicle?: { id?: number | null; number?: string },
): Promise<string | null> {
  const targets = rows.map((row) => {
    const duty = dutyForDate(duties, assignmentId, row, vehicle);
    return {
      id: duty?.id || row.dutyId || 0,
      date: isoDay(row.date),
      time: clockValue(row.time, '06:00'),
      location: row.location.trim(),
      status: duty?.status || '',
    };
  });
  logSchedule('per-duty write', scheduleText(targets.map((item) => ({
    date: item.date,
    time: item.time,
    location: item.location,
    dutyId: item.id || null,
  }))));
  const missing = targets.filter((item) => item.id < 1);
  if (missing.length > 0) {
    return `No duty slip was created for ${missing.map((item) => item.date).join(', ')}`;
  }
  try {
    const results = await Promise.all(targets.map(async (item) => {
      let saved = await eventDutyAPI.setReporting({
        id: item.id,
        reportingTime: item.time,
        reportingLocation: item.location,
        assignmentId,
        date: item.date,
      });
      let duty = saved.duty as (EventDuty & { reporting_time?: string; reporting_location?: string }) | undefined;
      if (duty?.status === 'cancelled' && !duty.openingAt) {
        logSchedule('revive cancelled duty', `${item.date}#${duty.id}`);
        await eventDutyAPI.setDutyStatus(duty.id, 'not_started');
        saved = await eventDutyAPI.setReporting({
          id: duty.id,
          reportingTime: item.time,
          reportingLocation: item.location,
          assignmentId,
          date: item.date,
        });
        duty = saved.duty;
      }
      const gotTime = clockOrEmpty(duty?.reportingTime || duty?.reporting_time);
      const gotLoc = (duty?.reportingLocation || duty?.reporting_location || '').trim();
      const hasTime = Boolean(duty && ('reportingTime' in duty || 'reporting_time' in duty));
      const hasLoc = Boolean(duty && ('reportingLocation' in duty || 'reporting_location' in duty));
      const line = `${item.date}#${duty?.id || item.id} sent ${item.time} @ ${item.location || '-'} got ${gotTime || '-'} @ ${gotLoc || '-'} status=${duty?.status || item.status || '-'}`;
      const rejected = Boolean(duty) && (
        duty?.status === 'cancelled'
        || (hasTime && gotTime !== item.time)
        || (hasLoc && gotLoc !== item.location)
      );
      return { line, rejected };
    }));
    results.forEach((item) => logSchedule('per-duty result', item.line));
    const failed = results.find((item) => item.rejected);
    if (failed) return failed.line;
    logSchedule('per-duty write saved with set_reporting');
    return null;
  } catch (err) {
    logSchedule('set_reporting failed', err instanceof Error ? err.message : err);
    if (!unknownAction(err)) throw err;
  }
  const safe = targets.filter((item) => {
    const duty = duties.find((entry) => Number(entry.id) === item.id);
    return !duty?.endRequestedAt;
  });
  if (safe.length === 0) return 'Server has no per-duty reporting update';
  try {
    await Promise.all(safe.map((item) => eventDutyAPI.overrideTimes({
      id: item.id,
      reportingTime: item.time,
      reportedAt: duties.find((entry) => Number(entry.id) === item.id)?.openingAt ?? null,
      closingAt: duties.find((entry) => Number(entry.id) === item.id)?.closingAt ?? null,
    })));
    logSchedule('per-duty write saved with override_times');
    return null;
  } catch (err) {
    logSchedule('override_times failed', err instanceof Error ? err.message : err);
    if (!unknownAction(err)) throw err;
  }
  logSchedule('server has no per-duty reporting update');
  return 'Server has no per-duty reporting update';
}

function AssignmentDialog({
  open, onOpenChange, event, eventDates, vehicles, drivers, duties, initial, preferredVehicleNumber, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: VthEvent;
  eventDates: string[];
  vehicles: EventFleetOption[];
  drivers: EventDriverOption[];
  duties: EventDuty[];
  initial?: EventAssignment | null;
  preferredVehicleNumber?: string;
  onSaved: (saved?: { vehicleNumber: string }) => void;
}) {
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [type, setType] = useState('innova_crysta');
  const [reports, setReports] = useState<DateReport[]>([]);
  const [pax, setPax] = useState('');
  const [notes, setNotes] = useState('');
  const calendarRef = useRef<HTMLDivElement>(null);
  const reportsRef = useRef<DateReport[]>([]);
  const seededKey = useRef<string | null>(null);
  const editedTimes = useRef<Record<string, string>>({});
  const wasOpen = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) logSchedule('dialog closed, next open reloads from the server');
      wasOpen.current = false;
      seededKey.current = null;
      return;
    }
    wasOpen.current = true;
    const key = String(initial?.id ?? 'new');
    if (seededKey.current === key) {
      logSchedule('form kept, server refresh did not replace the open schedule', { assignmentId: key });
      return;
    }
    if (initial && duties.length === 0) return;
    seededKey.current = key;
    const fallbackTime = clockValue(initial?.reportingTime || event.defaultReportingTime, '06:00');
    const fallbackLoc = initial?.reportingLocation || event.reportingLocation || '';
    const selected = initial?.dates || [];
    const preferred = !initial
      ? vehicles.find((item) => item.vehicleNumber === preferredVehicleNumber)
      : undefined;
    const seedVehicle = {
      id: initial?.vehicleId || preferred?.id || null,
      number: initial?.vehicleNumber || preferred?.vehicleNumber || '',
    };
    const byDate = new Map<string, EventDuty>();
    if (initial) {
      duties
        .filter((duty) => Number(duty.assignmentId) === Number(initial.id) && duty.status !== 'cancelled')
        .forEach((duty) => byDate.set(isoDay(duty.dutyDate), duty));
    }
    const nextReports = selected.map((date) => {
      const day = isoDay(date);
      const duty = byDate.get(day) || dutyForDate(duties, initial?.id ?? 0, { date: day, dutyId: null }, seedVehicle);
      return {
        date: day,
        time: editedTimes.current[day] || clockValue(duty?.reportingTime || fallbackTime, fallbackTime),
        location: (duty?.reportingLocation || fallbackLoc).trim(),
        dutyId: duty?.id ?? null,
      };
    });
    reportsRef.current = nextReports;
    logSchedule('form loaded from duties', scheduleText(nextReports));
    setVehicleId(initial?.vehicleId ? String(initial.vehicleId) : (preferred ? String(preferred.id) : 'none'));
    setDriverId(initial?.driverId ? String(initial.driverId) : 'none');
    setType(initial?.vehicleType || preferred?.vehicleType || 'innova_crysta');
    setReports(nextReports);
    setPax(initial?.passengerCount != null ? String(initial.passengerCount) : '');
    setNotes(initial?.notes || '');
  }, [open, initial, event.defaultReportingTime, event.reportingLocation, duties, vehicles, preferredVehicleNumber]);

  const reportTemplate = (current: DateReport[]) => {
    const sample = current[0];
    return {
      time: clockValue(sample?.time || initial?.reportingTime || event.defaultReportingTime, '06:00'),
      location: sample?.location || initial?.reportingLocation || event.reportingLocation || '',
    };
  };

  const changeDates = (next: string[]) => {
    const normalized = next.map(isoDay);
    setReports((current) => {
      const currentDays = current.map((row) => isoDay(row.date));
      if (currentDays.length === normalized.length && currentDays.every((day, index) => day === normalized[index])) {
        return current;
      }
      const byDate = new Map(current.map((row) => [isoDay(row.date), row]));
      const fallback = reportTemplate(current);
      const next = normalized.map((date) => {
        const prev = byDate.get(date);
        return prev ? { ...prev, date } : { date, ...fallback, dutyId: null };
      });
      reportsRef.current = next;
      return next;
    });
  };

  const removeDate = (date: string) => {
    changeDates(reports.filter((row) => isoDay(row.date) !== isoDay(date)).map((row) => row.date));
  };

  const updateReport = (date: string, patch: Partial<Pick<DateReport, 'time' | 'location'>>) => {
    const day = isoDay(date);
    logSchedule('edited', { date: day, ...patch });
    if (patch.time) editedTimes.current[day] = clockValue(patch.time, '06:00');
    const current = reportsRef.current.length ? reportsRef.current : reports;
    const next = current.map((row) => (isoDay(row.date) === day ? { ...row, ...patch, time: patch.time ? clockValue(patch.time, row.time) : row.time, date: isoDay(row.date) } : row));
    reportsRef.current = next;
    setReports(next);
  };

  const save = async () => {
    const rows = readDutyRows((reportsRef.current.length ? reportsRef.current : reports).map((row) => ({
      ...row,
      date: isoDay(row.date),
      time: editedTimes.current[isoDay(row.date)] || clockValue(row.time, '06:00'),
    })));
    if (rows.length === 0) {
      toast.error('Select at least one date');
      return;
    }
    const dates = rows.map((row) => row.date);
    const first = rows[0];
    const payload = {
      eventId: event.id,
      vehicleType: type,
      vehicleId: vehicleId && vehicleId !== 'none' ? Number(vehicleId) : null,
      driverId: driverId && driverId !== 'none' ? Number(driverId) : null,
      dates,
      reportingTime: first?.time || event.defaultReportingTime,
      reportingLocation: first?.location || event.reportingLocation || '',
      schedules: rows.map((row) => ({
        date: row.date,
        dutyId: row.dutyId ?? null,
        reportingTime: row.time,
        reportingLocation: row.location,
      })),
      passengerCount: pax ? Number(pax) : null,
      notes,
    };
    logSchedule('save payload', scheduleText(payload.schedules));
    const chosenVehicle = vehicles.find((item) => String(item.id) === vehicleId);
    const scheduleVehicle = {
      id: vehicleId !== 'none' ? Number(vehicleId) : (initial?.vehicleId ?? null),
      number: chosenVehicle?.vehicleNumber || initial?.vehicleNumber || '',
    };
    setSaving(true);
    try {
      let assignmentId = initial?.id ?? 0;
      if (initial) {
        const datesUnchanged = sameDateKey(initial.dates || []) === sameDateKey(dates);
        const missingSlips = rows.filter((row) => {
          const duty = dutyForDate(duties, initial.id, row, scheduleVehicle);
          return !duty || duty.status === 'cancelled';
        });
        const updateBody: Record<string, unknown> = { id: initial.id, ...payload };
        if (datesUnchanged && missingSlips.length === 0) {
          delete updateBody.dates;
          logSchedule('dates unchanged, assignment update will not rebuild duties');
        } else if (missingSlips.length > 0) {
          logSchedule('create duty slips', missingSlips.map((row) => isoDay(row.date)).join(', '));
        }
        logSchedule('assignment update start', `id=${initial.id} reporting ${payload.reportingTime} @ ${payload.reportingLocation || '-'}`);
        const updated = await eventDutyAPI.updateAssignment(updateBody);
        logSchedule('assignment update response', `id=${updated.assignment?.id ?? initial.id}`);
      } else {
        const created = await eventDutyAPI.createAssignment(payload);
        assignmentId = created.assignment?.id ?? 0;
        logSchedule('assignment created', `id=${assignmentId}`);
      }
      const afterUpdate = await eventDutyAPI.listDuties(event.id);
      logSchedule('duties after assignment', scheduleText(rows.map((row) => {
        const duty = dutyForDate(afterUpdate.duties || [], assignmentId, row, scheduleVehicle);
        return {
          date: row.date,
          time: clockOrEmpty(duty?.reportingTime),
          location: duty?.reportingLocation || '',
          dutyId: duty?.id ?? null,
        };
      })));
      let dutyRows = afterUpdate.duties || [];
      let problem = await persistDutySchedules(rows, dutyRows, assignmentId, scheduleVehicle);
      if (problem?.startsWith('No duty') && assignmentId) {
        logSchedule('duty slip missing after save, creating selected dates', problem);
        await eventDutyAPI.updateAssignment({ id: assignmentId, ...payload });
        const created = await eventDutyAPI.listDuties(event.id);
        dutyRows = created.duties || [];
        logSchedule('duties after create', scheduleText(rows.map((row) => {
          const duty = dutyForDate(dutyRows, assignmentId, row, scheduleVehicle);
          return {
            date: row.date,
            time: clockOrEmpty(duty?.reportingTime),
            location: duty?.reportingLocation || '',
            dutyId: duty?.id ?? null,
          };
        })));
        problem = await persistDutySchedules(rows, dutyRows, assignmentId, scheduleVehicle);
      }
      if (problem) {
        logSchedule('per-duty write rejected', problem);
        toast.error(`Reporting details did not save. ${problem}`);
        return;
      }
      const fresh = await eventDutyAPI.listDuties(event.id);
      const compared = rows.map((row) => {
        const duty = dutyForDate(fresh.duties || [], assignmentId, row, scheduleVehicle);
        return {
          date: row.date,
          sentTime: row.time,
          sentLocation: row.location,
          serverTime: duty && duty.status !== 'cancelled' ? (duty.reportingTime || '') : '',
          serverLocation: duty && duty.status !== 'cancelled' ? (duty.reportingLocation || '') : '',
          dutyId: duty && duty.status !== 'cancelled' ? duty.id : null,
          status: duty?.status || '',
        };
      });
      logSchedule('server read back', scheduleText(compared.map((row) => ({
        date: row.date,
        time: clockOrEmpty(row.serverTime),
        location: row.serverLocation,
        dutyId: row.dutyId,
      }))));
      const missed = compared.filter((row) => (
        !row.dutyId
        || clockOrEmpty(row.serverTime) !== clockOrEmpty(row.sentTime)
        || row.serverLocation.trim() !== row.sentLocation.trim()
      ));
      if (missed.length > 0) {
        const sample = missed[0];
        logSchedule('reverted on server', missed.map((row) => (
          `${row.date}#${row.dutyId ?? '-'} sent ${row.sentTime} @ ${row.sentLocation || '-'} server ${row.serverTime || '-'} @ ${row.serverLocation || '-'} status=${row.status || '-'}`
        )).join(' | '));
        toast.error(
          `Reporting details for ${formatDutyDateShort(sample.date)} did not save. Sent ${sample.sentTime || 'no time'} / ${sample.sentLocation || 'no location'}, server has ${sample.serverTime || 'no time'} / ${sample.serverLocation || 'no location'}.`,
        );
        return;
      }
      toast.success(initial ? 'Assignment updated' : 'Assignment saved. Duty slips created for selected dates.');
      rows.forEach((row) => {
        delete editedTimes.current[isoDay(row.date)];
      });
      const savedVehicle = vehicleId !== 'none'
        ? (vehicles.find((item) => String(item.id) === vehicleId)?.vehicleNumber || initial?.vehicleNumber || '')
        : '';
      onOpenChange(false);
      onSaved({ vehicleNumber: savedVehicle });
    } catch (err) {
      logSchedule('save failed', err instanceof Error ? err.message : err);
      toast.error(err instanceof Error ? err.message : 'Could not save assignment');
    } finally {
      setSaving(false);
    }
  };

  const selectedDates = reports.map((row) => row.date);
  const allowedDates = new Set(eventDates);
  const fromDate = eventDates[0] ? new Date(`${eventDates[0]}T00:00:00`) : undefined;
  const toDate = eventDates.length ? new Date(`${eventDates[eventDates.length - 1]}T00:00:00`) : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        const active = document.activeElement;
        if (!next && active instanceof HTMLInputElement && active.type === 'time') return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-h-[94vh] w-[calc(100%-1rem)] max-w-[1040px] overflow-y-auto border-0 bg-[#eef3f8] p-3 sm:p-5"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('input[type="time"], [data-radix-select-content], [data-radix-popper-content-wrapper]')) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('input[type="time"], [data-radix-select-content], [data-radix-popper-content-wrapper]')) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          const from = event.detail.originalEvent.target;
          if (from instanceof Element && from.closest('input[type="time"]')) {
            event.preventDefault();
            return;
          }
          const target = event.target as HTMLElement | null;
          if (target?.closest('[data-radix-select-content], [data-radix-popper-content-wrapper]')) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="pr-8 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#2f6bff]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg text-[#2457d6] sm:text-xl">Vehicle Duty Schedule</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">Assign vehicle, driver and duty details</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"><Car className="h-4 w-4 text-slate-500" /> Vehicle</div>
              {vehicles.length === 0 && (
                <p className="mb-1 text-xs text-muted-foreground">Add an event vehicle in the Vehicles tab first.</p>
              )}
              <Select value={vehicleId} onValueChange={(value) => {
                setVehicleId(value);
                const chosen = vehicles.find((item) => String(item.id) === value);
                if (chosen?.vehicleType) setType(chosen.vehicleType);
              }}>
                <SelectTrigger><SelectValue placeholder="Assign later" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Assign later</SelectItem>
                  {vehicles.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.vehicleNumber} · {item.model}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {vehicleId === 'none' && (
              <div>
                <Label>Vehicle type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_VEHICLE_TYPES.map((item) => <SelectItem key={item} value={item}>{eventVehicleTypeLabel(item)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"><UserRound className="h-4 w-4 text-slate-500" /> Driver</div>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger><SelectValue placeholder="Assign later" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Assign later</SelectItem>
                  {drivers.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} · {item.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div ref={calendarRef}>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"><CalendarDays className="h-4 w-4 text-slate-500" /> Duty date</div>
              <Calendar
                mode="multiple"
                selected={selectedDates.map((date) => new Date(`${date}T00:00:00`))}
                onSelect={(days) => {
                  const next = (days || []).map(toLocalIsoDate).filter((iso) => allowedDates.has(iso)).sort();
                  changeDates(next);
                }}
                disabled={(day) => !allowedDates.has(toLocalIsoDate(day))}
                fromDate={fromDate}
                toDate={toDate}
                defaultMonth={fromDate}
                className="mx-auto p-0"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">Selected dates ({reports.length})</span>
                <div className="flex items-center gap-3">
                  <button type="button" className="text-sm font-medium text-[#2f6bff]" onClick={() => changeDates([...eventDates])}>Select all</button>
                  <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-rose-500" onClick={() => changeDates([])}>
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {reports.map((row) => (
                  <span key={row.date} className="inline-flex items-center gap-1 rounded-full bg-[#2f6bff] py-1 pl-3 pr-1 text-xs font-semibold text-white">
                    {formatDutyDateShort(row.date)}
                    <button type="button" className="rounded-full p-0.5 hover:bg-white/20" aria-label={`Remove ${formatDutyDate(row.date)}`} onClick={() => removeDate(row.date)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Clock className="h-4 w-4 text-[#2f6bff]" /> Reporting time for each date
              </div>
              {reports.length === 0 ? (
                <p className="text-sm text-slate-500">Select dates to set a reporting time and pickup.</p>
              ) : (
                <div className="max-h-[22rem] overflow-y-auto overscroll-contain" onWheel={(event) => event.stopPropagation()}>
                  <div className="hidden grid-cols-[7.5rem_9.5rem_minmax(0,1fr)_2rem] gap-2 px-1 pb-1 text-xs font-medium text-slate-400 lg:grid">
                    <span>Date</span>
                    <span>Reporting Time</span>
                    <span>Location</span>
                  </div>
                  {reports.map((row) => (
                    <div key={row.date} className="grid grid-cols-[4.5rem_minmax(0,0.95fr)_minmax(0,1.15fr)] items-center gap-2 border-b border-slate-100 py-2 last:border-b-0 lg:grid-cols-[7.5rem_9.5rem_minmax(0,1fr)_2rem]">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-tight text-slate-800">
                          {formatDutyDateShort(row.date)}
                          <span className="ml-1 font-normal text-slate-400 lg:hidden">{dutyWeekday(row.date)}</span>
                        </div>
                        <div className="hidden text-xs text-slate-400 lg:block">{dutyWeekday(row.date)}</div>
                      </div>
                      <input
                        type="time"
                        step={60}
                        key={row.date}
                        data-duty-time={row.date}
                        aria-label={`Reporting time ${formatDutyDate(row.date)}`}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        defaultValue={editedTimes.current[row.date] || row.time}
                        onInput={(event) => {
                          const value = event.currentTarget.value.slice(0, 5);
                          if (/^\d{2}:\d{2}$/.test(value)) updateReport(row.date, { time: value });
                        }}
                      />
                      <Input
                        className="h-9"
                        aria-label={`Pickup ${formatDutyDate(row.date)}`}
                        placeholder="Location"
                        data-duty-location={row.date}
                        value={row.location}
                        onChange={(e) => updateReport(row.date, { location: e.target.value })}
                      />
                      <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 lg:inline-flex" aria-label={`Remove ${formatDutyDate(row.date)}`} onClick={() => removeDate(row.date)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#2f6bff] lg:hidden"
                onClick={() => calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                + Add more dates (if needed)
              </button>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"><Users className="h-4 w-4 text-slate-500" /> Passenger count</div>
              <Input placeholder="Enter passenger count" value={pax} onChange={(e) => setPax(e.target.value)} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"><StickyNote className="h-4 w-4 text-slate-500" /> Notes</div>
              <Textarea placeholder="Enter any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="h-11 w-full rounded-xl bg-[#2f6bff] hover:bg-[#2457d6]" disabled={saving} onClick={() => { void save(); }}>
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkRequirementDialog({
  open, onOpenChange, event, eventDates, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; event: VthEvent; eventDates: string[]; onSaved: () => void }) {
  const [type, setType] = useState('innova_crysta');
  const [qty, setQty] = useState('8');
  const [pax, setPax] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Bulk vehicle requirement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Example: 8 × Innova Crysta on selected dates. Slots are created without registration numbers.</p>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{eventVehicleTypeLabel(t)}</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
            <Input placeholder="Passenger count" value={pax} onChange={(e) => setPax(e.target.value)} />
          </div>
          <DateChipPicker dates={eventDates} selected={dates} onChange={setDates} />
          <Button className="w-full" onClick={async () => {
            await eventDutyAPI.expandRequirement({
              eventId: event.id,
              vehicleType: type,
              quantity: Number(qty),
              passengerCount: pax ? Number(pax) : null,
              dates,
              reportingTime: event.defaultReportingTime,
              reportingLocation: event.reportingLocation,
            });
            toast.success(`${qty} assignments created`);
            onOpenChange(false);
            onSaved();
          }}>Create slots + duty slips</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceDialog({
  assignment, eventDates, vehicles, drivers, onClose, onSaved,
}: {
  assignment: EventAssignment;
  eventDates: string[];
  vehicles: EventFleetOption[];
  drivers: EventDriverOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fromDate, setFromDate] = useState(assignment.dates[0] || '');
  const [vehicleId, setVehicleId] = useState(assignment.vehicleId ? String(assignment.vehicleId) : '');
  const [driverId, setDriverId] = useState(assignment.driverId ? String(assignment.driverId) : '');
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Replace vehicle / driver</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Historical completed duties stay on the original vehicle and driver.</p>
        <Label>Change from date</Label>
        <Select value={fromDate} onValueChange={setFromDate}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{eventDates.map((d) => <SelectItem key={d} value={d}>{formatDutyDate(d)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={vehicleId} onValueChange={setVehicleId}>
          <SelectTrigger><SelectValue placeholder="Vehicle" /></SelectTrigger>
          <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.vehicleNumber}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={driverId} onValueChange={setDriverId}>
          <SelectTrigger><SelectValue placeholder="Driver" /></SelectTrigger>
          <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={async () => {
          try {
            await eventDutyAPI.replaceAssignment({
              id: assignment.id,
              fromDate,
              vehicleId: vehicleId ? Number(vehicleId) : null,
              driverId: driverId ? Number(driverId) : null,
              vehicleType: assignment.vehicleType,
            });
            toast.success('Replacement created. Old duties were not rewritten.');
            onClose();
            onSaved();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Replace failed');
          }
        }}>Save replacement</Button>
      </DialogContent>
    </Dialog>
  );
}

function DutyAdminTable({ duties, onReload, onViewFile }: { duties: EventDuty[]; onReload: () => void; onViewFile: (url: string, title: string) => void }) {
  const [status, setStatus] = useState('all');
  const [kmFor, setKmFor] = useState<EventDuty | null>(null);
  const [openKm, setOpenKm] = useState('');
  const [closeKm, setCloseKm] = useState('');
  const [timeFor, setTimeFor] = useState<EventDuty | null>(null);
  const [reportingTime, setReportingTime] = useState('');
  const [reportedAt, setReportedAt] = useState('');
  const [closingAt, setClosingAt] = useState('');
  const rows = duties.filter((d) => status === 'all' || d.status === status);
  return (
    <div className="space-y-3">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {EVENT_DUTY_STATUSES.map((s) => <SelectItem key={s} value={s}>{dutyStatusLabel(s)}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Slip</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>KM</TableHead>
            <TableHead>Reporting time</TableHead>
            <TableHead>Reported</TableHead>
            <TableHead>Closing Time</TableHead>
            <TableHead>Odometer uploaded</TableHead>
            <TableHead>Total Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{formatDutyDate(d.dutyDate)}</TableCell>
              <TableCell className="text-xs">{d.dutySlipNo}</TableCell>
              <TableCell>{d.vehicleNumber || d.vehicleTypeLabel}</TableCell>
              <TableCell>{d.driverName || '—'}</TableCell>
              <TableCell>{d.openingKm ?? '—'} → {d.closingKm ?? '—'} ({d.totalKm ?? '—'})</TableCell>
              <TableCell>{formatReportingTime(d.reportingTime) || '—'}</TableCell>
              <TableCell>
                <DutyStamp label="Reported" at={d.openingAt} gps={d.openingGps} />
              </TableCell>
              <TableCell>{formatServerDateTime(dutyClosingTime(d.closingAt, d.endRequestedAt))}</TableCell>
              <TableCell>
                <DutyStamp label="Uploaded" at={d.closingAt} gps={d.closingGps} />
              </TableCell>
              <TableCell>
                <DutyDuration start={reportDutyStart(d)} end={billableDutyEnd(d.closingAt, d.endRequestedAt)} pausedSeconds={d.pausedSeconds} />
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{dutyStatusLabel(d.status)}</Badge>
                {d.status === 'in_progress' && d.endRequestedAt ? (
                  <div className="mt-1 text-[11px] font-medium text-amber-700">
                    {d.endRequestSeenAt ? 'Driver saw the end request' : 'Asked to end'}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="flex flex-wrap gap-1">
                <AskDriverEndButton
                  appearance="admin"
                  dutyId={d.id}
                  status={d.status}
                  endRequestedAt={d.endRequestedAt}
                  onDone={onReload}
                />
                <ContinueDutyButton
                  appearance="admin"
                  dutyId={d.id}
                  status={d.status}
                  openingAt={d.openingAt}
                  closingAt={d.closingAt}
                  onDone={onReload}
                />
                {d.openingPhotoId ? (
                  <Button size="sm" variant="outline" onClick={() => { void onViewFile(eventDutyAPI.mediaUrl(d.openingPhotoId!), 'Opening odometer'); }}>Opening photo</Button>
                ) : null}
                {d.closingPhotoId ? (
                  <Button size="sm" variant="outline" onClick={() => { void onViewFile(eventDutyAPI.mediaUrl(d.closingPhotoId!), 'Closing odometer'); }}>Closing photo</Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => { void onViewFile(eventDutyAPI.dutySlipUrl(d.id), d.dutySlipNo || 'Duty slip'); }}>PDF</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setKmFor(d);
                  setOpenKm(d.openingKm != null ? String(d.openingKm) : '');
                  setCloseKm(d.closingKm != null ? String(d.closingKm) : '');
                }}>Edit KM</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setTimeFor(d);
                  const match = /^(\d{1,2}):(\d{2})/.exec((d.reportingTime || '').trim());
                  setReportingTime(match ? `${match[1].padStart(2, '0')}:${match[2]}` : '');
                  setReportedAt(toDutyTimeInput(d.openingAt));
                  setClosingAt(toDutyTimeInput(dutyClosingTime(d.closingAt, d.endRequestedAt)));
                }}>Edit time</Button>
                {(d.openingKm != null || d.openingPhotoId || d.needsOpeningReupload) && (
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirmAction('Clear the opening reading so the driver can upload a new odometer photo?')) return;
                    try {
                      await eventDutyAPI.resetDutyReading(d.id, 'opening');
                      toast.success('Opening reading cleared. Ask the driver to re-upload.');
                      onReload();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Could not reset opening');
                    }
                  }}>Ask re-upload opening</Button>
                )}
                {(d.closingKm != null || d.closingPhotoId || d.needsClosingReupload) && (
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirmAction('Clear the closing reading so the driver can upload a new odometer photo?')) return;
                    try {
                      await eventDutyAPI.resetDutyReading(d.id, 'closing');
                      toast.success('Closing reading cleared. Ask the driver to re-upload.');
                      onReload();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Could not reset closing');
                    }
                  }}>Ask re-upload closing</Button>
                )}
                {d.status !== 'cancelled' && (
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirmAction('Cancel this duty slip?')) return;
                    try {
                      await eventDutyAPI.setDutyStatus(d.id, 'cancelled');
                      toast.success('Duty cancelled');
                      onReload();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Could not cancel duty');
                    }
                  }}>Cancel</Button>
                )}
                {(d.status === 'not_started' || d.status === 'scheduled' || d.status === 'cancelled') && (
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirmAction('Permanently delete this duty slip?')) return;
                    try {
                      await eventDutyAPI.deleteDuty(d.id);
                      toast.success('Duty deleted');
                      onReload();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Could not delete duty');
                    }
                  }}>Delete</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="text-sm text-muted-foreground">No duties in this filter.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
      {kmFor && (
        <Dialog open onOpenChange={(v) => { if (!v) setKmFor(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Admin KM override</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This does not silently overwrite history. An audit record is stored.</p>
            <Input type="number" value={openKm} onChange={(e) => setOpenKm(e.target.value)} placeholder="Opening KM" />
            <Input type="number" value={closeKm} onChange={(e) => setCloseKm(e.target.value)} placeholder="Closing KM" />
            <Button onClick={async () => {
              try {
                await eventDutyAPI.overrideKm({ id: kmFor.id, openingKm: Number(openKm), closingKm: closeKm ? Number(closeKm) : undefined });
                toast.success('Kilometres updated');
                setKmFor(null);
                onReload();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Update failed');
              }
            }}>Save override</Button>
          </DialogContent>
        </Dialog>
      )}
      {timeFor && (
        <Dialog open onOpenChange={(open) => { if (!open) setTimeFor(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit times · {timeFor.vehicleNumber || timeFor.dutySlipNo}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Total time runs from the reporting time to the closing time.</p>
            <div>
              <Label>Reporting time</Label>
              <Input type="time" value={reportingTime} onChange={(e) => setReportingTime(e.target.value)} />
            </div>
            <div>
              <Label>Reported</Label>
              <Input type="datetime-local" step={1} value={reportedAt} onChange={(e) => setReportedAt(e.target.value)} />
            </div>
            <div>
              <Label>Closing time</Label>
              <Input type="datetime-local" step={1} value={closingAt} onChange={(e) => setClosingAt(e.target.value)} />
            </div>
            <Button onClick={async () => {
              const reported = fromDutyTimeInput(reportedAt);
              const closing = fromDutyTimeInput(closingAt);
              if (reportedAt && !reported) {
                toast.error('Enter a valid reported time');
                return;
              }
              if (closingAt && !closing) {
                toast.error('Enter a valid closing time');
                return;
              }
              try {
                await eventDutyAPI.overrideTimes({
                  id: timeFor.id,
                  reportingTime,
                  reportedAt: reported,
                  closingAt: closing,
                });
                toast.success('Times updated');
                setTimeFor(null);
                onReload();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Update failed');
              }
            }}>Save times</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function documentDate(doc: EventDocumentRow): string {
  return doc.dutyDate || (doc.createdAt ? doc.createdAt.slice(0, 10) : '');
}

function vehicleChoices(
  duties: EventDuty[],
  extra: Array<{ vehicleNumber?: string | null }> = [],
): string[] {
  return [...new Set(
    [
      ...duties.map((d) => d.vehicleNumber),
      ...extra.map((d) => d.vehicleNumber),
    ]
      .map((value) => (value || '').trim())
      .filter(Boolean),
  )].sort();
}

function sortAssignments(rows: EventAssignment[]): EventAssignment[] {
  return [...rows].sort((a, b) => {
    const aSet = a.serialNo != null && a.serialNo > 0;
    const bSet = b.serialNo != null && b.serialNo > 0;
    if (aSet && bSet && a.serialNo !== b.serialNo) return (a.serialNo ?? 0) - (b.serialNo ?? 0);
    if (aSet !== bSet) return aSet ? -1 : 1;
    return a.id - b.id;
  });
}

function isBlankAssignment(a: { vehicleNumber?: string | null; driverName?: string | null }): boolean {
  const vehicle = (a.vehicleNumber || '').trim();
  const driver = (a.driverName || '').trim();
  const empty = (value: string) => value === '' || value === '-' || /^not assigned$/i.test(value);
  return empty(vehicle) && empty(driver);
}

function assignmentMatchesFilter(a: EventAssignment, vehicle: string, from: string, to: string): boolean {
  if (a.status !== 'active') return false;
  if (isBlankAssignment(a)) return false;
  if (vehicle !== 'all' && (a.vehicleNumber || '') !== vehicle) return false;
  if (!from && !to) return true;
  const dates = (a.dates || []).map((date) => isoDay(date)).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
  if (dates.length === 0) return true;
  const start = from ? isoDay(from) : '';
  const end = to ? isoDay(to) : '';
  return dates.some((date) => (!start || date >= start) && (!end || date <= end));
}

function documentMatchesFilter(doc: EventDocumentRow, vehicle: string, from: string, to: string): boolean {
  if (vehicle !== 'all' && (doc.vehicleNumber || '') !== vehicle) return false;
  const day = documentDate(doc);
  if (from && day && day < from) return false;
  if (to && day && day > to) return false;
  return true;
}

function dutiesMatchingFilter(duties: EventDuty[], vehicle: string, from: string, to: string): EventDuty[] {
  return duties.filter((duty) => {
    if (isBlankAssignment(duty)) return false;
    if (vehicle !== 'all' && (duty.vehicleNumber || '') !== vehicle) return false;
    if (from && duty.dutyDate < from) return false;
    if (to && duty.dutyDate > to) return false;
    return true;
  });
}

type TabExportRows = {
  assignments: EventAssignment[];
  duties: EventDuty[];
  documents: EventDocumentRow[];
  vehicles: EventFleetOption[];
};

function exportTabExcel(tab: string, event: VthEvent, vehicle: string, rows: TabExportRows) {
  const current = (FILTER_TABS as readonly string[]).includes(tab)
    ? (tab as (typeof FILTER_TABS)[number])
    : 'overview';
  switch (current) {
    case 'vehicles':
      downloadCsv(
        `${event.eventCode}-vehicles.csv`,
        ['Vehicle', 'Type', 'Model', 'Owner', 'RC', 'Insurance'],
        rows.vehicles.map((v) => [
          v.vehicleNumber,
          v.vehicleType || '',
          v.model || v.name || '',
          v.ownerName || '',
          v.documents?.rc ? 'yes' : '',
          v.documents?.insurance ? 'yes' : '',
        ]),
      );
      return;
    case 'drivers':
    case 'assignments':
      downloadCsv(
        `${event.eventCode}-assignments.csv`,
        ['SL.No', 'Vehicle', 'Type', 'Driver', 'Mobile'],
        rows.assignments.map((a, index) => [
          String(a.serialNo ?? index + 1),
          a.vehicleNumber || '',
          a.vehicleTypeLabel || '',
          a.driverName || '',
          a.driverMobile || '',
        ]),
      );
      return;
    case 'documents':
      downloadCsv(
        `${event.eventCode}-documents.csv`,
        ['Vehicle', 'Driver', 'Date', 'Slip', 'Document', 'Status'],
        rows.documents.map((doc) => [
          doc.vehicleNumber || '',
          doc.driverName || '',
          documentDate(doc),
          doc.dutySlipNo || '',
          doc.docType.replace(/_/g, ' '),
          doc.status,
        ]),
      );
      return;
    case 'overview':
    case 'duties':
    case 'reports':
      exportVehicleExcel(event, rows.duties, vehicle);
      return;
    default: {
      const _never: never = current;
      void _never;
    }
  }
}

function exportTabPdf(
  tab: string,
  event: VthEvent,
  from: string,
  to: string,
  vehicle: string,
  rows: TabExportRows,
) {
  const range = `${vehicle === 'all' ? 'All vehicles' : vehicle} · ${formatDutyDate(from)} – ${formatDutyDate(to)}`;
  const current = (FILTER_TABS as readonly string[]).includes(tab)
    ? (tab as (typeof FILTER_TABS)[number])
    : 'overview';
  switch (current) {
    case 'vehicles':
      printHtmlReport(
        `${event.name} vehicles`,
        `${event.name} vehicles`,
        `<table><thead><tr><th class="sl">SL.No</th><th>Vehicle</th><th>Model</th><th>RC</th><th>Insurance</th></tr></thead><tbody>${
          rows.vehicles.map((v, index) => `<tr>
            <td class="sl">${index + 1}</td>
            <td>${escapeHtml(v.vehicleNumber)}</td>
            <td>${escapeHtml(v.model || v.name)}</td>
            <td>${v.documents?.rc ? 'yes' : '—'}</td>
            <td>${v.documents?.insurance ? 'yes' : '—'}</td>
          </tr>`).join('')
        }</tbody></table>`,
        range,
      );
      return;
    case 'drivers':
    case 'assignments':
      printHtmlReport(
        `${event.name} assignments`,
        `${event.name} assignments`,
        `<table><thead><tr><th class="sl">SL.No</th><th>Vehicle</th><th>Type</th><th>Driver</th><th>Mobile</th></tr></thead><tbody>${
          rows.assignments.map((a, index) => `<tr>
            <td class="sl">${a.serialNo ?? index + 1}</td>
            <td>${escapeHtml(a.vehicleNumber)}</td>
            <td>${escapeHtml(a.vehicleTypeLabel)}</td>
            <td>${escapeHtml(a.driverName)}</td>
            <td>${escapeHtml(a.driverMobile)}</td>
          </tr>`).join('')
        }</tbody></table>`,
        range,
      );
      return;
    case 'documents':
      printHtmlReport(
        `${event.name} documents`,
        `${event.name} documents`,
        `<table><thead><tr><th class="sl">SL.No</th><th>Vehicle</th><th>Driver</th><th>Date</th><th>Document</th><th>Status</th></tr></thead><tbody>${
          rows.documents.map((doc, index) => `<tr>
            <td class="sl">${index + 1}</td>
            <td>${escapeHtml(doc.vehicleNumber)}</td>
            <td>${escapeHtml(doc.driverName)}</td>
            <td>${escapeHtml(doc.dutyDate ? formatDutyDate(doc.dutyDate) : documentDate(doc))}</td>
            <td>${escapeHtml(doc.docType.replace(/_/g, ' '))}</td>
            <td>${escapeHtml(doc.status)}</td>
          </tr>`).join('')
        }</tbody></table>`,
        range,
      );
      return;
    case 'overview':
    case 'duties':
    case 'reports':
      exportVehiclePdf(event, rows.duties, rows.assignments, vehicle, from, to);
      return;
    default: {
      const _never: never = current;
      void _never;
    }
  }
}

function dutiesForReport(duties: EventDuty[], vehicle: string, from: string, to: string): EventDuty[] {
  return duties.filter((duty) => {
    if (duty.status === 'cancelled') return false;
    if (!isRegisteredEventVehicle(duty.vehicleNumber)) return false;
    if (vehicle !== 'all' && (duty.vehicleNumber || '') !== vehicle) return false;
    if (from && duty.dutyDate < from) return false;
    if (to && duty.dutyDate > to) return false;
    return true;
  });
}

function exportVehicleExcel(event: VthEvent, rows: EventDuty[], vehicle: string) {
  downloadCsv(
    `${event.eventCode}-${vehicle === 'all' ? 'all-vehicles' : vehicle}-duties.csv`,
    ['Date', 'Slip', 'Vehicle', 'Driver', 'Opening KM', 'Closing KM', 'Total KM', 'Reporting time', 'Reported', 'Closing time', 'Odometer uploaded', 'Total time', 'Report location', 'Status'],
    rows.map((d) => [
      d.dutyDate,
      d.dutySlipNo,
      d.vehicleNumber || '',
      d.driverName || '',
      d.openingKm ?? '',
      d.closingKm ?? '',
      d.totalKm ?? '',
      formatReportingTime(d.reportingTime),
      d.openingAt || '',
      dutyClosingTime(d.closingAt, d.endRequestedAt) || '',
      d.closingAt || '',
      formatReportDutyDuration(d),
      formatGps(d.openingGps),
      dutyStatusLabel(d.status),
    ]),
  );
}

function assignmentSlNo(assignments: EventAssignment[], assignmentId: number, vehicleNumber?: string | null): number | null {
  const byId = assignments.findIndex((assignment) => assignment.id === assignmentId);
  if (byId >= 0) {
    const match = assignments[byId];
    return match.serialNo != null && match.serialNo > 0 ? match.serialNo : byId + 1;
  }
  const byVehicle = assignments.findIndex((assignment) => assignment.vehicleNumber && assignment.vehicleNumber === vehicleNumber);
  if (byVehicle >= 0) {
    const match = assignments[byVehicle];
    return match.serialNo != null && match.serialNo > 0 ? match.serialNo : byVehicle + 1;
  }
  return null;
}

function exportVehiclePdf(event: VthEvent, rows: EventDuty[], assignments: EventAssignment[], vehicle: string, from: string, to: string) {
  const heading = vehicle === 'all' ? `${event.name} · all vehicles` : `${event.name} · ${vehicle}`;
  const ordered = [...rows].sort((a, b) => {
    const aSerial = assignmentSlNo(assignments, a.assignmentId, a.vehicleNumber) ?? 9999;
    const bSerial = assignmentSlNo(assignments, b.assignmentId, b.vehicleNumber) ?? 9999;
    if (aSerial !== bSerial) return aSerial - bSerial;
    if (a.dutyDate !== b.dutyDate) return a.dutyDate < b.dutyDate ? -1 : 1;
    return a.id - b.id;
  });
  const body = `<table><thead><tr>
    <th class="sl">SL.No</th><th>Date</th><th>Slip</th><th>Vehicle</th><th>Driver</th><th>Opening KM</th><th>Closing KM</th><th>Total KM</th>
    <th>Reporting time</th><th>Reported</th><th>Closing time</th><th>Odometer uploaded</th><th>Total time</th><th>Location</th><th>Status</th>
  </tr></thead><tbody>${ordered.map((d) => `<tr>
    <td class="sl">${assignmentSlNo(assignments, d.assignmentId, d.vehicleNumber) ?? '—'}</td>
    <td>${escapeHtml(formatDutyDate(d.dutyDate))}</td>
    <td>${escapeHtml(d.dutySlipNo)}</td>
    <td>${escapeHtml(d.vehicleNumber)}</td>
    <td>${escapeHtml(d.driverName)}</td>
    <td>${escapeHtml(d.openingKm)}</td>
    <td>${escapeHtml(d.closingKm)}</td>
    <td>${escapeHtml(d.totalKm)}</td>
    <td>${escapeHtml(formatReportingTime(d.reportingTime) || '—')}</td>
    <td>${escapeHtml(formatServerDateTime(d.openingAt))}</td>
    <td>${escapeHtml(formatServerDateTime(dutyClosingTime(d.closingAt, d.endRequestedAt)))}</td>
    <td>${escapeHtml(formatServerDateTime(d.closingAt))}</td>
    <td>${escapeHtml(formatReportDutyDuration(d) || '—')}</td>
    <td>${escapeHtml(formatGps(d.openingGps) || '—')}</td>
    <td>${escapeHtml(dutyStatusLabel(d.status))}</td>
  </tr>`).join('')}</tbody></table>`;
  printHtmlReport(
    heading,
    heading,
    body,
    `${formatDutyDate(from)} – ${formatDutyDate(to)} · ${rows.length} duty day(s)`,
  );
}

function DocumentsPanel({
  documents, onReload, onViewFile,
}: {
  documents: EventDocumentRow[];
  onReload: () => void;
  onViewFile: (url: string, title: string) => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{doc.vehicleNumber || '—'}</TableCell>
              <TableCell>{doc.driverName || (doc.ownerType === 'duty' ? '—' : `${doc.ownerType} #${doc.ownerId}`)}</TableCell>
              <TableCell>{doc.dutyDate ? formatDutyDate(doc.dutyDate) : (documentDate(doc) || '—')}</TableCell>
              <TableCell className="capitalize">{doc.docType.replace(/_/g, ' ')}</TableCell>
              <TableCell>
                <Badge variant={doc.status === 'verified' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}>{doc.status}</Badge>
                {doc.rejectionReason && <div className="text-xs text-muted-foreground">{doc.rejectionReason}</div>}
              </TableCell>
              <TableCell className="space-x-1">
                <Button size="sm" variant="outline" onClick={() => { void onViewFile(eventDutyAPI.mediaUrl(doc.id), doc.docType.replace(/_/g, ' ')); }}>View</Button>
                <Button size="sm" onClick={async () => { await eventDutyAPI.verifyDocument(doc.id); toast.success('Verified'); onReload(); }}>Verify</Button>
                <Input className="inline-flex w-40 h-8" placeholder="Reject reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button size="sm" variant="ghost" onClick={async () => { await eventDutyAPI.rejectDocument(doc.id, reason || 'Please resubmit'); toast.success('Rejected'); onReload(); }}>Reject</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirmAction('Delete this document?')) return;
                  try {
                    await eventDutyAPI.deleteDocument(doc.id);
                    toast.success('Document deleted');
                    onReload();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not delete document');
                  }
                }}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {documents.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No documents in this filter.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function VehicleReportPanel({
  event, duties, vehicle, from, to,
}: {
  event: VthEvent;
  duties: EventDuty[];
  vehicle: string;
  from: string;
  to: string;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Vehicle report</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {vehicle === 'all' ? 'All vehicles' : vehicle} · {formatDutyDate(from)} – {formatDutyDate(to)}.
          Use the filters above, then Excel or PDF.
        </p>
        <p className="text-xs text-muted-foreground">{duties.length} duty day(s) in this range · {event.name}.</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>KM</TableHead>
                <TableHead>Reporting time</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Closing Time</TableHead>
                <TableHead>Odometer uploaded</TableHead>
                <TableHead>Total time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duties.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{formatDutyDate(d.dutyDate)}</TableCell>
                  <TableCell>{d.vehicleNumber || d.vehicleTypeLabel}</TableCell>
                  <TableCell>{d.driverName || '—'}</TableCell>
                  <TableCell>{d.totalKm ?? '—'}</TableCell>
                  <TableCell>{formatReportingTime(d.reportingTime) || '—'}</TableCell>
                  <TableCell><DutyStamp label="Reported" at={d.openingAt} gps={d.openingGps} /></TableCell>
                  <TableCell>{formatServerDateTime(dutyClosingTime(d.closingAt, d.endRequestedAt))}</TableCell>
                  <TableCell><DutyStamp label="Uploaded" at={d.closingAt} gps={d.closingGps} /></TableCell>
                  <TableCell><DutyDuration start={reportDutyStart(d)} end={billableDutyEnd(d.closingAt, d.endRequestedAt)} pausedSeconds={d.pausedSeconds} /></TableCell>
                  <TableCell>{dutyStatusLabel(d.status)}</TableCell>
                </TableRow>
              ))}
              {duties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-sm text-muted-foreground">No duties in this filter.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EventSummaryPanel({
  summary, vehicle, duties,
}: {
  summary: EventSummary | null;
  vehicle: string;
  duties: EventDuty[];
}) {
  if (!summary) return null;
  const rows = summary.vehicleWise.filter((row) => isRegisteredEventVehicle(row.vehicle) && (vehicle === 'all' || (row.vehicle || '') === vehicle));
  const completed = duties.filter((d) => d.status === 'completed').length;
  const km = duties.reduce((sum, d) => sum + (d.totalKm || 0), 0);
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-3 gap-3">
        <Stat title="Total vehicles" value={vehicle === 'all' ? summary.totalVehicles : rows.length} />
        <Stat title="Completed slips" value={completed} />
        <Stat title="Total KM" value={km} />
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Driver</TableHead><TableHead>Days</TableHead><TableHead>KM</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`v-${i}`}><TableCell>{row.vehicle || '—'}</TableCell><TableCell>{row.driver || '—'}</TableCell><TableCell>{row.dutyDays}</TableCell><TableCell>{row.totalKm}</TableCell></TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No vehicles in this filter.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function EventTrackingPanel({ eventId, defaultDate }: { eventId: number; defaultDate: string }) {
  const [date, setDate] = useState(defaultDate);
  const [vehicles, setVehicles] = useState<EventTrackVehicle[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setRefreshing(true);
    eventDutyAPI.tracking(eventId, date)
      .then((res) => setVehicles(res.vehicles || []))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Unable to load tracking'))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 20000);
    return () => window.clearInterval(id);
  }, [eventId, date]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-44" />
        <p className="text-sm text-muted-foreground">
          Positions come from the VTH app while duty is open. Drivers can lock the screen; a notification stays until they end duty.
        </p>
      </div>
      <EventTrackingMap vehicles={vehicles} onRefresh={load} refreshing={refreshing} />
    </div>
  );
}

function SharePanel({
  event, shareUrl, tokens, onCreate, onRevoke,
}: {
  event: VthEvent;
  shareUrl: string;
  tokens: EventTokenRow[];
  onCreate: () => void;
  onRevoke: (id: number) => void;
}) {
  const url = shareUrl || '';
  const today = `${url}${url.includes('?') ? '&' : '?'}date=${todayIsoDate()}`;
  return (
    <Card>
      <CardHeader><CardTitle>Share with event manager</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Read-only. Aadhaar, DL and vehicle documents are never shown.</p>
        <Button onClick={onCreate}>Create / rotate share link</Button>
        {url && (
          <div className="space-y-2">
            <Input readOnly value={url} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(url); toast.success('Copied'); }}>Copy link</Button>
              <Button variant="outline" asChild><a href={whatsappUrl(eventShareMessage(event.name, url))} target="_blank" rel="noreferrer">WhatsApp</a></Button>
              <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(today); toast.success("Today's summary copied"); }}>Share today&apos;s summary</Button>
            </div>
            <img src={qrImageUrl(url)} alt="Event share QR" className="h-40 w-40" />
          </div>
        )}
        {tokens.filter((t) => t.type === 'event_share').map((t) => {
          const link = t.url || (t.active && url && t.id === tokens.find((row) => row.type === 'event_share' && row.active)?.id ? url : '');
          return (
            <div key={t.id} className="flex items-center justify-between gap-3 text-sm border rounded-md p-2">
              <span className="shrink-0">{t.active ? 'Active' : 'Revoked'} · created {formatServerDateTime(t.createdAt)}</span>
              {t.active ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!link) {
                      toast.error('This link cannot be copied again. Create a new share link, then use Copy link.');
                      return;
                    }
                    void navigator.clipboard.writeText(link);
                    toast.success('Link copied');
                  }}
                >
                  Copy link
                </Button>
              ) : <span />}
              {t.active && <Button size="sm" variant="ghost" onClick={() => onRevoke(t.id)}>Revoke</Button>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function LinkDialog({ title, url, whatsappText, onClose }: { title: string; url: string; whatsappText: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input readOnly value={url} />
        <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm">{whatsappText}</pre>
        <div className="flex gap-2">
          <Button onClick={() => { void navigator.clipboard.writeText(whatsappText); toast.success('Message copied'); }}>Copy</Button>
          <Button asChild><a href={whatsappUrl(whatsappText)} target="_blank" rel="noreferrer">WhatsApp</a></Button>
        </div>
        <img src={qrImageUrl(url)} alt="QR" className="h-40 w-40" />
        <p className="sr-only">{dutySlipMessage({ date: '', url })}</p>
      </DialogContent>
    </Dialog>
  );
}
