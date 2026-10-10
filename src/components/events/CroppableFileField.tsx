import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, RotateCw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { downscaleImageFile, parseDocumentOcr, type DocumentOcrFields, type DocumentOcrKind } from '@/lib/eventDuty';
import { eventDutyAPI } from '@/services/api/eventDutyAPI';

export type ImageCropRect = { x: number; y: number; w: number; h: number };

type CropHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function isCroppableImage(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

async function loadImageFile(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not read image'));
    el.src = url;
  });
  return { img, url };
}

async function canvasToJpeg(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => {
      if (next) resolve(next);
      else reject(new Error('Could not save image'));
    }, 'image/jpeg', 0.92);
  });
  const base = fileName.replace(/\.[^.]+$/, '') || 'document';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

export async function rotateImageFile(file: File, degrees: 90 | 180 | 270 = 90): Promise<File> {
  const { img, url } = await loadImageFile(file);
  try {
    const canvas = document.createElement('canvas');
    if (degrees === 180) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    } else {
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not rotate image');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    return await canvasToJpeg(canvas, file.name.replace(/-cropped|-rotated/g, '') + '-rotated');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function cropImageFile(file: File, crop: ImageCropRect): Promise<File> {
  const { img, url } = await loadImageFile(file);
  try {
    const sx = Math.round(img.naturalWidth * clamp(crop.x, 0, 1));
    const sy = Math.round(img.naturalHeight * clamp(crop.y, 0, 1));
    const sw = Math.max(1, Math.round(img.naturalWidth * clamp(crop.w, 0.02, 1)));
    const sh = Math.max(1, Math.round(img.naturalHeight * clamp(crop.h, 0.02, 1)));
    const maxEdge = 2000;
    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not crop image');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return await canvasToJpeg(canvas, `${file.name.replace(/\.[^.]+$/, '') || 'document'}-cropped`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ImageCropDialog({
  file,
  open,
  onOpenChange,
  onApply,
}: {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (file: File) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [working, setWorking] = useState<File | null>(file);
  const [crop, setCrop] = useState<ImageCropRect>({ x: 0.04, y: 0.04, w: 0.92, h: 0.92 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{
    handle: CropHandle;
    startX: number;
    startY: number;
    start: ImageCropRect;
    box: DOMRect;
  } | null>(null);
  const previewUrl = useMemo(() => (working ? URL.createObjectURL(working) : ''), [working]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (open) {
      setWorking(file);
      setCrop({ x: 0.04, y: 0.04, w: 0.92, h: 0.92 });
    }
  }, [open, file]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const active = drag.current;
      if (!active) return;
      const dx = (event.clientX - active.startX) / active.box.width;
      const dy = (event.clientY - active.startY) / active.box.height;
      setCrop(resizeCrop(active.start, active.handle, dx, dy));
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const startDrag = (handle: CropHandle) => (event: React.PointerEvent) => {
    if (!imgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      start: crop,
      box: imgRef.current.getBoundingClientRect(),
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crop image</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Rotate if the photo is sideways, then drag the box to crop. PDFs cannot be cropped.</p>
        {previewUrl && (
          <div className="relative mx-auto inline-block max-h-[58vh] max-w-full overflow-hidden touch-none select-none">
            <img
              ref={imgRef}
              src={previewUrl}
              alt="Crop preview"
              className="block max-h-[58vh] max-w-full"
              draggable={false}
            />
            <div
              className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
              }}
              onPointerDown={startDrag('move')}
            >
              {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
                <button
                  key={handle}
                  type="button"
                  aria-label={`Resize ${handle}`}
                  className={`absolute h-8 w-8 rounded-sm border-2 border-blue-600 bg-white ${handleClass(handle)}`}
                  onPointerDown={startDrag(handle)}
                />
              ))}
            </div>
          </div>
        )}
        <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 bg-background pt-2">
          <Button
            type="button"
            variant="outline"
            className="mr-auto"
            disabled={!working || busy}
            onClick={async () => {
              if (!working) return;
              setBusy(true);
              try {
                const next = await rotateImageFile(working, 90);
                setWorking(next);
                setCrop({ x: 0.04, y: 0.04, w: 0.92, h: 0.92 });
              } finally {
                setBusy(false);
              }
            }}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Rotate
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="outline"
            disabled={!working}
            onClick={() => {
              if (working) onApply(working);
              onOpenChange(false);
            }}
          >
            Use original
          </Button>
          <Button
            disabled={!working || busy}
            onClick={async () => {
              if (!working) return;
              setBusy(true);
              try {
                onApply(await cropImageFile(working, crop));
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Working…' : 'Apply crop'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function handleClass(handle: Exclude<CropHandle, 'move'>): string {
  switch (handle) {
    case 'nw':
      return '-left-2 -top-2 cursor-nwse-resize';
    case 'ne':
      return '-right-2 -top-2 cursor-nesw-resize';
    case 'sw':
      return '-left-2 -bottom-2 cursor-nesw-resize';
    case 'se':
      return '-right-2 -bottom-2 cursor-nwse-resize';
    default: {
      const _never: never = handle;
      return _never;
    }
  }
}

function resizeCrop(start: ImageCropRect, handle: CropHandle, dx: number, dy: number): ImageCropRect {
  const min = 0.08;
  switch (handle) {
    case 'move':
      return {
        x: clamp(start.x + dx, 0, 1 - start.w),
        y: clamp(start.y + dy, 0, 1 - start.h),
        w: start.w,
        h: start.h,
      };
    case 'nw': {
      const x = clamp(start.x + dx, 0, start.x + start.w - min);
      const y = clamp(start.y + dy, 0, start.y + start.h - min);
      return { x, y, w: start.x + start.w - x, h: start.y + start.h - y };
    }
    case 'ne': {
      const y = clamp(start.y + dy, 0, start.y + start.h - min);
      const w = clamp(start.w + dx, min, 1 - start.x);
      return { x: start.x, y, w, h: start.y + start.h - y };
    }
    case 'sw': {
      const x = clamp(start.x + dx, 0, start.x + start.w - min);
      const h = clamp(start.h + dy, min, 1 - start.y);
      return { x, y: start.y, w: start.x + start.w - x, h };
    }
    case 'se':
      return {
        x: start.x,
        y: start.y,
        w: clamp(start.w + dx, min, 1 - start.x),
        h: clamp(start.h + dy, min, 1 - start.y),
      };
    default: {
      const _never: never = handle;
      return _never;
    }
  }
}

export function CroppableFileField({
  id,
  label,
  value,
  onChange,
  accept = 'image/*,.pdf',
  capture,
  kind,
  ocr,
  onExtracted,
  hint,
  existingId,
  onRemoveExisting,
}: {
  id: string;
  label: string;
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  capture?: boolean;
  kind?: DocumentOcrKind;
  ocr?: (file: File) => Promise<{ text?: string | null }>;
  onExtracted?: (fields: DocumentOcrFields) => void;
  hint?: string;
  existingId?: number | null;
  onRemoveExisting?: () => Promise<void> | void;
}) {
  const [inputKey, setInputKey] = useState(0);
  const [source, setSource] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [existingPreview, setExistingPreview] = useState<{ url: string; ext: string } | null>(null);
  const previewUrl = useMemo(
    () => (value && isCroppableImage(value) ? URL.createObjectURL(value) : ''),
    [value],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!value) setInputKey((key) => key + 1);
  }, [value]);

  useEffect(() => {
    if (!existingId || value) {
      setExistingPreview(null);
      return;
    }
    let cancelled = false;
    void eventDutyAPI.fetchAuthedFile(eventDutyAPI.mediaUrl(existingId))
      .then((file) => {
        if (!cancelled) setExistingPreview({ url: file.objectUrl, ext: file.ext });
      })
      .catch(() => {
        if (!cancelled) setExistingPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [existingId, value]);

  const runOcr = async (file: File) => {
    if (!kind || !ocr || !onExtracted || !isCroppableImage(file)) return;
    setReading(true);
    try {
      const compact = await downscaleImageFile(file);
      const res = await ocr(compact);
      const fields = parseDocumentOcr(kind, res.text || '');
      onExtracted(fields);
    } catch {
      onExtracted({});
    } finally {
      setReading(false);
    }
  };

  const applyFile = (file: File | null) => {
    onChange(file);
    if (file) void runOcr(file);
  };

  const pick = (file?: File, { crop = true }: { crop?: boolean } = {}) => {
    if (!file) {
      applyFile(null);
      return;
    }
    const autoCrop = crop && isCroppableImage(file) && typeof window !== 'undefined'
      && window.matchMedia('(min-width: 768px)').matches;
    if (!autoCrop) {
      applyFile(file);
      return;
    }
    setSource(file);
    setCropOpen(true);
  };

  const shownHint = value
    ? 'New file selected — save to replace the one on file.'
    : existingId
      ? 'On file — upload to replace, or delete this one.'
      : hint;

  return (
    <div className="w-full min-w-0 max-w-full space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {shownHint ? <p className="text-xs text-muted-foreground">{shownHint}</p> : null}
      <div className="grid w-full min-w-0 grid-cols-2 gap-2">
        <label className="inline-flex h-12 min-w-0 w-full cursor-pointer items-center justify-center gap-1 rounded-md border bg-primary px-2 text-center text-xs font-medium text-primary-foreground sm:gap-2 sm:px-3 sm:text-sm">
          <Camera className="h-4 w-4 shrink-0" />
          Take photo
          <input
            key={`cam-${inputKey}`}
            id={`${id}-camera`}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0], { crop: false });
              setInputKey((key) => key + 1);
            }}
          />
        </label>
        <label className="inline-flex h-12 min-w-0 w-full cursor-pointer items-center justify-center gap-1 rounded-md border bg-background px-2 text-center text-xs font-medium sm:gap-2 sm:px-3 sm:text-sm">
          <ImagePlus className="h-4 w-4 shrink-0" />
          Choose file
          <input
            key={`file-${inputKey}`}
            id={id}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              setInputKey((key) => key + 1);
            }}
          />
        </label>
      </div>
      {value && (
        <div className="flex w-full min-w-0 items-center gap-2 rounded-md border bg-slate-50 p-2">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white text-xs text-muted-foreground">PDF</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{value.name}</div>
            <div className="text-xs text-muted-foreground">
              {reading ? 'Reading text from image…' : `${Math.round(value.size / 1024)} KB`}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isCroppableImage(value) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="px-2"
                onClick={() => {
                  setSource(value);
                  setCropOpen(true);
                }}
              >
                Crop
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" className="px-2" onClick={() => applyFile(null)} aria-label="Clear selected file">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {!value && existingId ? (
        <div className="flex w-full min-w-0 items-center gap-2 rounded-md border bg-slate-50 p-2">
          {existingPreview?.url && existingPreview.ext !== 'pdf' ? (
            <img src={existingPreview.url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white text-xs text-muted-foreground">
              {existingPreview ? 'PDF' : 'On file'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Current file</div>
            <div className="text-xs text-muted-foreground">Stays unless you replace or delete it.</div>
          </div>
          {onRemoveExisting && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 px-2"
              disabled={removing}
              onClick={async () => {
                setRemoving(true);
                try {
                  await onRemoveExisting();
                } finally {
                  setRemoving(false);
                }
              }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {removing ? 'Removing…' : 'Delete'}
            </Button>
          )}
        </div>
      ) : null}
      <ImageCropDialog
        file={source}
        open={cropOpen}
        onOpenChange={setCropOpen}
        onApply={applyFile}
      />
    </div>
  );
}
