import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { sitePromoAPI } from '@/services/api/sitePromoAPI';
import type { SitePromo } from '@/types/sitePromo';

const OPEN_DELAY_MS = 800;
const CLOSE_GUARD_MS = 600;
const dismissKey = (id: number) => `vth-site-notice-v6-${id}`;

type SitePromoPopupProps = {
  enabled?: boolean;
};

export function SitePromoPopup({ enabled = true }: SitePromoPopupProps) {
  const [promo, setPromo] = useState<SitePromo | null>(null);
  const [imageSrc, setImageSrc] = useState('');
  const [open, setOpen] = useState(false);
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: number | undefined;

    void (async () => {
      const active = await sitePromoAPI.public.getActive();
      if (cancelled || !active?.id || !active.image_url) return;
      if (sessionStorage.getItem(dismissKey(active.id)) === '1') return;

      let src = '';

      if (active.image_data_url?.startsWith('data:image/')) {
        src = active.image_data_url;
      } else {
        const dataUrl = await sitePromoAPI.public.getImageDataUrl(active.id);
        if (cancelled) return;
        if (dataUrl) src = dataUrl;
      }

      if (cancelled || !src) {
        console.warn(
          '[SitePromoPopup] Banner image missing from API. Redeploy api/promos/public.php + db.php',
        );
        return;
      }

      setPromo(active);
      setImageSrc(src);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        openedAtRef.current = Date.now();
        setOpen(true);
      }, OPEN_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled]);

  const dismiss = () => {
    if (promo) sessionStorage.setItem(dismissKey(promo.id), '1');
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    if (Date.now() - openedAtRef.current < CLOSE_GUARD_MS) return;
    dismiss();
  };

  if (!enabled || !promo || !imageSrc) return null;

  const href = (promo.link_url || '').trim();
  const title = promo.title?.trim() || 'Notice';

  const image = (
    <img
      src={imageSrc}
      alt={title}
      className="mx-auto h-auto max-h-[min(85dvh,85vh)] w-auto max-w-[min(92vw,22rem)] object-contain"
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showClose={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        overlayClassName="z-[10100] bg-black/45 backdrop-blur-none"
        className="z-[10101] w-auto max-w-none gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="relative w-fit max-w-[min(92vw,22rem)] rounded-2xl bg-transparent shadow-2xl">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss();
            }}
            className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition-colors hover:bg-black/80 sm:right-2 sm:top-2"
            aria-label="Close notice"
          >
            <X className="h-4 w-4" />
          </button>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sessionStorage.setItem(dismissKey(promo.id), '1')}
              className="block leading-none"
              aria-label={title}
            >
              {image}
            </a>
          ) : (
            <div className="block leading-none">{image}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SitePromoPopup;
