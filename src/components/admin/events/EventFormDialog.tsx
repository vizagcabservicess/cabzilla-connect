import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EventSavePayload, EventStatus, VthEvent } from '@/types/eventDuty';
import { OCTOBER_2026_TEMPLATE } from '@/lib/eventDuty';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: VthEvent | null;
  onSubmit: (payload: EventSavePayload) => Promise<void>;
}

export function EventFormDialog({ open, onOpenChange, event, onSubmit }: EventFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EventSavePayload>({
    name: '',
    eventCode: '',
    clientName: '',
    clientMobile: '',
    startDate: '',
    endDate: '',
    reportingLocation: '',
    defaultReportingTime: '06:00',
    notes: '',
    status: 'active',
    gpsRequired: false,
    supportMobile: '9966363662',
  });

  useEffect(() => {
    if (!open) return;
    if (event) {
      setForm({
        id: event.id,
        name: event.name,
        eventCode: event.eventCode,
        clientName: event.clientName || '',
        clientMobile: event.clientMobile || '',
        startDate: event.startDate,
        endDate: event.endDate,
        reportingLocation: event.reportingLocation || '',
        defaultReportingTime: event.defaultReportingTime || '06:00',
        notes: event.notes || '',
        status: event.status,
        gpsRequired: event.gpsRequired,
        supportMobile: event.supportMobile || '9966363662',
      });
    } else {
      setForm({
        name: '',
        eventCode: '',
        clientName: '',
        clientMobile: '',
        startDate: '',
        endDate: '',
        reportingLocation: '',
        defaultReportingTime: '06:00',
        notes: '',
        status: 'active',
        gpsRequired: false,
        supportMobile: '9966363662',
      });
    }
  }, [open, event]);

  const applyOctober = () => {
    setForm((prev) => ({
      ...prev,
      name: OCTOBER_2026_TEMPLATE.name,
      eventCode: event ? prev.eventCode : OCTOBER_2026_TEMPLATE.eventCode,
      startDate: OCTOBER_2026_TEMPLATE.startDate,
      endDate: OCTOBER_2026_TEMPLATE.endDate,
      defaultReportingTime: OCTOBER_2026_TEMPLATE.defaultReportingTime,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit event / change dates' : 'Create event'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await onSubmit(form);
              onOpenChange(false);
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={applyOctober}>
              Load October 2026 template
            </Button>
          </div>
          <div>
            <Label>Event name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Event ID</Label>
            <Input
              value={form.eventCode}
              onChange={(e) => setForm({ ...form, eventCode: e.target.value.toUpperCase() })}
              placeholder="Auto-generated if empty"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Client / event manager</Label>
              <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            </div>
            <div>
              <Label>Client mobile</Label>
              <Input value={form.clientMobile} onChange={(e) => setForm({ ...form, clientMobile: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Move the start date earlier to prepone, or the end date later to extend. Active vehicles get the new days automatically. Days with a started duty cannot be removed.
          </p>
          <div>
            <Label>Reporting location</Label>
            <Input value={form.reportingLocation} onChange={(e) => setForm({ ...form, reportingLocation: e.target.value })} />
          </div>
          <div>
            <Label>Default reporting time</Label>
            <Input type="time" value={form.defaultReportingTime} onChange={(e) => setForm({ ...form, defaultReportingTime: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EventStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Driver support number</Label>
            <Input
              inputMode="numeric"
              value={form.supportMobile || ''}
              onChange={(e) => setForm({ ...form, supportMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="9966363662"
            />
            <p className="mt-1 text-xs text-muted-foreground">Shown as Call Support on the driver duty screen.</p>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Require GPS</Label>
              <p className="text-xs text-muted-foreground">If off, drivers can still start duty when they deny location.</p>
            </div>
            <Switch checked={!!form.gpsRequired} onCheckedChange={(gpsRequired) => setForm({ ...form, gpsRequired })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : event ? 'Save changes' : 'Create event'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
