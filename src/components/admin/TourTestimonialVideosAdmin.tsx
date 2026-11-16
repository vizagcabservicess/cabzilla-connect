import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Pencil, PlusCircle, Trash2, Upload, X } from 'lucide-react';
import { AVAILABLE_TOUR_ROUTES } from '@/lib/availableTours';
import { resolveSmartBudgetMediaUrl, uploadTourImageFile } from '@/lib/smartBudgetUpload';
import { tourTestimonialVideosAPI } from '@/services/api/tourTestimonialVideosAPI';
import type { TourTestimonialVideo } from '@/types/tourTestimonialVideo';

const TOUR_TAG_OPTIONS: Array<{ slug: string; label: string }> = [
  ...AVAILABLE_TOUR_ROUTES.map((tour) => ({ slug: tour.slug, label: tour.label })),
  { slug: 'annavaram-temple-tour-vizag', label: 'Annavaram Temple Tour' },
  { slug: 'araku-valley-package-2d-1n', label: 'Araku Valley Package 2D/1N' },
];

const emptyForm = {
  youtubeUrl: '',
  quote: '',
  name: '',
  tourLabel: '',
  duration: '',
  posterUrl: '',
  tourTags: [] as string[],
  isActive: true,
  sortOrder: 0,
};

function extractYoutubeId(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (/^[a-zA-Z0-9_-]{6,32}$/.test(value)) return value;
  const match = value.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([a-zA-Z0-9_-]{6,32})/);
  return match?.[1] || '';
}

function youtubePoster(idOrUrl: string): string {
  const id = extractYoutubeId(idOrUrl);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

function tagLabel(slug: string): string {
  return TOUR_TAG_OPTIONS.find((opt) => opt.slug === slug)?.label || slug;
}

export function TourTestimonialVideosAdmin() {
  const { toast } = useToast();
  const [items, setItems] = useState<TourTestimonialVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TourTestimonialVideo | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await tourTestimonialVideosAPI.listAdmin();
      setItems(list);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load testimonial videos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, tourTags: [], sortOrder: items.length });
    setModalOpen(true);
  };

  const openEdit = (item: TourTestimonialVideo) => {
    setEditing(item);
    setForm({
      youtubeUrl: item.youtubeUrl || `https://www.youtube.com/shorts/${item.youtubeId}`,
      quote: item.quote,
      name: item.name,
      tourLabel: item.tourLabel,
      duration: item.duration,
      posterUrl: item.posterUrl || '',
      tourTags: item.tourTags || [],
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setModalOpen(true);
  };

  const previewSrc =
    (form.posterUrl ? resolveSmartBudgetMediaUrl(form.posterUrl) || form.posterUrl : '') ||
    youtubePoster(form.youtubeUrl);

  const toggleTag = (slug: string) => {
    setForm((prev) => {
      const has = prev.tourTags.includes(slug);
      return {
        ...prev,
        tourTags: has ? prev.tourTags.filter((tag) => tag !== slug) : [...prev.tourTags, slug],
      };
    });
  };

  const onUploadPoster = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTourImageFile(file);
      if (!url) throw new Error('Upload returned no URL');
      setForm((prev) => ({ ...prev, posterUrl: url }));
      toast({ title: 'Poster uploaded' });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.youtubeUrl.trim() || !extractYoutubeId(form.youtubeUrl)) {
      toast({ title: 'Valid YouTube URL required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        youtubeUrl: form.youtubeUrl.trim(),
        youtubeId: extractYoutubeId(form.youtubeUrl),
        quote: form.quote.trim(),
        name: form.name.trim(),
        tourLabel: form.tourLabel.trim(),
        duration: form.duration.trim(),
        posterUrl: form.posterUrl.trim() || null,
        tourTags: form.tourTags,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await tourTestimonialVideosAPI.update(editing.id, payload);
        toast({ title: 'Testimonial video updated' });
      } else {
        await tourTestimonialVideosAPI.create(payload);
        toast({ title: 'Testimonial video created' });
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (item: TourTestimonialVideo) => {
    if (!window.confirm(`Delete testimonial from ${item.name || item.youtubeId}?`)) return;
    try {
      await tourTestimonialVideosAPI.remove(item.id);
      toast({ title: 'Deleted' });
      await load();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Could not delete',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Tour testimonial videos</CardTitle>
          <CardDescription>
            Tag clips to specific tours. Leave tags empty to show on every marketing tour page.
          </CardDescription>
        </div>
        <Button type="button" onClick={openCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add video
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No testimonial videos yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const thumb =
                (item.posterUrl
                  ? resolveSmartBudgetMediaUrl(item.posterUrl) || item.posterUrl
                  : '') || youtubePoster(item.youtubeId);
              const tags = item.tourTags || [];
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center"
                >
                  <div className="h-20 w-36 shrink-0 overflow-hidden rounded-md bg-slate-100">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.quote || item.youtubeId}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.name}
                      {item.tourLabel ? ` · ${item.tourLabel}` : ''}
                      {item.duration ? ` · ${item.duration}` : ''}
                      {!item.isActive ? ' · Inactive' : ''}
                      {item.posterUrl ? ' · Custom poster' : ' · YouTube poster'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.length === 0 ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          All tours
                        </span>
                      ) : (
                        tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                          >
                            {tagLabel(tag)}
                          </span>
                        ))
                      )}
                    </div>
                    {item.youtubeUrl ? (
                      <a
                        href={item.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block truncate text-xs font-medium text-blue-600 hover:underline"
                      >
                        {item.youtubeUrl}
                      </a>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void onDelete(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit testimonial video' : 'Add testimonial video'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="ttv-youtube-url">YouTube URL</Label>
              <Input
                id="ttv-youtube-url"
                value={form.youtubeUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
                placeholder="https://www.youtube.com/shorts/…"
                required
              />
              {extractYoutubeId(form.youtubeUrl) ? (
                <p className="text-xs text-slate-500">
                  Video ID: <span className="font-medium text-slate-700">{extractYoutubeId(form.youtubeUrl)}</span>
                </p>
              ) : (
                <p className="text-xs text-amber-700">Paste a full YouTube watch or Shorts link.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ttv-quote">Quote</Label>
              <Textarea
                id="ttv-quote"
                value={form.quote}
                onChange={(e) => setForm((prev) => ({ ...prev, quote: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ttv-name">Guest name</Label>
                <Input
                  id="ttv-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ttv-tour">Tour label</Label>
                <Input
                  id="ttv-tour"
                  value={form.tourLabel}
                  onChange={(e) => setForm((prev) => ({ ...prev, tourLabel: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ttv-duration">Duration</Label>
                <Input
                  id="ttv-duration"
                  value={form.duration}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                  placeholder="01:32"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ttv-sort">Sort order</Label>
                <Input
                  id="ttv-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <Label>Show on tours</Label>
                <p className="text-xs text-slate-500">
                  Leave all unchecked to show on every marketing tour page.
                </p>
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {TOUR_TAG_OPTIONS.map((opt) => {
                  const checked = form.tourTags.includes(opt.slug);
                  return (
                    <label
                      key={opt.slug}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTag(opt.slug)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="min-w-0">
                        <span className="font-medium text-slate-800">{opt.label}</span>
                        <span className="ml-1 text-xs text-slate-400">{opt.slug}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Custom thumbnail</Label>
              {previewSrc ? (
                <div className="relative h-36 w-full overflow-hidden rounded-lg bg-slate-100">
                  <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload poster
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => void onUploadPoster(e.target.files?.[0] || null)}
                  />
                </label>
                {form.posterUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((prev) => ({ ...prev, posterUrl: '' }))}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Use YouTube poster
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label htmlFor="ttv-active">Active on tour pages</Label>
              <Switch
                id="ttv-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editing ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
