import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, Loader2, SkipForward, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { smartBudgetAPI, smartBudgetVendorStorage } from '@/services/api/smartBudgetAPI';
import { uploadSmartBudgetVendorFile } from '@/lib/smartBudgetUpload';
import {
  SmartBudgetMediaImage,
  SmartBudgetMediaViewLink,
} from '@/components/smart-budget/SmartBudgetMediaImage';
import {
  SMART_BUDGET_POLL_INTERVAL_MS,
  formatSmartBudgetFeeLabel,
  formatSmartBudgetStatus,
  isSmartBudgetAwaitingFee,
  type SmartBudgetLead,
  type SmartBudgetSession,
  type SmartBudgetVendor,
} from '@/types/smartBudget';
import { SmartBudgetCountdown } from '@/components/smart-budget/SmartBudgetCountdown';
import {
  VendorPortalLayout,
  type VendorPortalSection,
} from '@/components/smart-budget/vendor/VendorPortalLayout';
import { VendorCampaignsSection } from '@/components/offers/VendorCampaignsSection';
import { useSmartBudgetVendorAuth } from '@/providers/SmartBudgetVendorAuthProvider';
import { subscribeVendorWebPush } from '@/services/webPushService';

const SEEN_LEADS_STORAGE_KEY = 'sb_vendor_seen_lead_ids';

function readSeenLeadIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(SEEN_LEADS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    return new Set(Array.isArray(parsed) ? parsed.map(Number).filter((n) => n > 0) : []);
  } catch {
    return new Set();
  }
}

function writeSeenLeadIds(ids: Set<number>) {
  try {
    sessionStorage.setItem(SEEN_LEADS_STORAGE_KEY, JSON.stringify([...ids].slice(-80)));
  } catch {
    /* ignore */
  }
}

function notesWithoutWebsiteFare(notes?: string | null): string | null {
  if (!notes) return null;
  const cleaned = notes
    .split('·')
    .map((p) => p.trim())
    .filter((p) => p && !/website\s*fare/i.test(p))
    .join(' · ');
  return cleaned || null;
}

const PROFILE_DOC_FIELDS = [
  { key: 'pan', label: 'PAN' },
  { key: 'aadhaar', label: 'Aadhaar' },
  { key: 'rc', label: 'RC' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'dl', label: 'Driving licence' },
  { key: 'pollution', label: 'Pollution' },
  { key: 'permit', label: 'Permit' },
] as const;

type ProfileDocKey = (typeof PROFILE_DOC_FIELDS)[number]['key'];

function ComingSoon({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This section is part of the full vendor portal roadmap. Live marketplace requests and profile
          metrics are available now from Dashboard and Requests.
        </p>
      </CardContent>
    </Card>
  );
}

function ReliabilityCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-base font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function VendorProfileSection({
  vendor,
  onUpdated,
}: {
  vendor: SmartBudgetVendor | null;
  onUpdated: (v: SmartBudgetVendor) => void;
}) {
  const [name, setName] = useState(vendor?.name || '');
  const [email, setEmail] = useState(vendor?.email || '');
  const [acceptAnyVehicleType, setAcceptAnyVehicleType] = useState(
    Boolean(vendor?.accept_any_vehicle_type)
  );
  const [profileUrl, setProfileUrl] = useState(vendor?.profile_image_url || '');
  const [docs, setDocs] = useState<Partial<Record<ProfileDocKey, string>>>({
    pan: vendor?.documents?.pan || undefined,
    aadhaar: vendor?.documents?.aadhaar || undefined,
    rc: vendor?.documents?.rc || undefined,
    insurance: vendor?.documents?.insurance || undefined,
    dl: vendor?.documents?.dl || undefined,
    pollution: vendor?.documents?.pollution || undefined,
    permit: vendor?.documents?.permit || undefined,
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(vendor?.name || '');
    setEmail(vendor?.email || '');
    setAcceptAnyVehicleType(Boolean(vendor?.accept_any_vehicle_type));
    setProfileUrl(vendor?.profile_image_url || '');
    setDocs({
      pan: vendor?.documents?.pan || undefined,
      aadhaar: vendor?.documents?.aadhaar || undefined,
      rc: vendor?.documents?.rc || undefined,
      insurance: vendor?.documents?.insurance || undefined,
      dl: vendor?.documents?.dl || undefined,
      pollution: vendor?.documents?.pollution || undefined,
      permit: vendor?.documents?.permit || undefined,
    });
  }, [vendor]);

  const uploadFile = async (key: string, file: File | null) => {
    if (!file) return;
    setUploading(key);
    try {
      const url = await uploadSmartBudgetVendorFile(file, `sb-vendor-${key}`);
      if (key === 'profile') setProfileUrl(url);
      else setDocs((d) => ({ ...d, [key]: url }));
      toast.success('Uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const save = async (submitForReview: boolean) => {
    setSaving(true);
    try {
      // Only send newly changed photo/docs — resending locked URLs used to block Save.
      const profileChanged =
        Boolean(profileUrl) && profileUrl !== (vendor?.profile_image_url || '');
      const changedDocs: Partial<Record<ProfileDocKey, string>> = {};
      (Object.keys(docs) as ProfileDocKey[]).forEach((key) => {
        const next = docs[key];
        if (!next) return;
        const current = vendor?.documents?.[key] || '';
        if (next !== current && (vendor?.document_reviews?.[key]?.can_upload ?? !current)) {
          changedDocs[key] = next;
        }
      });

      const updated = await smartBudgetAPI.vendor.updateOnboarding({
        name: name.trim() || undefined,
        email: email.trim() || null,
        profile_image_url: profileChanged ? profileUrl : undefined,
        accept_any_vehicle_type: acceptAnyVehicleType,
        documents: Object.keys(changedDocs).length ? changedDocs : undefined,
        submit_for_review: submitForReview,
      });
      onUpdated(updated);
      toast.success(
        submitForReview
          ? 'Submitted for admin verification'
          : 'Profile saved'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const status = vendor?.verification_status || 'pending';

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>
            Account details, vehicle info, and KYC documents. Go-live only after admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            {profileUrl ? (
              <SmartBudgetMediaImage
                url={profileUrl}
                alt=""
                className="h-16 w-16 rounded-full border object-cover"
                fallback={
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-slate-50 text-[10px] text-muted-foreground">
                    Photo
                  </div>
                }
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-slate-50 text-[10px] text-muted-foreground">
                Photo
              </div>
            )}
            {(vendor?.document_reviews?.profile?.can_upload ?? !profileUrl) ? (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs">
                <Upload className="h-3.5 w-3.5" />
                {uploading === 'profile' ? 'Uploading…' : profileUrl ? 'Re-upload photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={Boolean(uploading)}
                  onChange={(e) => void uploadFile('profile', e.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <p className="text-[11px] text-muted-foreground">Profile photo locked (read-only)</p>
            )}
            {vendor?.document_reviews?.profile?.reason && (
              <p className="w-full text-[11px] text-amber-800">{vendor.document_reviews.profile.reason}</p>
            )}
            <Badge variant="outline" className="capitalize">
              {status.replace('_', ' ')}
            </Badge>
            <Badge variant={vendor?.is_active ? 'default' : 'secondary'}>
              {vendor?.is_active ? 'Live' : 'Offline'}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input className="h-9" value={vendor?.phone || ''} disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                className="h-9"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tier</Label>
              <Input className="h-9 capitalize" value={vendor?.tier || 'silver'} disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vehicle type</Label>
              <Input
                className="h-9"
                value={vendor?.primary_vehicle_type || '—'}
                disabled
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vehicle number</Label>
              <Input
                className="h-9 uppercase"
                value={vendor?.primary_vehicle_number || '—'}
                disabled
              />
              <p className="text-[11px] text-muted-foreground">
                Vehicle details are locked after signup. Contact admin to change them.
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trip matching
            </p>
            <p className="text-[11px] text-muted-foreground">
              Choose which marketplace trips you want to receive. Your primary vehicle is still used
              for KYC and trip assignment.
            </p>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5">
                <input
                  type="radio"
                  className="mt-1"
                  name="trip-match-pref"
                  checked={!acceptAnyVehicleType}
                  onChange={() => setAcceptAnyVehicleType(false)}
                />
                <span>
                  <span className="block text-sm font-medium">Only my vehicle type</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Show trips that match{' '}
                    {vendor?.primary_vehicle_type || 'your primary vehicle'} only.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5">
                <input
                  type="radio"
                  className="mt-1"
                  name="trip-match-pref"
                  checked={acceptAnyVehicleType}
                  onChange={() => setAcceptAnyVehicleType(true)}
                />
                <span>
                  <span className="block text-sm font-medium">Any vehicle type</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Receive every open trip, even if the customer asked for a different cab.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Documents
            </p>
            <p className="text-[11px] text-muted-foreground">
              After upload, documents stay read-only. You can re-upload only when admin rejects a
              photo or marks insurance / pollution / permit as expired.
            </p>
            {PROFILE_DOC_FIELDS.map((doc) => {
              const review = vendor?.document_reviews?.[doc.key];
              const canUpload = review?.can_upload ?? !docs[doc.key];
              const docStatus = review?.status || (docs[doc.key] ? 'uploaded' : 'missing');
              return (
                <div
                  key={doc.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"
                >
                  <div>
                    <p className="text-xs font-medium">{doc.label}</p>
                    <p className="text-[11px] capitalize text-muted-foreground">
                      {docStatus.replace('_', ' ')}
                      {review?.locked ? ' · locked' : ''}
                      {review?.expires_at ? ` · expires ${review.expires_at}` : ''}
                    </p>
                    {review?.reason && (
                      <p className="text-[11px] text-amber-800 mt-0.5">{review.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {docs[doc.key] && <SmartBudgetMediaViewLink url={docs[doc.key]!} />}
                    {canUpload ? (
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
                        <Upload className="h-3 w-3" />
                        {uploading === doc.key ? '…' : docs[doc.key] ? 'Re-upload' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          disabled={Boolean(uploading)}
                          onChange={(e) => void uploadFile(doc.key, e.target.files?.[0] ?? null)}
                        />
                      </label>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Read-only</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving || Boolean(uploading)}
              onClick={() => void save(false)}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save profile
            </Button>
            {status !== 'approved' && (
              <Button
                type="button"
                className="bg-emerald-700 hover:bg-emerald-800"
                disabled={saving || Boolean(uploading)}
                onClick={() => void save(true)}
              >
                Submit for admin verification
              </Button>
            )}
            {status !== 'approved' && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/smart-budget/vendor/onboarding">Open onboarding</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VendorVehiclesSection({
  vendor,
  onUpdated,
}: {
  vendor: SmartBudgetVendor | null;
  onUpdated: (v: SmartBudgetVendor) => void;
}) {
  const [acceptAnyVehicleType, setAcceptAnyVehicleType] = useState(
    Boolean(vendor?.accept_any_vehicle_type)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAcceptAnyVehicleType(Boolean(vendor?.accept_any_vehicle_type));
  }, [vendor]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await smartBudgetAPI.vendor.updateOnboarding({
        accept_any_vehicle_type: acceptAnyVehicleType,
      });
      onUpdated(updated);
      toast.success(
        acceptAnyVehicleType
          ? 'You will now receive trips for every vehicle type'
          : 'You will only receive trips for your vehicle type'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const primaryType = vendor?.primary_vehicle_type || 'your primary vehicle';

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Vehicles</CardTitle>
        <CardDescription>
          Primary vehicle for KYC, plus which trip types you want on the marketplace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Vehicle type</p>
            <p className="font-medium">{vendor?.primary_vehicle_type || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vehicle number</p>
            <p className="font-medium">{vendor?.primary_vehicle_number || '—'}</p>
          </div>
        </div>
        {!vendor?.accept_any_vehicle_type && (
          <div className="flex flex-wrap gap-2">
            {(vendor?.vehicle_types || []).map((type) => (
              <Badge key={type} variant="secondary">
                {type}
              </Badge>
            ))}
          </div>
        )}
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trip matching
          </p>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5">
            <input
              type="radio"
              className="mt-1"
              name="vehicles-trip-match-pref"
              checked={!acceptAnyVehicleType}
              onChange={() => setAcceptAnyVehicleType(false)}
            />
            <span>
              <span className="block text-sm font-medium">Only my vehicle type</span>
              <span className="block text-[11px] text-muted-foreground">
                Show trips that match {primaryType} only.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5">
            <input
              type="radio"
              className="mt-1"
              name="vehicles-trip-match-pref"
              checked={acceptAnyVehicleType}
              onChange={() => setAcceptAnyVehicleType(true)}
            />
            <span>
              <span className="block text-sm font-medium">Any vehicle type</span>
              <span className="block text-[11px] text-muted-foreground">
                Receive every open trip, even if the customer asked for a different cab.
              </span>
            </span>
          </label>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save matching preference
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Vehicle type and number are locked after signup. Contact admin to change them. Update KYC
          documents from Profile when unlocked.
        </p>
      </CardContent>
    </Card>
  );
}

function VendorDashboard() {
  const { vendor, isAuthenticated, isLoading, logout } = useSmartBudgetVendorAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<VendorPortalSection>('dashboard');
  const [profile, setProfile] = useState<SmartBudgetVendor | null>(vendor);
  const [leads, setLeads] = useState<SmartBudgetLead[]>([]);
  const [popupLead, setPopupLead] = useState<SmartBudgetLead | null>(null);
  const seenLeadIdsRef = useRef<Set<number>>(readSeenLeadIds());
  const [bookings, setBookings] = useState<SmartBudgetSession[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const me = await smartBudgetAPI.vendor.me();
      setProfile(me);
      smartBudgetVendorStorage.setVendor(me);
    } catch {
      /* keep stored vendor */
    }
  }, []);

  const markLeadSeen = useCallback((sessionId: number) => {
    seenLeadIdsRef.current.add(sessionId);
    writeSeenLeadIds(seenLeadIdsRef.current);
  }, []);

  const dismissLeadPopup = useCallback(() => {
    setPopupLead((current) => {
      if (current) markLeadSeen(current.session_id);
      return null;
    });
  }, [markLeadSeen]);

  const loadLeads = useCallback(async () => {
    try {
      const list = await smartBudgetAPI.vendor.listOpenLeads();
      setLeads(list);
      setError(null);

      const unseen = list.filter((lead) => !seenLeadIdsRef.current.has(lead.session_id));
      if (unseen.length > 0) {
        setPopupLead((current) => current ?? unseen[0]);
        if (list.length > 0) {
          try {
            if (sessionStorage.getItem('sb_vendor_lead_toast') !== String(unseen[0].session_id)) {
              sessionStorage.setItem('sb_vendor_lead_toast', String(unseen[0].session_id));
              toast.message('New booking request', {
                description: `${unseen[0].pickup} → ${unseen[0].drop_location}`,
              });
            }
          } catch {
            /* ignore */
          }
        }
      } else {
        setPopupLead((current) => {
          if (!current) return null;
          return list.some((l) => l.session_id === current.session_id) ? current : null;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      const list = await smartBudgetAPI.vendor.listMyBookings();
      setBookings(list);
    } catch {
      /* bookings endpoint may be pending deploy */
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoadingLeads(true);
    setLoadingBookings(true);
    await Promise.all([loadProfile(), loadLeads(), loadBookings()]);
  }, [loadBookings, loadLeads, loadProfile]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setProfile(vendor);
    void refreshAll();
    void subscribeVendorWebPush().then((result) => {
      if (!result.ok) return;
      try {
        if (sessionStorage.getItem('sb_vendor_push_toast') === '1') return;
        sessionStorage.setItem('sb_vendor_push_toast', '1');
      } catch {
        /* ignore */
      }
      toast.message('Trip alerts enabled', {
        description: 'You will get a browser notification when a customer posts a trip.',
      });
    });
    const id = window.setInterval(() => {
      void loadLeads();
      void loadBookings();
    }, SMART_BUDGET_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isAuthenticated, vendor, refreshAll, loadLeads, loadBookings]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/smart-budget/vendor/login" replace />;
  }

  const handleAccept = async (sessionId: number) => {
    const balance = Number((profile || vendor)?.wallet_balance ?? 0);
    if (balance < 0) {
      toast.error(
        `Minus balance ₹${Math.abs(balance).toLocaleString('en-IN')}. Pay Vizag Taxi Hub to clear it before accepting.`
      );
      return;
    }
    setActingId(sessionId);
    try {
      await smartBudgetAPI.vendor.acceptLead(sessionId);
      markLeadSeen(sessionId);
      setPopupLead(null);
      setLeads((prev) => prev.filter((l) => l.session_id !== sessionId));
      toast.success('Lead claimed — customer will get a WhatsApp alert to pay the unlock fee');
      await loadBookings();
      navigate(`/smart-budget/vendor/leads/${sessionId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Accept failed';
      toast.error(
        msg.includes('claim') || msg.includes('closed') || msg.includes('already')
          ? 'Already claimed by another vendor'
          : msg
      );
      await loadLeads();
      await loadProfile();
    } finally {
      setActingId(null);
    }
  };

  const handleSkip = async (sessionId: number) => {
    setActingId(sessionId);
    try {
      await smartBudgetAPI.vendor.skipLead(sessionId);
      markLeadSeen(sessionId);
      toast.message('Lead skipped');
      setLeads((prev) => prev.filter((l) => l.session_id !== sessionId));
      setPopupLead((current) => (current?.session_id === sessionId ? null : current));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Skip failed');
    } finally {
      setActingId(null);
    }
  };

  const awaitingFeeBookings = bookings.filter((b) => isSmartBudgetAwaitingFee(b));

  const renderBookings = () => {
    if (loadingBookings) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        </div>
      );
    }
    if (bookings.length === 0) {
      return (
        <Card className="shadow-none">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No accepted bookings yet. When you accept a request, it moves here — even before the
            customer pays the 10% unlock fee.
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-3">
        {bookings.map((booking) => {
          const awaiting = isSmartBudgetAwaitingFee(booking);
          return (
            <div
              key={booking.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                awaiting ? 'border-amber-300' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {booking.pickup} → {booking.drop_location}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.vehicle_type} · {booking.passengers} pax ·{' '}
                    {new Date(booking.trip_datetime).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {formatSmartBudgetStatus(booking.status)}
                  </Badge>
                  <Badge
                    className={
                      awaiting
                        ? 'bg-amber-100 text-amber-950 hover:bg-amber-100'
                        : 'bg-emerald-700'
                    }
                  >
                    {formatSmartBudgetFeeLabel(booking)}
                  </Badge>
                </div>
              </div>
              {awaiting && (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  Customer has not paid the 10% unlock fee yet. You can chat, but full phone numbers
                  stay masked until payment clears.
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {booking.customer_budget != null && (
                  <span>Budget ₹{Number(booking.customer_budget).toLocaleString('en-IN')}</span>
                )}
                {booking.booking_fee_amount != null && (
                  <span>· Fee ₹{Number(booking.booking_fee_amount).toLocaleString('en-IN')}</span>
                )}
              </div>
              <div className="mt-4">
                <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
                  <Link to={`/smart-budget/vendor/leads/${booking.id}`}>
                    {awaiting ? 'Open chat (awaiting fee)' : 'Open booking'}
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const activeVendor = profile || vendor;
  const isLive =
    activeVendor?.verification_status === 'approved' && Boolean(activeVendor?.is_active);
  const stats = activeVendor?.stats;
  const walletBalance = Number(activeVendor?.wallet_balance ?? 0);
  const acceptance =
    stats?.computed_acceptance_rate ??
    activeVendor?.acceptance_rate ??
    0;
  const cancellation = activeVendor?.cancellation_rate ?? 0;
  const onTime = activeVendor?.on_time_rate ?? 100;
  const tripsCompleted =
    stats?.completed_sessions ?? activeVendor?.trips_completed ?? 0;
  const rating = Number(activeVendor?.rating ?? 0);

  const renderRequests = (compact = false) => {
    if (loadingLeads) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        </div>
      );
    }
    if (leads.length === 0) {
      return (
        <Card className="shadow-none">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No open budget leads right now. Matching customer trips appear here automatically when
            your vehicle type fits the request.
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-3">
        {leads.slice(0, compact ? 3 : leads.length).map((lead) => (
          <div key={lead.id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {lead.pickup} → {lead.drop_location}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lead.vehicle_type} · {lead.passengers} pax ·{' '}
                  {new Date(lead.trip_datetime).toLocaleString('en-IN')}
                </p>
              </div>
              <Badge className="bg-emerald-700">
                Budget ₹{Number(lead.customer_budget).toLocaleString('en-IN')}
              </Badge>
            </div>
            {notesWithoutWebsiteFare(lead.special_requests) && (
              <p className="mt-2 text-sm text-slate-600">
                {notesWithoutWebsiteFare(lead.special_requests)}
              </p>
            )}
            {lead.marketplace_expires_at && (
              <div className="mt-3">
                <SmartBudgetCountdown expiresAt={lead.marketplace_expires_at} label="Closes" />
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                className="bg-emerald-700 hover:bg-emerald-800"
                disabled={actingId === lead.session_id || walletBalance < 0}
                onClick={() => void handleAccept(lead.session_id)}
              >
                {actingId === lead.session_id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {walletBalance < 0 ? 'Clear balance to accept' : 'Accept'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={actingId === lead.session_id}
                onClick={() => void handleSkip(lead.session_id)}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Skip
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/smart-budget/vendor/leads/${lead.session_id}`}>Details</Link>
              </Button>
            </div>
          </div>
        ))}
        {compact && leads.length > 3 && (
          <Button type="button" variant="outline" onClick={() => setSection('requests')}>
            View all {leads.length} requests
          </Button>
        )}
      </div>
    );
  };

  let body: ReactNode = null;
  switch (section) {
    case 'dashboard':
      body = (
        <div className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not load leads</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLive && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-950">
              <AlertTitle>Profile not live yet</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-2">
                <span>
                  Upload KYC documents and wait for admin approval before receiving marketplace
                  requests.
                </span>
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <Link to="/smart-budget/vendor/onboarding">Complete onboarding</Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setSection('profile')}
                >
                  View profile
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {walletBalance < 0 && (
            <Alert variant="destructive">
              <AlertTitle>Minus balance — accepts blocked</AlertTitle>
              <AlertDescription>
                Your wallet is −₹
                {Math.abs(walletBalance).toLocaleString('en-IN')}. Pay this amount to Vizag Taxi Hub
                and ask admin to clear your balance before you can accept new rides.
              </AlertDescription>
            </Alert>
          )}

          <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-none">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-800">
                  Reliability score
                </p>
                <p className="mt-0.5 text-2xl font-bold text-slate-900">
                  {rating.toFixed(1)}
                  <span className="text-sm font-medium text-slate-500"> / 5</span>
                </p>
                <p className="mt-0.5 text-xs text-emerald-900">
                  {(activeVendor?.tier || 'silver').toUpperCase()} partner ·{' '}
                  {activeVendor?.verification_status === 'approved'
                    ? 'Verified & live'
                    : activeVendor?.verification_status || 'Pending verification'}
                </p>
              </div>
              <div className="rounded-lg border bg-white px-3 py-2 text-xs">
                <p className="text-muted-foreground">Open requests</p>
                <p className="text-xl font-semibold text-emerald-800">{leads.length}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                <p className="text-amber-900/70">Awaiting fee</p>
                <p className="text-xl font-semibold text-amber-950">{awaitingFeeBookings.length}</p>
              </div>
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  walletBalance < 0 ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              >
                <p className={walletBalance < 0 ? 'text-red-800/70' : 'text-muted-foreground'}>
                  {walletBalance < 0 ? 'Minus balance' : 'Wallet balance'}
                </p>
                <p
                  className={`text-xl font-semibold ${
                    walletBalance < 0 ? 'text-red-700' : 'text-slate-900'
                  }`}
                >
                  {walletBalance < 0 ? '−' : ''}₹
                  {Math.abs(walletBalance).toLocaleString('en-IN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </p>
                {walletBalance < 0 && (
                  <p className="mt-0.5 text-[10px] text-red-800/80">
                    Pay company to clear · then accepts unlock
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReliabilityCard label="Acceptance rate" value={`${Number(acceptance).toFixed(0)}%`} />
            <ReliabilityCard label="Cancellation rate" value={`${Number(cancellation).toFixed(0)}%`} />
            <ReliabilityCard label="On-time arrival" value={`${Number(onTime).toFixed(0)}%`} />
            <ReliabilityCard label="Trips completed" value={String(tripsCompleted)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ReliabilityCard
              label="Claimed sessions"
              value={String(stats?.claimed_sessions ?? 0)}
            />
            <ReliabilityCard label="Open trips" value={String(stats?.open_sessions ?? 0)} />
            <ReliabilityCard
              label="Offers accepted"
              value={`${stats?.offers_accepted ?? 0}/${stats?.offers_received ?? 0}`}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Awaiting customer fee</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSection('bookings')}>
                My bookings
              </Button>
            </div>
            {awaitingFeeBookings.length === 0 ? (
              <Card className="shadow-none">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  No accepted trips waiting on payment.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {awaitingFeeBookings.slice(0, 3).map((booking) => (
                  <Link
                    key={booking.id}
                    to={`/smart-budget/vendor/leads/${booking.id}`}
                    className="block rounded-xl border border-amber-200 bg-amber-50/80 p-3 transition hover:border-amber-400"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        {booking.pickup} → {booking.drop_location}
                      </p>
                      <Badge className="bg-amber-100 text-amber-950 hover:bg-amber-100 text-[10px]">
                        Awaiting 10% fee
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-amber-950/70">
                      Chat open · contacts masked until customer pays
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Live requests</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSection('requests')}>
                Open requests
              </Button>
            </div>
            {renderRequests(true)}
          </div>
        </div>
      );
      break;
    case 'requests':
      body = !isLive ? (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <AlertTitle>Requests unlock after verification</AlertTitle>
          <AlertDescription>
            Your account must be approved by Vizag Taxi Hub before live leads appear.{' '}
            <Link className="underline" to="/smart-budget/vendor/onboarding">
              Upload documents
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not load leads</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">
            Accept a lead to open chat. First vendor to accept wins — others lose access.
          </p>
          {renderRequests(false)}
        </div>
      );
      break;
    case 'bookings':
      body = (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Accepted trips stay here. If the customer has not paid the 10% fee yet, contacts stay
            masked and the booking shows <strong>Awaiting 10% fee</strong>.
          </p>
          {renderBookings()}
        </div>
      );
      break;
    case 'earnings':
      body = (
        <ComingSoon
          title="Earnings"
          detail="Settlements, invoices, and payout history for completed marketplace trips."
        />
      );
      break;
    case 'campaigns':
      body = <VendorCampaignsSection vendor={activeVendor} />;
      break;
    case 'vehicles':
      body = (
        <VendorVehiclesSection
          vendor={activeVendor}
          onUpdated={(next) => {
            setProfile(next);
            smartBudgetVendorStorage.setVendor(next);
          }}
        />
      );
      break;
    case 'drivers':
      body = (
        <ComingSoon
          title="Drivers"
          detail="Add driver licence, photo, and assignment details for assigned trips."
        />
      );
      break;
    case 'profile':
      body = (
        <VendorProfileSection
          vendor={activeVendor}
          onUpdated={(next) => {
            setProfile(next);
            smartBudgetVendorStorage.setVendor(next);
          }}
        />
      );
      break;
    case 'reports':
      body = (
        <ComingSoon
          title="Reports"
          detail="Acceptance, cancellations, and trip performance reports will appear here."
        />
      );
      break;
    case 'support':
      body = (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Support</CardTitle>
            <CardDescription>Need help with a lead or account?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Contact Vizag Taxi Hub operations for Smart Budget issues.</p>
            <p className="text-muted-foreground">
              Reminders: do not share customer contacts before unlock fee, and keep chat on-platform.
            </p>
          </CardContent>
        </Card>
      );
      break;
    default: {
      const _exhaustive: never = section;
      body = _exhaustive;
      break;
    }
  }

  return (
    <VendorPortalLayout
      vendor={activeVendor}
      section={section}
      onSectionChange={setSection}
      requestCount={leads.length}
      bookingCount={awaitingFeeBookings.length}
      onRefresh={() => void refreshAll()}
      onLogout={() => {
        logout();
        navigate('/smart-budget/vendor/login');
      }}
    >
      {body}

      <Dialog
        open={popupLead != null}
        onOpenChange={(open) => {
          if (!open) dismissLeadPopup();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New booking request</DialogTitle>
            <DialogDescription>
              A customer trip is waiting. Accept now to claim it before other vendors.
            </DialogDescription>
          </DialogHeader>
          {popupLead && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-base">
                  {popupLead.pickup} → {popupLead.drop_location}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {popupLead.vehicle_type} · {popupLead.passengers} pax
                </p>
                <p className="text-muted-foreground">
                  Pickup{' '}
                  {popupLead.trip_datetime
                    ? new Date(popupLead.trip_datetime).toLocaleString('en-IN')
                    : 'TBD'}
                </p>
              </div>
              <Badge className="bg-emerald-700">
                Budget ₹{Number(popupLead.customer_budget).toLocaleString('en-IN')}
              </Badge>
              {notesWithoutWebsiteFare(popupLead.special_requests) && (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-700">
                  {notesWithoutWebsiteFare(popupLead.special_requests)}
                </p>
              )}
              {popupLead.marketplace_expires_at && (
                <SmartBudgetCountdown
                  expiresAt={popupLead.marketplace_expires_at}
                  label="Closes"
                />
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={dismissLeadPopup}>
              Later
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!popupLead || actingId === popupLead.session_id}
              onClick={() => {
                if (!popupLead) return;
                void handleSkip(popupLead.session_id);
              }}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip
            </Button>
            <Button
              type="button"
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={
                !popupLead || actingId === popupLead.session_id || walletBalance < 0
              }
              onClick={() => {
                if (!popupLead) return;
                void handleAccept(popupLead.session_id);
              }}
            >
              {popupLead && actingId === popupLead.session_id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {walletBalance < 0 ? 'Clear balance first' : 'Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendorPortalLayout>
  );
}

export default function SmartBudgetVendorDashboardPage() {
  return <VendorDashboard />;
}
