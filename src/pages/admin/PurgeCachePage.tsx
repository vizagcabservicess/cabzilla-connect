import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiUrl } from '@/config/api';

type PurgeScope = 'all' | 'url';

type PurgeResponse = {
  success?: boolean;
  errors?: string[];
  litespeed?: { message?: string };
  cloudflare?: { configured?: boolean; purged?: boolean; message?: string };
};

async function clearThisBrowser(): Promise<void> {
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.active?.postMessage({ type: 'CLEAR_ALL_CACHES' });
  }
}

export default function PurgeCachePage() {
  const [pageUrl, setPageUrl] = useState('');
  const [busy, setBusy] = useState<PurgeScope | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState('');

  const purge = async (scope: PurgeScope) => {
    setBusy(scope);
    setError('');
    setLines([]);
    try {
      const token = localStorage.getItem('auth_token') || '';
      const response = await fetch(getApiUrl('/api/admin/purge-cache.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(scope === 'all' ? { scope: 'all' } : { scope: 'url', url: pageUrl.trim() }),
      });
      const data = (await response.json().catch(() => null)) as PurgeResponse | null;
      if (!response.ok || !data) {
        setError(data?.errors?.[0] || 'Could not purge the cache.');
        return;
      }
      if (data.errors?.length) {
        setError(data.errors[0]);
        return;
      }
      await clearThisBrowser();
      const next = [
        data.litespeed?.message || 'Server cache purge requested.',
        data.cloudflare?.message || '',
        'This browser’s saved pages were cleared.',
      ].filter(Boolean);
      setLines(next);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout activeTab="cache">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Purge cache</h1>
          <p className="mt-1 text-sm text-slate-600">
            Use this after a page fix so visitors and PageSpeed load the new version instead of a saved copy.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Whole site</h2>
          <p className="mt-1 text-sm text-slate-600">Clears every cached page, script, and photo on the server.</p>
          <Button className="mt-4" disabled={busy !== null} onClick={() => purge('all')}>
            {busy === 'all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Purge all cache
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">One page</h2>
          <Label htmlFor="purge-url" className="mt-3 block text-sm text-slate-600">
            Page path
          </Label>
          <Input
            id="purge-url"
            value={pageUrl}
            onChange={(event) => setPageUrl(event.target.value)}
            placeholder="/tours/vizag-south-city-tour"
            className="mt-1.5"
          />
          <Button
            variant="outline"
            className="mt-4"
            disabled={busy !== null || pageUrl.trim() === ''}
            onClick={() => purge('url')}
          >
            {busy === 'url' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Purge this page
          </Button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {lines.length > 0 ? (
          <ul className="space-y-1 text-sm text-slate-700">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </AdminLayout>
  );
}
