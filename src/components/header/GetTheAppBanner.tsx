import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

const DISMISS_KEY = 'vth-get-app-banner-dismissed';
const ARAKU_DISMISS_KEY = 'vth-araku-app-banner-dismissed';
const ARAKU_PATH = '/tours/araku-valley-tour';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.vizagtaxihub.app';

export function GetTheAppBanner() {
  const { pathname } = useLocation();
  const deferUntilScroll = pathname === ARAKU_PATH;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = deferUntilScroll ? ARAKU_DISMISS_KEY : DISMISS_KEY;
    try {
      const store = deferUntilScroll ? localStorage : sessionStorage;
      if (store.getItem(key) === '1') return;
    } catch {
      // Private mode can block storage. Still show the banner.
    }
    if (!deferUntilScroll) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const onScroll = () => {
      if (window.scrollY > 420) setVisible(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [deferUntilScroll]);

  const dismiss = () => {
    try {
      if (deferUntilScroll) localStorage.setItem(ARAKU_DISMISS_KEY, '1');
      else sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore storage failures and just hide it.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="border-b border-blue-100 bg-[#e7f3ff] px-3 pb-3 pt-2.5 lg:hidden">
      <div className="flex items-center gap-2.5">
        <img
          src="/favicon.ico"
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5"
        />
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-gray-900">Book and track your ride</p>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-white/70"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 flex h-10 w-full items-center justify-center rounded-md bg-[#008cff] text-sm font-bold tracking-wide text-white"
      >
        GET THE APP
      </a>
    </div>
  );
}
