import { useEffect, useState } from 'react';
import { bookingAPI } from '@/services/api/bookingAPI';
import { vendorTripAPI, type VendorTripLink } from '@/services/api/vendorTripAPI';

export type VendorTripLinkTarget = {
  tripId: number;
  tripCode: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  /** Full booking fare. The collect amount is stored separately. */
  fare?: number;
  advance?: number;
};
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function officeDriverName(name: string | undefined): string {
  const value = (name || '').trim();
  if (/^driver\s*#/i.test(value)) return '';
  return value;
}

function moneyInput(value: number | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return '';
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function displayPhone(raw: string | undefined): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return (raw || '').trim();
}

export function VendorTripLinkDialog({
  trip,
  open,
  onOpenChange,
  onSent,
}: {
  trip: VendorTripLinkTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}) {
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [collectFromGuest, setCollectFromGuest] = useState(true);
  const [collectAmount, setCollectAmount] = useState('');
  const [link, setLink] = useState<VendorTripLink | null>(null);
  const [busy, setBusy] = useState<'' | 'generate' | 'send' | 'revoke'>('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!trip || !open) return;
    setDriverName(officeDriverName(trip.driverName));
    setDriverPhone(displayPhone(trip.driverPhone));
    setVehicleNumber((trip.vehicleNumber || '').trim() === '—' ? '' : (trip.vehicleNumber || ''));
    setCollectFromGuest(true);
    setCollectAmount(moneyInput(trip.fare));
    setLink(null);
    setCopied(false);
    setError('');
    setNotice('');
  }, [trip, open]);

  const generate = async (): Promise<VendorTripLink | null> => {
    if (!trip) return null;
    const amount = Number(collectAmount);
    if (collectFromGuest && (!Number.isFinite(amount) || amount <= 0)) {
      setError('Enter the amount the driver should collect from the guest.');
      return null;
    }
    setBusy('generate');
    setError('');
    setNotice('');
    setCopied(false);
    try {
      const created = await vendorTripAPI.createLink(trip.tripId, {
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleNumber: vehicleNumber.trim(),
        collectFromGuest,
        collectAmount: collectFromGuest ? Math.round(amount * 100) / 100 : null,
      });
      setLink(created);
      setDriverPhone(displayPhone(created.phone));
      onSent();
      return created;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The trip link could not be created.');
      return null;
    } finally {
      setBusy('');
    }
  };

  const revoke = async () => {
    if (!trip || busy) return;
    const confirmed = window.confirm('Revoke this trip link? The driver will not be able to open it.');
    if (!confirmed) return;
    setBusy('revoke');
    setError('');
    setNotice('');
    setCopied(false);
    try {
      await vendorTripAPI.revokeLink(trip.tripId);
      setLink(null);
      setNotice('Trip link revoked. The driver can no longer open it.');
      onSent();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The trip link could not be revoked.');
    } finally {
      setBusy('');
    }
  };

  const copyLink = async () => {
    const current = link ?? await generate();
    if (!current?.url) return;
    try {
      await navigator.clipboard.writeText(current.url);
      setCopied(true);
      setNotice('Link copied. Paste it into the driver’s WhatsApp.');
    } catch {
      setNotice('Select the link below and copy it.');
    }
  };

  const send = async () => {
    const current = link ?? await generate();
    if (!current?.url) return;
    setBusy('send');
    setError('');
    try {
      await bookingAPI.sendAdminTripWhatsApp(current.phone, current.message);
      setNotice('WhatsApp sent to the driver.');
      onSent();
    } catch (sendError) {
      const reason = sendError instanceof Error ? sendError.message : 'WhatsApp did not send';
      setError(`${reason}. Copy the link and send it yourself.`);
    } finally {
      setBusy('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send trip link{trip ? ` · ${trip.tripCode}` : ''}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Generate one link for this trip, then send it to the driver. He photographs the opening odometer to start, and uses the same link for the closing odometer.
        </p>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Driver name</Label>
            <Input value={driverName} onChange={(event) => setDriverName(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Driver phone</Label>
            <Input inputMode="tel" value={driverPhone} onChange={(event) => setDriverPhone(event.target.value)} placeholder="10-digit mobile" />
          </div>
          <div className="grid gap-1">
            <Label>Vehicle number</Label>
            <Input value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div className="grid gap-0.5">
              <Label htmlFor="collect-from-guest">Collect from the guest</Label>
              <p className="text-xs text-muted-foreground">
                {trip?.fare && trip.fare > 0 ? `Booking amount stays ${rupees(trip.fare)}. ` : ''}
                The driver sees this choice on the trip link.
              </p>
            </div>
            <Switch
              id="collect-from-guest"
              checked={collectFromGuest}
              onCheckedChange={(checked) => {
                setCollectFromGuest(checked);
                setLink(null);
              }}
            />
          </div>
          {collectFromGuest ? (
            <div className="grid gap-1">
              <Label htmlFor="collect-amount">Amount to collect (₹)</Label>
              <Input
                id="collect-amount"
                inputMode="decimal"
                value={collectAmount}
                onChange={(event) => {
                  setCollectAmount(event.target.value);
                  setLink(null);
                }}
                placeholder="Amount the driver collects"
              />
              {trip?.advance && trip.advance > 0 ? (
                <p className="text-xs text-muted-foreground">Advance on the booking is {rupees(trip.advance)}. It stays on the booking.</p>
              ) : null}
            </div>
          ) : null}
          {link?.url ? (
            <div className="grid gap-1">
              <Label>Trip link</Label>
              <Input readOnly value={link.url} onFocus={(event) => event.currentTarget.select()} />
            </div>
          ) : null}
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => void generate()} disabled={busy !== '' || !trip}>
            {busy === 'generate' ? 'Generating…' : 'Generate link'}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => void revoke()}
              disabled={busy !== '' || !trip}
            >
              {busy === 'revoke' ? 'Revoking…' : 'Revoke'}
            </Button>
            <Button type="button" variant="outline" onClick={() => void copyLink()} disabled={busy !== '' || !trip}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button type="button" onClick={() => void send()} disabled={busy !== '' || !trip}>
              {busy === 'send' ? 'Sending…' : 'Send on WhatsApp'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
