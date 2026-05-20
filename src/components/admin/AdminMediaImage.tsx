import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchAdminMediaBlob } from '@/utils/adminMedia';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function AdminMediaImage({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void fetchAdminMediaBlob(url)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unable to load image');
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!src) return <Loader2 className="h-6 w-6 animate-spin text-gray-400" />;
  return <img src={src} alt={alt} className={className} />;
}

export function AdminMediaViewLink({ url, label = 'View' }: { url: string; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="text-green-700 underline"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Identity Card</DialogTitle>
          </DialogHeader>
          {open && (
            <AdminMediaImage
              url={url}
              alt="Identity card"
              className="max-h-[70vh] w-full rounded-lg border object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
