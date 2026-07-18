import { useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { getApiUrl } from '@/config/api';
import { smartBudgetVendorStorage } from '@/services/api/smartBudgetAPI';
import { extractStorageObject } from '@/utils/adminMedia';
import { resolveSmartBudgetMediaUrl } from '@/lib/smartBudgetUpload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function isPrivateGcsUrl(url: string): boolean {
  return /storage\.googleapis\.com/i.test(url) || /^(app-uploads|sb-vendor|carpool-id|odometer-readings)\//i.test(url);
}

async function fetchVendorMediaBlob(sourceUrl: string): Promise<Blob> {
  const token = smartBudgetVendorStorage.getToken();
  if (!token) throw new Error('Vendor session required');

  const object = extractStorageObject(sourceUrl);
  const params = new URLSearchParams({ action: 'media', format: 'json' });
  if (object) params.set('object', object);
  else params.set('url', sourceUrl);

  const { data } = await axios.get<{ success: boolean; mime?: string; data?: string; error?: string }>(
    getApiUrl(`/api/smart-budget/vendor.php?${params.toString()}`),
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Unable to load image');
  }
  const binary = atob(data.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: data.mime || 'image/png' });
}

/** Hook: resolves public /uploads URLs directly; private GCS via vendor media proxy. */
export function useSmartBudgetMediaSrc(url: string | null | undefined): {
  src: string | null;
  loading: boolean;
  error: string | null;
} {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    const trimmed = String(url || '').trim();
    if (!trimmed) {
      setSrc(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (/^(blob:|data:)/i.test(trimmed)) {
      setSrc(trimmed);
      setLoading(false);
      setError(null);
      return;
    }

    // Public site uploads — load directly
    if (!isPrivateGcsUrl(trimmed) && (trimmed.startsWith('/uploads/') || trimmed.includes('/uploads/'))) {
      setSrc(resolveSmartBudgetMediaUrl(trimmed));
      setLoading(false);
      setError(null);
      return;
    }

    if (!isPrivateGcsUrl(trimmed)) {
      setSrc(resolveSmartBudgetMediaUrl(trimmed));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    void fetchVendorMediaBlob(trimmed)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setSrc(null);
        setLoading(false);
        setError(e instanceof Error ? e.message : 'Unable to load image');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return { src, loading, error };
}

export function SmartBudgetMediaImage({
  url,
  alt = '',
  className,
  fallback,
}: {
  url: string | null | undefined;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const { src, loading, error } = useSmartBudgetMediaSrc(url);

  if (!url) return <>{fallback ?? null}</>;
  if (loading) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  if (error || !src) {
    return (
      <>
        {fallback ?? (
          <div className="flex h-full w-full items-center justify-center rounded-full border bg-slate-50 text-[10px] text-muted-foreground">
            Photo
          </div>
        )}
      </>
    );
  }
  return <img src={src} alt={alt} className={className} />;
}

export function SmartBudgetMediaViewLink({
  url,
  label = 'View',
}: {
  url: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const isPdf = /\.pdf($|\?)/i.test(url);

  if (!isPrivateGcsUrl(url) && (url.startsWith('/uploads/') || url.includes('/uploads/'))) {
    const href = resolveSmartBudgetMediaUrl(url);
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-800 underline">
        {label}
      </a>
    );
  }

  if (isPdf && isPrivateGcsUrl(url)) {
    return (
      <button
        type="button"
        className="text-[11px] text-emerald-800 underline"
        onClick={() => {
          void fetchVendorMediaBlob(url)
            .then((blob) => {
              const objectUrl = URL.createObjectURL(blob);
              window.open(objectUrl, '_blank', 'noopener,noreferrer');
              window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
            })
            .catch(() => {
              /* ignore */
            });
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <>
      <button type="button" className="text-[11px] text-emerald-800 underline" onClick={() => setOpen(true)}>
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document</DialogTitle>
          </DialogHeader>
          {open && (
            <SmartBudgetMediaImage
              url={url}
              alt="Document"
              className="max-h-[70vh] w-full rounded-lg border object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
