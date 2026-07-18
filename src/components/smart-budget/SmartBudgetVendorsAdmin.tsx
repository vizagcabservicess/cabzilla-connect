import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AdminMediaImage, AdminMediaViewLink } from '@/components/admin/AdminMediaImage';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import type {
  SmartBudgetDocKey,
  SmartBudgetVendor,
  SmartBudgetVendorSummary,
  SmartBudgetVendorTier,
  SmartBudgetVendorVerification,
} from '@/types/smartBudget';

const KYC_DOC_ROWS: Array<{ key: SmartBudgetDocKey; label: string; expiry?: boolean }> = [
  { key: 'profile', label: 'Profile photo' },
  { key: 'pan', label: 'PAN' },
  { key: 'aadhaar', label: 'Aadhaar' },
  { key: 'rc', label: 'RC' },
  { key: 'insurance', label: 'Insurance', expiry: true },
  { key: 'dl', label: 'DL' },
  { key: 'pollution', label: 'Pollution', expiry: true },
  { key: 'permit', label: 'Permit', expiry: true },
];

const VEHICLE_TYPE_OPTIONS = [
  'Swift Dzire',
  'Toyota Glanza',
  'Honda Amaze',
  'Ertiga',
  'Innova Crysta',
  'Tempo Traveller',
  'Urbania',
  'Sedan',
  'SUV',
];

/** Native select — avoids Radix RemoveScroll locking the page scrollbar. */
const SB_NATIVE_SELECT =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function verificationLabel(status: SmartBudgetVendorVerification | undefined): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'more_docs':
      return 'More docs';
    default:
      return 'Approved';
  }
}

function tierLabel(tier: SmartBudgetVendorTier | undefined): string {
  switch (tier) {
    case 'gold':
      return 'Gold';
    case 'platinum':
      return 'Platinum';
    case 'silver':
    default:
      return 'Silver';
  }
}

function vendorPortalUrl(): string {
  if (typeof window === 'undefined') return '/smart-budget/vendor/login';
  return `${window.location.origin}/smart-budget/vendor/login`;
}

export function SmartBudgetVendorsAdmin() {
  const [vendors, setVendors] = useState<SmartBudgetVendor[]>([]);
  const [summary, setSummary] = useState<SmartBudgetVendorSummary | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [reviewDocKey, setReviewDocKey] = useState<SmartBudgetDocKey | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewExpiry, setReviewExpiry] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    rating: '5',
    tier: 'silver' as SmartBudgetVendorTier,
    verification_status: 'approved' as SmartBudgetVendorVerification,
    is_active: true,
    notes: '',
    vehicle_types: [] as string[],
    accept_any_vehicle_type: true,
  });

  const selected = vendors.find((v) => v.id === selectedId) ?? null;

  const handleDocReview = async (
    docKey: SmartBudgetDocKey,
    review_action: 'approve' | 'reject' | 'request_reupload' | 'mark_expired' | 'set_expiry'
  ) => {
    if (!selected) return;
    if (
      (review_action === 'reject' || review_action === 'request_reupload' || review_action === 'mark_expired') &&
      !reviewReason.trim() &&
      reviewDocKey === docKey
    ) {
      toast.error('Enter a reason for the vendor');
      return;
    }
    if (review_action === 'set_expiry' && !reviewExpiry) {
      toast.error('Set an expiry date');
      return;
    }
    setReviewing(true);
    try {
      const updated = await smartBudgetAPI.admin.reviewVendorDocument({
        vendor_id: selected.id,
        doc_key: docKey,
        review_action,
        reason: reviewReason.trim() || undefined,
        expires_at: reviewExpiry || undefined,
      });
      setVendors((list) => list.map((v) => (v.id === updated.id ? updated : v)));
      setForm((f) => ({
        ...f,
        verification_status: updated.verification_status || f.verification_status,
        is_active: updated.is_active,
      }));
      setReviewDocKey(null);
      setReviewReason('');
      setReviewExpiry('');
      toast.success(
        updated.verification_status === 'approved'
          ? 'Document approved — vendor is now live'
          : review_action === 'approve'
            ? 'Document approved'
            : review_action === 'set_expiry'
              ? 'Expiry saved'
              : 'Vendor can re-upload this document'
      );
      if (updated.verification_status === 'approved') {
        window.dispatchEvent(new Event('sb-vendor-alerts-changed'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Review failed');
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await smartBudgetAPI.admin.listVendors({
        q: debouncedQuery || undefined,
        verification_status: filterStatus === 'all' ? undefined : filterStatus,
        limit: 200,
      });
      setVendors(result.vendors);
      setSummary(result.summary);
      setSelectedId((prev) => {
        if (prev && result.vendors.some((v) => v.id === prev)) return prev;
        return result.vendors[0]?.id ?? null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load vendors';
      setLoadError(message);
      setVendors([]);
      setSummary(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filterStatus]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  useEffect(() => {
    const onRefresh = () => void loadVendors();
    window.addEventListener('sb-admin-refresh-vendors', onRefresh);
    return () => window.removeEventListener('sb-admin-refresh-vendors', onRefresh);
  }, [loadVendors]);

  const fillFormFromVendor = (vendor: SmartBudgetVendor) => {
    setShowCreate(false);
    setTempPassword(null);
    const types = vendor.vehicle_types || [];
    const acceptAny =
      vendor.accept_any_vehicle_type === true ||
      (vendor.accept_any_vehicle_type !== false && types.length === 0);
    setForm({
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email || '',
      password: '',
      rating: String(vendor.rating ?? 5),
      tier: vendor.tier || 'silver',
      verification_status: vendor.verification_status || 'approved',
      is_active: vendor.is_active,
      notes: vendor.notes || '',
      vehicle_types: types,
      accept_any_vehicle_type: acceptAny,
    });
  };

  useEffect(() => {
    if (selected && !showCreate) fillFormFromVendor(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when selection changes
  }, [selectedId]);

  const toggleVehicleType = (type: string) => {
    setForm((f) => ({
      ...f,
      accept_any_vehicle_type: false,
      vehicle_types: f.vehicle_types.includes(type)
        ? f.vehicle_types.filter((t) => t !== type)
        : [...f.vehicle_types, type],
    }));
  };

  const startCreate = () => {
    setShowCreate(true);
    setSelectedId(null);
    setTempPassword(null);
    setForm({
      name: '',
      phone: '',
      email: '',
      password: '',
      rating: '5',
      tier: 'silver',
      verification_status: 'approved',
      is_active: true,
      notes: '',
      vehicle_types: [],
      accept_any_vehicle_type: true,
    });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    if (!form.accept_any_vehicle_type && form.vehicle_types.length === 0) {
      toast.error('Select at least one vehicle type, or choose Any vehicle type');
      return;
    }
    setSaving(true);
    try {
      const acceptAny = form.accept_any_vehicle_type;
      const vehicleTypes = acceptAny ? [] : form.vehicle_types;
      if (showCreate) {
        const created = await smartBudgetAPI.admin.createVendor({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          password: form.password.trim() || undefined,
          rating: Number(form.rating) || 5,
          tier: form.tier,
          verification_status: form.verification_status,
          is_active: form.is_active,
          notes: form.notes.trim() || null,
          vehicle_types: vehicleTypes,
          accept_any_vehicle_type: acceptAny,
        });
        setTempPassword(created.temporary_password);
        toast.success('Vendor created');
        setShowCreate(false);
        await loadVendors();
        setSelectedId(created.vendor.id);
      } else if (selected) {
        const updated = await smartBudgetAPI.admin.updateVendor({
          vendor_id: selected.id,
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          rating: Number(form.rating) || 5,
          tier: form.tier,
          verification_status: form.verification_status,
          is_active: form.is_active,
          notes: form.notes.trim() || null,
          vehicle_types: vehicleTypes,
          accept_any_vehicle_type: acceptAny,
        });
        toast.success('Vendor updated');
        await loadVendors();
        setSelectedId(updated.id);
        if (form.verification_status === 'approved') {
          window.dispatchEvent(new Event('sb-vendor-alerts-changed'));
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await smartBudgetAPI.admin.resetVendorPassword(selected.id);
      setTempPassword(result.temporary_password);
      toast.success('Temporary password generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const handleClearWallet = async () => {
    if (!selected) return;
    const bal = Number(selected.wallet_balance ?? 0);
    if (bal >= 0) {
      toast.message('Wallet is already clear');
      return;
    }
    const ok = window.confirm(
      `Mark wallet cleared for ${selected.name}? Current minus balance −₹${Math.abs(bal).toLocaleString('en-IN')} (only after they pay the company).`
    );
    if (!ok) return;
    setSaving(true);
    try {
      const updated = await smartBudgetAPI.admin.settleVendorWallet(selected.id);
      toast.success('Wallet cleared — vendor can accept rides again');
      await loadVendors();
      setSelectedId(updated.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Clear wallet failed');
    } finally {
      setSaving(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vendors dashboard
          </h2>
          <p className="text-xs text-muted-foreground">
            Onboard vendors, verify status, set Silver/Gold/Platinum tier, and open their portal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={vendorPortalUrl()} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Vendor login
            </a>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadVendors()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add vendor
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load vendors</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{loadError}</p>
            <p className="text-xs opacity-90">
              Redeploy <code>api/smart-budget/admin.php</code> + <code>db.php</code>, then run{' '}
              <code>sql/smart_budget_vendors_admin.sql</code> (and optionally{' '}
              <code>sql/smart_budget_seed_vendor.sql</code>) on MySQL.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {summary && (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Total', summary.total],
            ['Active', summary.active],
            ['Pending', summary.pending],
            ['Approved', summary.approved],
            ['More docs', summary.more_docs],
            ['Rejected', summary.rejected],
          ].map(([label, value]) => (
            <Card key={label as string} className="shadow-none">
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold">{value as number}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tempPassword && (
        <Card className="border-emerald-300 bg-emerald-50/60 shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-emerald-900">Temporary password</p>
              <p className="font-mono text-sm mt-1">{tempPassword}</p>
              <p className="text-xs text-emerald-800 mt-1">Share once, then ask the vendor to change it after first login.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copyText(tempPassword, 'Password')}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vendor list</CardTitle>
            <CardDescription className="text-xs">Search, filter, and select a vendor to manage.</CardDescription>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Input
                className="h-9 text-sm"
                placeholder="Search name, phone, email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className={`${SB_NATIVE_SELECT} sm:w-44`}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter by verification status"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="more_docs">More docs</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[32rem] overflow-y-auto">
            {loading && vendors.length === 0 ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : vendors.length === 0 ? (
              <div className="space-y-2 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {debouncedQuery || filterStatus !== 'all'
                    ? 'No vendors match this search/filter.'
                    : 'No vendors yet. Add one to get started.'}
                </p>
                {!debouncedQuery && filterStatus === 'all' && (
                  <p className="text-[11px] text-muted-foreground px-4">
                    If Demo Vendor already logs in, redeploy Smart Budget PHP — the list API may be outdated on the server.
                  </p>
                )}
              </div>
            ) : (
              vendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(vendor.id);
                    setShowCreate(false);
                    fillFormFromVendor(vendor);
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition hover:border-emerald-400 ${
                    !showCreate && selectedId === vendor.id ? 'border-emerald-600 bg-emerald-50/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {vendor.phone}
                        {vendor.email ? ` · ${vendor.email}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={vendor.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {tierLabel(vendor.tier)}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    <span>{verificationLabel(vendor.verification_status)}</span>
                    <span>·</span>
                    <span>★ {Number(vendor.rating).toFixed(1)}</span>
                    {vendor.stats && (
                      <>
                        <span>·</span>
                        <span>{vendor.stats.claimed_sessions} claimed</span>
                        <span>·</span>
                        <span>{vendor.stats.completed_sessions} done</span>
                      </>
                    )}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{showCreate ? 'Create vendor' : 'Vendor details'}</CardTitle>
            <CardDescription className="text-xs">
              {showCreate
                ? 'Creates login credentials for /smart-budget/vendor/login'
                : selected
                  ? `Vendor #${selected.id}`
                  : 'Select a vendor from the list'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showCreate && !selected ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Select or add a vendor.</p>
            ) : (
              <form className="space-y-3 text-sm" onSubmit={handleSave}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      className="h-9"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      className="h-9"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      className="h-9"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rating</Label>
                    <Input
                      className="h-9"
                      type="number"
                      min={1}
                      max={5}
                      step={0.1}
                      value={form.rating}
                      onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sb-v-verification">Verification</Label>
                    <select
                      id="sb-v-verification"
                      className={SB_NATIVE_SELECT}
                      value={form.verification_status}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          verification_status: e.target.value as SmartBudgetVendorVerification,
                        }))
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="more_docs">Requested more documents</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sb-v-tier">Tier</Label>
                    <select
                      id="sb-v-tier"
                      className={SB_NATIVE_SELECT}
                      value={form.tier}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tier: e.target.value as SmartBudgetVendorTier }))
                      }
                    >
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </div>
                </div>

                {showCreate && (
                  <div className="space-y-1.5">
                    <Label>Password (optional)</Label>
                    <Input
                      className="h-9"
                      type="text"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Leave blank to auto-generate"
                    />
                  </div>
                )}

                <div className="space-y-2 rounded-md border p-3">
                  <div>
                    <Label>Trip matching</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Admin can override what trips this vendor receives — same options as the vendor
                      portal.
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5">
                    <input
                      type="radio"
                      className="mt-1"
                      name="admin-trip-match"
                      checked={form.accept_any_vehicle_type}
                      onChange={() =>
                        setForm((f) => ({ ...f, accept_any_vehicle_type: true }))
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium">Any vehicle type</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Vendor receives every open trip (all cab types).
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5">
                    <input
                      type="radio"
                      className="mt-1"
                      name="admin-trip-match"
                      checked={!form.accept_any_vehicle_type}
                      onChange={() =>
                        setForm((f) => ({ ...f, accept_any_vehicle_type: false }))
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium">Only listed vehicle types</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Limit leads and WhatsApp alerts to the types checked below.
                      </span>
                    </span>
                  </label>
                  {!form.accept_any_vehicle_type && (
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs">Vehicle types</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {VEHICLE_TYPE_OPTIONS.map((type) => {
                          const on = form.vehicle_types.includes(type);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleVehicleType(type)}
                              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                                on
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                  : 'border-slate-200 text-slate-600'
                              }`}
                            >
                              {on && <Check className="mr-1 inline h-3 w-3" />}
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    className="text-sm"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Docs pending, bank details, internal remarks…"
                  />
                </div>

                {!showCreate && selected && (
                  <div className="rounded-md border bg-slate-50 p-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Onboarding / KYC</p>
                      <p className="text-[11px] text-muted-foreground">
                        Uploaded docs are read-only for the vendor. Reject or request re-upload when
                        unclear / not meeting terms. For insurance, pollution &amp; permit, set expiry
                        or mark expired so they can renew.
                      </p>
                      <p className="mt-1 text-[11px] text-slate-700">
                        Vehicle: {selected.primary_vehicle_type || '—'} ·{' '}
                        {selected.primary_vehicle_number || '—'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-700">
                        Trip matching:{' '}
                        {form.accept_any_vehicle_type
                          ? 'Any vehicle type'
                          : 'Only listed vehicle types'}
                        {form.accept_any_vehicle_type !==
                        (selected.accept_any_vehicle_type ||
                          (selected.vehicle_types || []).length === 0) ? (
                          <span className="text-amber-700"> · unsaved</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {KYC_DOC_ROWS.map(({ key, label, expiry }) => {
                        const url =
                          key === 'profile'
                            ? selected.profile_image_url
                            : selected.documents?.[key as keyof typeof selected.documents];
                        const review = selected.document_reviews?.[key];
                        const status = review?.status || (url ? 'uploaded' : 'missing');
                        return (
                          <div key={key} className="rounded-md border bg-white p-2.5 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-medium">{label}</p>
                                <p className="text-[11px] capitalize text-muted-foreground">
                                  {status.replace('_', ' ')}
                                  {review?.expires_at ? ` · expires ${review.expires_at}` : ''}
                                </p>
                                {review?.reason && (
                                  <p className="text-[11px] text-amber-800 mt-0.5">{review.reason}</p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {url ? (
                                  key === 'profile' ? (
                                    <AdminMediaImage
                                      url={url}
                                      alt={label}
                                      className="h-10 w-10 rounded-full border object-cover"
                                    />
                                  ) : (
                                    <AdminMediaViewLink url={url} />
                                  )
                                ) : (
                                  <span className="text-[11px] text-amber-800">Missing</span>
                                )}
                                {url && (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[11px]"
                                      disabled={reviewing}
                                      onClick={() => void handleDocReview(key, 'approve')}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 text-[11px]"
                                      disabled={reviewing}
                                      onClick={() => {
                                        setReviewDocKey(key);
                                        setReviewReason('');
                                      }}
                                    >
                                      Reject / re-upload
                                    </Button>
                                    {expiry && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        className="h-7 text-[11px]"
                                        disabled={reviewing}
                                        onClick={() => {
                                          setReviewDocKey(key);
                                          setReviewReason('Document expired — upload renewed copy');
                                          setReviewExpiry('');
                                        }}
                                      >
                                        Expire / set date
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {reviewDocKey === key && (
                              <div className="space-y-2 rounded border border-amber-200 bg-amber-50/80 p-2">
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Reason shown to vendor (unclear / expired / not meeting terms…)"
                                  value={reviewReason}
                                  onChange={(e) => setReviewReason(e.target.value)}
                                />
                                {expiry && (
                                  <Input
                                    className="h-8 text-xs"
                                    type="date"
                                    value={reviewExpiry}
                                    onChange={(e) => setReviewExpiry(e.target.value)}
                                  />
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 text-[11px]"
                                    disabled={reviewing}
                                    onClick={() => void handleDocReview(key, 'request_reupload')}
                                  >
                                    Request re-upload
                                  </Button>
                                  {expiry && (
                                    <>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        className="h-7 text-[11px]"
                                        disabled={reviewing}
                                        onClick={() => void handleDocReview(key, 'mark_expired')}
                                      >
                                        Mark expired
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[11px]"
                                        disabled={reviewing || !reviewExpiry}
                                        onClick={() => void handleDocReview(key, 'set_expiry')}
                                      >
                                        Save expiry
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-[11px]"
                                    onClick={() => setReviewDocKey(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {selected.onboarding_submitted_at && (
                      <p className="text-[11px] text-muted-foreground">
                        Submitted {selected.onboarding_submitted_at}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 p-2">
                      <p className="text-[11px] text-emerald-950 flex-1">
                        Overall status:{' '}
                        <strong className="capitalize">
                          {(selected.verification_status || 'pending').replace('_', ' ')}
                        </strong>
                        {selected.is_active ? ' · Active' : ' · Offline'}. Approving each document is
                        not enough — click below (or set Verification to Approved and Save) to go
                        live.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 bg-emerald-700 text-xs hover:bg-emerald-800"
                        disabled={
                          reviewing ||
                          saving ||
                          selected.verification_status === 'approved'
                        }
                        onClick={() => {
                          void (async () => {
                            setReviewing(true);
                            try {
                              const updated = await smartBudgetAPI.admin.approveVendorGoLive(
                                selected.id
                              );
                              setVendors((list) =>
                                list.map((v) => (v.id === updated.id ? updated : v))
                              );
                              setForm((f) => ({
                                ...f,
                                verification_status: 'approved',
                                is_active: true,
                              }));
                              toast.success('Vendor approved and live on marketplace');
                              window.dispatchEvent(new Event('sb-vendor-alerts-changed'));
                            } catch (error) {
                              toast.error(
                                error instanceof Error ? error.message : 'Go-live failed'
                              );
                            } finally {
                              setReviewing(false);
                            }
                          })();
                        }}
                      >
                        Approve vendor & go live
                      </Button>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        is_active: e.target.checked,
                        // Checking Active also sets overall verification to Approved on save
                        verification_status: e.target.checked
                          ? 'approved'
                          : f.verification_status === 'approved'
                            ? 'pending'
                            : f.verification_status,
                      }))
                    }
                  />
                  Active / go live (sets overall Verification to Approved when saved)
                </label>

                {!showCreate && selected?.stats && (
                  <div className="rounded-md border bg-slate-50 p-3 text-xs grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-muted-foreground">Acceptance</p>
                      <p className="font-semibold">
                        {selected.stats.computed_acceptance_rate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Offers</p>
                      <p className="font-semibold">
                        {selected.stats.offers_accepted}/{selected.stats.offers_received}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Open trips</p>
                      <p className="font-semibold">{selected.stats.open_sessions}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-semibold">{selected.stats.completed_sessions}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Wallet balance</p>
                      <p
                        className={`font-semibold ${
                          Number(selected.wallet_balance ?? 0) < 0 ? 'text-red-700' : ''
                        }`}
                      >
                        {Number(selected.wallet_balance ?? 0) < 0 ? '−' : ''}₹
                        {Math.abs(Number(selected.wallet_balance ?? 0)).toLocaleString('en-IN')}
                        {Number(selected.wallet_balance ?? 0) < 0
                          ? ' (accepts blocked until cleared)'
                          : ''}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {showCreate ? 'Create vendor' : 'Save changes'}
                  </Button>
                  {!showCreate && selected && (
                    <Button type="button" variant="outline" disabled={saving} onClick={() => void handleResetPassword()}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Reset password
                    </Button>
                  )}
                  {!showCreate && selected && Number(selected.wallet_balance ?? 0) < 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={saving}
                      onClick={() => void handleClearWallet()}
                    >
                      Clear minus balance
                    </Button>
                  )}
                  <Button type="button" variant="ghost" asChild>
                    <Link to="/smart-budget/vendor/login" target="_blank">
                      Open portal
                    </Link>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
