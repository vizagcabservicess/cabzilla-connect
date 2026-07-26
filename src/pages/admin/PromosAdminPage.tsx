import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ImagePlus,
  Loader2,
  Megaphone,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { sitePromoAPI, sitePromoDisplayUrl } from '@/services/api/sitePromoAPI';
import { uploadSmartBudgetVendorFile } from '@/lib/smartBudgetUpload';
import type { SitePromo } from '@/types/sitePromo';

const DURATION_PRESETS: Array<{ value: string; label: string; hours: number | null }> = [
  { value: '24', label: '24 hours', hours: 24 },
  { value: '48', label: '48 hours', hours: 48 },
  { value: '72', label: '3 days', hours: 72 },
  { value: '168', label: '7 days', hours: 168 },
  { value: '336', label: '14 days', hours: 336 },
  { value: '720', label: '30 days', hours: 720 },
  { value: 'custom', label: 'Custom end date…', hours: null },
  { value: 'none', label: 'No auto-expire', hours: null },
];

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function apiDateToLocalInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return toLocalInputValue(d);
}

function formatWhen(value?: string | null): string {
  if (!value) return '';
  try {
    return new Date(value.includes('T') ? value : value.replace(' ', 'T')).toLocaleString();
  } catch {
    return value;
  }
}

export default function PromosAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [promos, setPromos] = useState<SitePromo[]>([]);

  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewBlob, setPreviewBlob] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [durationPreset, setDurationPreset] = useState('72');
  const [expiresAt, setExpiresAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 72 * 3600 * 1000)),
  );
  const [editingId, setEditingId] = useState<number | null>(null);

  const previewSrc = useMemo(() => {
    if (previewBlob) return previewBlob;
    if (editingId && imageUrl) {
      return sitePromoDisplayUrl({ id: editingId });
    }
    return '';
  }, [previewBlob, imageUrl, editingId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await sitePromoAPI.admin.list();
      setPromos(list);
      // Hydrate thumbs via public getImage (works after db.php GCS fix; no media.php needed)
      void Promise.all(
        list.map(async (p) => {
          if (p.image_data_url?.startsWith('data:image/')) return p;
          const dataUrl = await sitePromoAPI.public.getImageDataUrl(p.id);
          return dataUrl ? { ...p, image_data_url: dataUrl } : p;
        }),
      ).then((hydrated) => setPromos(hydrated));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load promos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (previewBlob) URL.revokeObjectURL(previewBlob);
    };
  }, [previewBlob]);

  const resetForm = () => {
    setTitle('');
    setImageUrl('');
    if (previewBlob) URL.revokeObjectURL(previewBlob);
    setPreviewBlob(null);
    setLinkUrl('');
    setIsActive(true);
    setDurationPreset('72');
    setExpiresAt(toLocalInputValue(new Date(Date.now() + 72 * 3600 * 1000)));
    setEditingId(null);
  };

  const startEdit = (p: SitePromo) => {
    setEditingId(p.id);
    setTitle(p.title || '');
    setImageUrl(p.image_url || '');
    if (previewBlob) URL.revokeObjectURL(previewBlob);
    setPreviewBlob(null);
    setLinkUrl(p.link_url || '');
    setIsActive(Boolean(p.is_active));
    if (p.expires_at) {
      setDurationPreset('custom');
      setExpiresAt(apiDateToLocalInput(p.expires_at));
    } else {
      setDurationPreset('none');
      setExpiresAt('');
    }
  };

  const onUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    if (previewBlob) URL.revokeObjectURL(previewBlob);
    setPreviewBlob(localUrl);
    try {
      // Avoid "promo" in path — ad blockers often block those URLs
      const url = await uploadSmartBudgetVendorFile(file, 'site-banner');
      setImageUrl(url);
      toast.success('Image uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resolveExpiryPayload = (): {
    expires_at: string | null;
    duration_hours?: number;
  } => {
    if (durationPreset === 'none') {
      return { expires_at: null };
    }
    if (durationPreset === 'custom') {
      if (!expiresAt) {
        throw new Error('Choose an end date/time for the promo');
      }
      return { expires_at: expiresAt };
    }
    const hours = Number(durationPreset);
    if (!Number.isFinite(hours) || hours <= 0) {
      throw new Error('Invalid duration');
    }
    return {
      expires_at: toLocalInputValue(new Date(Date.now() + hours * 3600 * 1000)),
      duration_hours: hours,
    };
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      toast.error('Upload a banner image first');
      return;
    }
    setSaving(true);
    try {
      const expiry = resolveExpiryPayload();
      const payload = {
        title: title.trim(),
        image_url: imageUrl.trim(),
        link_url: linkUrl.trim() || null,
        is_active: isActive,
        expires_at: expiry.expires_at,
        duration_hours: expiry.duration_hours,
      };
      if (editingId) {
        await sitePromoAPI.admin.update({ id: editingId, ...payload });
        toast.success('Promo updated');
      } else {
        await sitePromoAPI.admin.create(payload);
        toast.success('Promo created');
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: SitePromo, next: boolean) => {
    try {
      await sitePromoAPI.admin.setActive(p.id, next);
      toast.success(next ? 'Promo is now live on the website' : 'Promo turned off');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const remove = async (p: SitePromo) => {
    if (!window.confirm(`Delete promo “${p.title || p.id}”?`)) return;
    try {
      await sitePromoAPI.admin.remove(p.id);
      if (editingId === p.id) resetForm();
      toast.success('Promo deleted');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <AdminLayout activeTab="promos">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-amber-600" />
              Promos
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Upload a banner image to show as a popup on the website. Only one promo can be active
              at a time; set a duration so it expires automatically.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {editingId ? `Edit promo #${editingId}` : 'New promo'}
              </CardTitle>
              <CardDescription>
                Recommended: tall/wide banner (e.g. 800×1000). JPG/PNG/WEBP under 5MB.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-title">Title (optional)</Label>
                  <Input
                    id="promo-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summer offer"
                    maxLength={160}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Banner image</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => document.getElementById('promo-file-input')?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1.5" />
                      )}
                      {uploading ? 'Uploading…' : 'Upload image'}
                    </Button>
                    <input
                      id="promo-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        void onUpload(e.target.files?.[0] || null);
                        e.target.value = '';
                      }}
                    />
                  </div>
                  {previewSrc ? (
                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <img
                        src={previewSrc}
                        alt="Banner preview"
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="mt-2 flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm gap-2">
                      <ImagePlus className="h-4 w-4" />
                      No image yet
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="promo-link">Click link (optional)</Label>
                  <Input
                    id="promo-link"
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://vizagtaxihub.com/airport-taxi"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Duration (auto-expire)</Label>
                  <Select
                    value={durationPreset}
                    onValueChange={(v) => {
                      setDurationPreset(v);
                      const preset = DURATION_PRESETS.find((p) => p.value === v);
                      if (preset?.hours) {
                        setExpiresAt(
                          toLocalInputValue(new Date(Date.now() + preset.hours * 3600 * 1000)),
                        );
                      } else if (v === 'none') {
                        setExpiresAt('');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="How long should this show?" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {durationPreset === 'custom' ? (
                    <div className="pt-1 space-y-1">
                      <Label htmlFor="promo-expires" className="text-xs text-slate-500">
                        End date & time
                      </Label>
                      <Input
                        id="promo-expires"
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        required
                      />
                    </div>
                  ) : durationPreset !== 'none' && expiresAt ? (
                    <p className="text-xs text-slate-500">
                      Expires around {formatWhen(expiresAt.replace('T', ' '))}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Stays live until you turn it off manually
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Show on website</p>
                    <p className="text-xs text-slate-500">Activating this turns off other promos</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={saving || uploading}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                    {editingId ? 'Save changes' : 'Create promo'}
                  </Button>
                  {editingId ? (
                    <Button type="button" variant="ghost" onClick={resetForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Saved promos</CardTitle>
              <CardDescription>
                Visitors see the active promo as a popup until it expires or is turned off.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : promos.length === 0 ? (
                <p className="text-sm text-slate-500 py-10 text-center">No promos yet</p>
              ) : (
                <ul className="space-y-3">
                  {promos.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center"
                    >
                      <img
                        src={sitePromoDisplayUrl(p)}
                        alt={p.title || `Promo ${p.id}`}
                        className="h-20 w-20 shrink-0 rounded-lg object-cover bg-slate-100"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {p.title || `Promo #${p.id}`}
                          </p>
                          {p.is_expired ? (
                            <Badge variant="secondary">Expired</Badge>
                          ) : p.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              Live
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Off</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {p.expires_at
                            ? `Expires ${formatWhen(p.expires_at)}`
                            : 'No auto-expire'}
                        </p>
                        {p.link_url ? (
                          <p className="text-xs text-slate-400 truncate" title={p.link_url}>
                            {p.link_url}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span>Active</span>
                            <Switch
                              checked={Boolean(p.is_active) && !p.is_expired}
                              disabled={Boolean(p.is_expired)}
                              onCheckedChange={(v) => void toggleActive(p, v)}
                            />
                          </div>
                          <Button type="button" size="sm" variant="outline" onClick={() => startEdit(p)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={() => void remove(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
