import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { EventFormDialog } from '@/components/admin/events/EventFormDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { CalendarDays, Car, Copy, FileWarning, Plus, Search, Trash2, Users } from 'lucide-react';
import { eventDutyAPI } from '@/services/api/eventDutyAPI';
import { dutyStatusLabel, formatDutyDate, formatDutyDateRange } from '@/lib/eventDuty';
import type { EventDashboard, EventDuty, EventSavePayload, VthEvent } from '@/types/eventDuty';

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<VthEvent[]>([]);
  const [dashboard, setDashboard] = useState<EventDashboard | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [searchHits, setSearchHits] = useState<EventDuty[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VthEvent | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await eventDutyAPI.listEvents(query, status === 'all' ? undefined : status);
      setEvents(list.events || []);
      if (list.dashboard) {
        setDashboard(list.dashboard);
      } else {
        const dash = await eventDutyAPI.dashboard();
        setDashboard(dash.dashboard);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const cards = useMemo(() => ([
    { label: 'Active Events', value: dashboard?.activeEvents ?? 0, icon: CalendarDays },
    { label: 'Vehicles Assigned', value: dashboard?.vehiclesAssigned ?? 0, icon: Car },
    { label: 'Drivers Registered', value: dashboard?.driversRegistered ?? 0, icon: Users },
    { label: "Today's Duties", value: dashboard?.todaysDuties ?? 0, icon: CalendarDays },
    { label: 'Completed Duties', value: dashboard?.completedDuties ?? 0, icon: CalendarDays },
    { label: 'Pending Duties', value: dashboard?.pendingDuties ?? 0, icon: CalendarDays },
    { label: 'Missing Documents', value: dashboard?.missingDocuments ?? 0, icon: FileWarning },
  ]), [dashboard]);

  const save = async (payload: EventSavePayload) => {
    try {
      const res = payload.id
        ? await eventDutyAPI.updateEvent(payload)
        : await eventDutyAPI.createEvent(payload);
      toast.success(payload.id ? 'Event dates and details saved' : 'Event created');
      if (!payload.id) {
        navigate(`/admin/events/${res.event.id}`);
      } else {
        void load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
      throw err;
    }
  };

  const removeEvent = async (event: VthEvent) => {
    if (!window.confirm(`Delete “${event.name}”? Unstarted duties will be removed. Started duties must be cancelled first.`)) {
      return;
    }
    try {
      await eventDutyAPI.deleteEvent(event.id);
      toast.success('Event deleted');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete event');
    }
  };

  return (
    <AdminLayout activeTab="events">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Event & Duty Management</h1>
            <p className="text-sm text-muted-foreground">Manage VTH events, vehicles, drivers and duty slips.</p>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Create event
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-semibold">{card.value}</div>
                <card.icon className="h-5 w-5 text-blue-600" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search vehicle number, driver, mobile, event, duty date…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void load();
                      if (query.trim()) {
                        eventDutyAPI.search(query).then((r) => setSearchHits(r.duties || [])).catch(() => undefined);
                      }
                    }
                  }}
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => {
                void load();
                if (query.trim()) {
                  eventDutyAPI.search(query).then((r) => setSearchHits(r.duties || [])).catch(() => undefined);
                } else {
                  setSearchHits([]);
                }
              }}>Search</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} className="cursor-pointer" onClick={() => navigate(`/admin/events/${event.id}`)}>
                    <TableCell>
                      <div className="font-medium">{event.name}</div>
                      <div className="text-xs text-muted-foreground">{event.eventCode}</div>
                    </TableCell>
                    <TableCell>{formatDutyDate(event.startDate)} – {formatDutyDate(event.endDate)}</TableCell>
                    <TableCell>{event.clientName || '—'}</TableCell>
                    <TableCell>{event.assignmentCount ?? 0}</TableCell>
                    <TableCell><Badge variant={event.status === 'active' ? 'default' : 'secondary'}>{event.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(event); setFormOpen(true); }}>Edit dates</Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        try {
                          const res = await eventDutyAPI.duplicateEvent(event.id);
                          toast.success('Event duplicated');
                          navigate(`/admin/events/${res.event.id}`);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Duplicate failed');
                        }
                      }}><Copy className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { void removeEvent(event); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && events.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No events yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            {searchHits.length > 0 && (
              <div className="pt-4">
                <h3 className="font-medium mb-2">Duty matches</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchHits.map((duty) => (
                      <TableRow key={duty.id} className="cursor-pointer" onClick={() => navigate(`/admin/events/${duty.eventId}`)}>
                        <TableCell>{formatDutyDate(duty.dutyDate)}</TableCell>
                        <TableCell>{duty.eventName}</TableCell>
                        <TableCell>{duty.vehicleNumber || duty.vehicleTypeLabel}</TableCell>
                        <TableCell>{duty.driverName || '—'} {duty.driverMobile ? `· ${duty.driverMobile}` : ''}</TableCell>
                        <TableCell>{dutyStatusLabel(duty.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="sr-only">{formatDutyDateRange(searchHits.map((d) => d.dutyDate))}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} onSubmit={save} />
    </AdminLayout>
  );
}
