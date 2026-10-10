import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { DateChipPicker } from '@/components/admin/events/DateChipPicker';
import { DutyDuration, DutyStamp } from '@/components/admin/events/DutyReportDetails';
import { EventFormDialog } from '@/components/admin/events/EventFormDialog';
import { EventListFilters } from '@/components/admin/events/EventListFilters';
import { AskDriverEndButton } from '@/components/events/AskDriverEndButton';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Download, RefreshCw } from 'lucide-react';
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
  formatDutyDuration,
  formatGps,
  formatServerDateTime,
  isRegisteredEventVehicle,
  keepFilled,
  qrImageUrl,
  todayIsoDate,
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
  const vehicleOptions = vehicleChoices(duties, documents, [...vehicles, ...assignments]);
  const filteredAssignments = assignments.filter((a) => assignmentMatchesFilter(a, filterVehicle, from, to));
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
                  await eventDutyAPI.applyOctoberTemplate(event.id);
                  toast.success('October 2026 requirement slots added');
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
        initial={editAssignment}
        onSaved={reload}
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

function AssignmentTable({
  assignments, eventDates, onEdit, onReplace, onSendLink, onReload, onViewDocuments,
}: {
  assignments: EventAssignment[];
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
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Docs</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <div className="font-medium">{a.vehicleNumber || 'Not assigned'}</div>
                <div className="text-xs text-muted-foreground">{a.vehicleTypeLabel}{a.passengerCount ? ` · ${a.passengerCount} pax` : ''}</div>
              </TableCell>
              <TableCell>
                <div>{a.driverName || 'Not assigned'}</div>
                <div className="text-xs text-muted-foreground">{a.driverMobile || ''}</div>
              </TableCell>
              <TableCell className="text-xs">{formatDutyDateRange(a.dates)}</TableCell>
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
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">
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

function AssignmentDialog({
  open, onOpenChange, event, eventDates, vehicles, drivers, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: VthEvent;
  eventDates: string[];
  vehicles: EventFleetOption[];
  drivers: EventDriverOption[];
  initial?: EventAssignment | null;
  onSaved: () => void;
}) {
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [type, setType] = useState('innova_crysta');
  const [dates, setDates] = useState<string[]>([]);
  const [time, setTime] = useState(event.defaultReportingTime);
  const [loc, setLoc] = useState(event.reportingLocation || '');
  const [pax, setPax] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setVehicleId(initial?.vehicleId ? String(initial.vehicleId) : 'none');
    setDriverId(initial?.driverId ? String(initial.driverId) : 'none');
    setType(initial?.vehicleType || 'innova_crysta');
    setDates(initial?.dates || []);
    setTime(initial?.reportingTime || event.defaultReportingTime);
    setLoc(initial?.reportingLocation || event.reportingLocation || '');
    setPax(initial?.passengerCount != null ? String(initial.passengerCount) : '');
    setNotes(initial?.notes || '');
  }, [open, initial, event.defaultReportingTime, event.reportingLocation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'Edit assignment' : 'Add vehicle assignment'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Label>Vehicle type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{eventVehicleTypeLabel(t)}</SelectItem>)}</SelectContent>
          </Select>
          <Label>Vehicle</Label>
          {vehicles.length === 0 && (
            <p className="text-xs text-muted-foreground">Add an event vehicle in the Vehicles tab first. These are not company fleet cars.</p>
          )}
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger><SelectValue placeholder="Assign later" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Assign later</SelectItem>
              {vehicles.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.vehicleNumber} · {v.model}</SelectItem>)}
            </SelectContent>
          </Select>
          <Label>Driver</Label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger><SelectValue placeholder="Assign later" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Assign later</SelectItem>
              {drivers.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name} · {d.phone}</SelectItem>)}
            </SelectContent>
          </Select>
          <Label>Duty dates</Label>
          <DateChipPicker dates={eventDates} selected={dates} onChange={setDates} />
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Reporting time</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            <div><Label>Passenger count</Label><Input value={pax} onChange={(e) => setPax(e.target.value)} /></div>
          </div>
          <Input placeholder="Reporting location" value={loc} onChange={(e) => setLoc(e.target.value)} />
          <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button className="w-full" onClick={async () => {
            const payload = {
              eventId: event.id,
              vehicleType: type,
              vehicleId: vehicleId && vehicleId !== 'none' ? Number(vehicleId) : null,
              driverId: driverId && driverId !== 'none' ? Number(driverId) : null,
              dates,
              reportingTime: time,
              reportingLocation: loc,
              passengerCount: pax ? Number(pax) : null,
              notes,
            };
            try {
              if (initial) {
                await eventDutyAPI.updateAssignment({ id: initial.id, ...payload });
                toast.success('Assignment updated');
              } else {
                await eventDutyAPI.createAssignment(payload);
                toast.success('Assignment saved. Duty slips created for selected dates.');
              }
              onOpenChange(false);
              onSaved();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Could not save assignment');
            }
          }}>{initial ? 'Save changes' : 'Save and create duties'}</Button>
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
              <TableCell>
                <DutyStamp label="Reported" at={d.openingAt} gps={d.openingGps} />
              </TableCell>
              <TableCell>{formatServerDateTime(dutyClosingTime(d.closingAt, d.endRequestedAt))}</TableCell>
              <TableCell>
                <DutyStamp label="Uploaded" at={d.closingAt} gps={d.closingGps} />
              </TableCell>
              <TableCell>
                <DutyDuration start={d.openingAt} end={billableDutyEnd(d.closingAt, d.endRequestedAt)} />
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
              <TableCell colSpan={10} className="text-sm text-muted-foreground">No duties in this filter.</TableCell>
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
    </div>
  );
}

function documentDate(doc: EventDocumentRow): string {
  return doc.dutyDate || (doc.createdAt ? doc.createdAt.slice(0, 10) : '');
}

function vehicleChoices(
  duties: EventDuty[],
  documents: EventDocumentRow[] = [],
  extra: Array<{ vehicleNumber?: string | null }> = [],
): string[] {
  return [...new Set(
    [
      ...duties.map((d) => d.vehicleNumber),
      ...documents.map((d) => d.vehicleNumber),
      ...extra.map((d) => d.vehicleNumber),
    ]
      .map((value) => (value || '').trim())
      .filter(Boolean),
  )].sort();
}

function assignmentMatchesFilter(a: EventAssignment, vehicle: string, from: string, to: string): boolean {
  if (a.status !== 'active') return false;
  if (vehicle !== 'all' && (a.vehicleNumber || '') !== vehicle) return false;
  if (!from && !to) return true;
  const dates = a.dates || [];
  if (dates.length === 0) return false;
  return dates.some((d) => (!from || d >= from) && (!to || d <= to));
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
        ['Vehicle', 'Type', 'Driver', 'Mobile', 'Dates'],
        rows.assignments.map((a) => [
          a.vehicleNumber || '',
          a.vehicleTypeLabel || '',
          a.driverName || '',
          a.driverMobile || '',
          (a.dates || []).join(' '),
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
        `<table><thead><tr><th class="sl">SL.No</th><th>Vehicle</th><th>Type</th><th>Driver</th><th>Mobile</th><th>Dates</th></tr></thead><tbody>${
          rows.assignments.map((a, index) => `<tr>
            <td class="sl">${index + 1}</td>
            <td>${escapeHtml(a.vehicleNumber)}</td>
            <td>${escapeHtml(a.vehicleTypeLabel)}</td>
            <td>${escapeHtml(a.driverName)}</td>
            <td>${escapeHtml(a.driverMobile)}</td>
            <td>${escapeHtml(formatDutyDateRange(a.dates))}</td>
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
      exportVehiclePdf(event, rows.duties, vehicle, from, to);
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
    ['Date', 'Slip', 'Vehicle', 'Driver', 'Opening KM', 'Closing KM', 'Total KM', 'Reported', 'Closing time', 'Odometer uploaded', 'Total time', 'Report location', 'Status'],
    rows.map((d) => [
      d.dutyDate,
      d.dutySlipNo,
      d.vehicleNumber || '',
      d.driverName || '',
      d.openingKm ?? '',
      d.closingKm ?? '',
      d.totalKm ?? '',
      d.openingAt || '',
      dutyClosingTime(d.closingAt, d.endRequestedAt) || '',
      d.closingAt || '',
      formatDutyDuration(d.openingAt, billableDutyEnd(d.closingAt, d.endRequestedAt)),
      formatGps(d.openingGps),
      dutyStatusLabel(d.status),
    ]),
  );
}

function exportVehiclePdf(event: VthEvent, rows: EventDuty[], vehicle: string, from: string, to: string) {
  const heading = vehicle === 'all' ? `${event.name} · all vehicles` : `${event.name} · ${vehicle}`;
  const body = `<table><thead><tr>
    <th class="sl">SL.No</th><th>Date</th><th>Slip</th><th>Vehicle</th><th>Driver</th><th>Opening KM</th><th>Closing KM</th><th>Total KM</th>
    <th>Reported</th><th>Closing time</th><th>Odometer uploaded</th><th>Total time</th><th>Location</th><th>Status</th>
  </tr></thead><tbody>${rows.map((d, index) => `<tr>
    <td class="sl">${index + 1}</td>
    <td>${escapeHtml(formatDutyDate(d.dutyDate))}</td>
    <td>${escapeHtml(d.dutySlipNo)}</td>
    <td>${escapeHtml(d.vehicleNumber)}</td>
    <td>${escapeHtml(d.driverName)}</td>
    <td>${escapeHtml(d.openingKm)}</td>
    <td>${escapeHtml(d.closingKm)}</td>
    <td>${escapeHtml(d.totalKm)}</td>
    <td>${escapeHtml(formatServerDateTime(d.openingAt))}</td>
    <td>${escapeHtml(formatServerDateTime(dutyClosingTime(d.closingAt, d.endRequestedAt)))}</td>
    <td>${escapeHtml(formatServerDateTime(d.closingAt))}</td>
    <td>${escapeHtml(formatDutyDuration(d.openingAt, billableDutyEnd(d.closingAt, d.endRequestedAt)) || '—')}</td>
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
                  <TableCell><DutyStamp label="Reported" at={d.openingAt} gps={d.openingGps} /></TableCell>
                  <TableCell>{formatServerDateTime(dutyClosingTime(d.closingAt, d.endRequestedAt))}</TableCell>
                  <TableCell><DutyStamp label="Uploaded" at={d.closingAt} gps={d.closingGps} /></TableCell>
                  <TableCell><DutyDuration start={d.openingAt} end={billableDutyEnd(d.closingAt, d.endRequestedAt)} /></TableCell>
                  <TableCell>{dutyStatusLabel(d.status)}</TableCell>
                </TableRow>
              ))}
              {duties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-sm text-muted-foreground">No duties in this filter.</TableCell>
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
