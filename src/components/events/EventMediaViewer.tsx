import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FolderDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildZipStore, bytesToDownloadBlob, documentsHtmlPage, triggerBrowserDownload, zipPathFromTitle, zipSafeName } from '@/lib/zipStore';

export interface EventMediaPreview {
  url: string;
  ext: string;
  title: string;
  blob: Blob;
}

export function EventMediaViewer({
  items,
  folderName,
  onClose,
}: {
  items: EventMediaPreview[] | null;
  folderName?: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(false);
  const [signature, setSignature] = useState('');
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    setIndex(0);
    setBroken(false);
    setSignature('');
  }, [items]);

  useEffect(() => {
    return () => {
      items?.forEach((item) => {
        if (item.url.startsWith('blob:')) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [items]);

  const current = items && items.length > 0 ? items[Math.min(index, items.length - 1)] : null;
  const heading = items && items.length > 1 ? `${current?.title || 'Document'} (${Math.min(index, items.length - 1) + 1}/${items.length})` : (current?.title || 'Document');

  const downloadCurrent = () => {
    if (!current) return;
    triggerBrowserDownload(current.blob, `${current.title.replace(/\s+/g, '-')}-${Date.now()}.${current.ext}`);
  };

  const packName = zipSafeName(folderName || items?.[0]?.title || 'documents');

  const saveHtmlPage = async () => {
    if (!items?.length) return;
    const files = [];
    for (const item of items) {
      files.push({
        title: item.title,
        ext: item.ext,
        bytes: new Uint8Array(await item.blob.arrayBuffer()),
      });
    }
    const html = documentsHtmlPage(packName, files);
    triggerBrowserDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), `${packName}-documents.html`);
  };

  const downloadZipFolder = async () => {
    if (!items?.length) return;
    setZipping(true);
    try {
      const entries = [];
      for (const item of items) {
        entries.push({
          path: `${packName}/${zipPathFromTitle(item.title, item.ext)}`,
          data: new Uint8Array(await item.blob.arrayBuffer()),
        });
      }
      const zip = buildZipStore(entries);
      triggerBrowserDownload(
        bytesToDownloadBlob(zip, 'application/zip'),
        `${packName}-documents.zip`,
      );
    } finally {
      setZipping(false);
    }
  };

  return (
    <Dialog open={!!items?.length} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>
        {current && (
          <div className="space-y-3">
            <div className="relative flex max-h-[70vh] items-center justify-center overflow-auto rounded-md bg-slate-950">
              {current.ext === 'pdf' ? (
                <iframe title={current.title} src={current.url} className="h-[70vh] w-full bg-white" />
              ) : broken ? (
                <p className="p-6 text-sm text-slate-200">
                  This file is not a viewable image.
                  {signature ? ` Signature ${signature}.` : ''} Re-upload the photo if it still fails after a refresh.
                </p>
              ) : (
                <img
                  src={current.url}
                  alt={current.title}
                  className="max-h-[70vh] max-w-full object-contain"
                  onError={() => {
                    setBroken(true);
                    void current.blob.slice(0, 12).arrayBuffer().then((buf) => {
                      const bytes = new Uint8Array(buf);
                      setSignature(Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(' '));
                    }).catch(() => undefined);
                  }}
                  onLoad={() => setBroken(false)}
                />
              )}
              {items && items.length > 1 && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    disabled={index <= 0}
                    onClick={() => { setBroken(false); setIndex((i) => Math.max(0, i - 1)); }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    disabled={index >= items.length - 1}
                    onClick={() => { setBroken(false); setIndex((i) => Math.min(items.length - 1, i + 1)); }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            {items && items.length > 1 && (
              <div className="flex flex-wrap gap-1">
                {items.map((item, i) => (
                  <Button
                    key={`${item.title}-${i}`}
                    size="sm"
                    variant={i === index ? 'default' : 'outline'}
                    onClick={() => { setBroken(false); setIndex(i); }}
                  >
                    {item.title}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadCurrent}>
                <Download className="mr-1 h-3 w-3" />
                Download this file
              </Button>
              {items && items.length > 1 && (
                <>
                  <Button variant="outline" disabled={zipping} onClick={() => { void downloadZipFolder(); }}>
                    <FolderDown className="mr-1 h-3 w-3" />
                    {zipping ? 'Preparing zip…' : 'Download all as ZIP folder'}
                  </Button>
                  <Button variant="outline" onClick={() => { void saveHtmlPage(); }}>
                    Save all as HTML page
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
