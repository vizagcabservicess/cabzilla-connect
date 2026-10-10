import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Home } from 'lucide-react';
import {
  homeShortcutPlatform,
  homeShortcutStartPath,
  isEmbeddedMobileBrowser,
  type HomeShortcutKind,
  type HomeShortcutPlatform,
} from '@/lib/eventDuty';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredInstall: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstall = event as BeforeInstallPromptEvent;
  });
}

function isStandaloneDisplay(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone) || window.matchMedia('(display-mode: standalone)').matches;
}

function homeShortcutSteps(platform: Exclude<HomeShortcutPlatform, 'standalone'>): string[] {
  switch (platform) {
    case 'ios':
      return [
        'Tap the Share button in Safari or Chrome (the square with an arrow).',
        'Scroll the sheet and tap Add to Home Screen.',
        'Tap Add. The icon opens this page directly.',
      ];
    case 'android':
      return [
        'Tap the Chrome menu (⋮) at the top right.',
        'Tap Add to Home screen, or Install app.',
        'Tap Add. The icon opens this page directly.',
      ];
    case 'other':
      return [
        'Open this link in Safari on iPhone or Chrome on Android.',
        'Use the browser menu and choose Add to Home Screen.',
      ];
    default: {
      const _never: never = platform;
      return _never;
    }
  }
}

export function AddToHomeButton({
  kind,
  title,
  shortName,
}: {
  kind: HomeShortcutKind;
  title: string;
  shortName: string;
}) {
  const startPath = typeof window === 'undefined' ? null : homeShortcutStartPath(kind, window.location.pathname);
  const [hidden, setHidden] = useState(() => typeof window !== 'undefined' && isStandaloneDisplay());
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<HomeShortcutPlatform>('other');
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    if (!startPath) return;
    const ua = navigator.userAgent;
    setPlatform(homeShortcutPlatform(ua, isStandaloneDisplay()));
    setEmbedded(isEmbeddedMobileBrowser(ua));
    const onInstalled = () => setHidden(true);
    window.addEventListener('appinstalled', onInstalled);
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, [startPath]);

  if (!startPath || hidden || platform === 'standalone') return null;

  const manifestUrl = `/api/events/home-manifest.php?start=${encodeURIComponent(startPath)}&name=${encodeURIComponent(title)}&short=${encodeURIComponent(shortName)}`;
  const steps = homeShortcutSteps(platform === 'standalone' ? 'other' : platform);

  const onAdd = async () => {
    if (deferredInstall) {
      const prompt = deferredInstall;
      deferredInstall = null;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setHidden(true);
      return;
    }
    setOpen(true);
  };

  const openInChrome = () => {
    const url = `${window.location.host}${startPath}`;
    window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
  };

  return (
    <>
      <Helmet>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={shortName} />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#2f6bff" />
        <link rel="manifest" href={manifestUrl} />
      </Helmet>
      <button
        type="button"
        onClick={() => { void onAdd(); }}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm"
      >
        <Home className="h-3.5 w-3.5" />
        Add to Home
      </button>
      {open && (
        <div className="fixed inset-0 z-[10080] flex items-end justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="text-base font-semibold text-slate-800">Add to your home screen</div>
            <p className="mt-1 text-sm text-slate-500">
              Next time, open {shortName} from the icon. You will not need to find the link in Chrome again.
            </p>
            {embedded && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                This page is inside another app. Open it in {platform === 'ios' ? 'Safari' : 'Chrome'} first, then add it.
                {platform === 'android' && (
                  <button type="button" onClick={openInChrome} className="mt-2 block font-semibold text-blue-600">
                    Open in Chrome
                  </button>
                )}
              </div>
            )}
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <button type="button" onClick={() => setOpen(false)} className="mt-4 w-full rounded-xl bg-[#2f6bff] py-2.5 text-sm font-semibold text-white">
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
