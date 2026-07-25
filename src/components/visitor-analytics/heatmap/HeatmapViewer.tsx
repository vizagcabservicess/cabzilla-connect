import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getHeatmap } from '@/services/api/visitorAnalyticsAPI';
import type { DeviceType, HeatmapPoint, HeatmapType } from '@/types/visitorAnalytics';

const FRAME_W = 1280;
const FRAME_H = 900;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function heatColor(t: number, type: HeatmapType): string {
  const a = Math.min(0.75, 0.2 + t * 0.55);
  switch (type) {
    case 'scroll':
      return `rgba(245, 158, 11, ${a})`;
    case 'move':
      return `rgba(59, 130, 246, ${a})`;
    case 'click':
      return `rgba(239, 68, 68, ${a})`;
    default: {
      const _exhaustive: never = type;
      return String(_exhaustive);
    }
  }
}

interface HeatmapViewerProps {
  defaultPagePath?: string;
}

export function HeatmapViewer({ defaultPagePath = '/' }: HeatmapViewerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pagePath, setPagePath] = useState(defaultPagePath);
  const [type, setType] = useState<HeatmapType>('click');
  const [device, setDevice] = useState<DeviceType | 'all'>('all');
  const [from, setFrom] = useState(daysAgoIso(7));
  const [to, setTo] = useState(todayIso());
  const [campaign, setCampaign] = useState('');
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [grid, setGrid] = useState(40);
  const [loading, setLoading] = useState(false);
  const [fitScale, setFitScale] = useState(0.55);
  const [previewUrl, setPreviewUrl] = useState(`${window.location.origin}/`);

  const draw = useCallback(
    (pts: HeatmapPoint[], g: number, heatType: HeatmapType) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!pts.length) return;
      const max = Math.max(...pts.map((p) => p.intensity), 1);
      const cellW = w / g;
      const cellH = h / g;

      for (const p of pts) {
        const intensity = p.intensity / max;
        const cx = p.x * cellW + cellW / 2;
        const cy = p.y * cellH + cellH / 2;
        if (heatType === 'scroll') {
          ctx.fillStyle = heatColor(intensity, heatType);
          ctx.fillRect(0, p.y * cellH, w, Math.max(cellH, 6));
        } else {
          const r = Math.max(10, cellW * 0.85 * (0.45 + intensity));
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, heatColor(intensity, heatType));
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    [],
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const availW = el.clientWidth || 1;
      const maxH = Math.min(520, Math.max(280, window.innerHeight * 0.5));
      const scale = Math.min(1, availW / FRAME_W, maxH / FRAME_H);
      setFitScale(Number.isFinite(scale) && scale > 0 ? scale : 0.5);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const load = useCallback(async () => {
    if (!pagePath.trim()) {
      toast.error('Enter a page path');
      return;
    }
    const path = pagePath.trim().startsWith('/') ? pagePath.trim() : `/${pagePath.trim()}`;
    setPreviewUrl(`${window.location.origin}${path}`);
    setLoading(true);
    try {
      const data = await getHeatmap({
        pagePath: path,
        type,
        from,
        to,
        device,
        campaign: campaign.trim() || undefined,
      });
      setPoints(data.points || []);
      setGrid(data.grid || 40);
      draw(data.points || [], data.grid || 40, type);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load heatmap');
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [pagePath, type, from, to, device, campaign, draw]);

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial load only

  useEffect(() => {
    draw(points, grid, type);
  }, [points, grid, type, draw]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">Heatmaps</CardTitle>
        <p className="text-xs text-slate-500 font-normal mt-1">
          Red/blue/amber spots are where visitors clicked, moved, or scrolled on that page. The site
          preview underneath is the live page so you can see <em>what</em> they interacted with.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="space-y-1.5 xl:col-span-2">
            <Label>Page path</Label>
            <Input
              value={pagePath}
              onChange={(e) => setPagePath(e.target.value)}
              placeholder="/"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="va-heat-type">Type</Label>
            <select
              id="va-heat-type"
              value={type}
              onChange={(e) => setType(e.target.value as HeatmapType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="click">Clicks</option>
              <option value="move">Mouse move</option>
              <option value="scroll">Scroll depth</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="va-heat-device">Device</Label>
            <select
              id="va-heat-device"
              value={device}
              onChange={(e) => setDevice(e.target.value as DeviceType | 'all')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All</option>
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 flex-1 min-w-[160px]">
            <Label>Campaign</Label>
            <Input
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="Optional UTM campaign"
            />
          </div>
          <Button onClick={() => void load()} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Load
          </Button>
        </div>

        <div
          ref={stageRef}
          className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
        >
          <div
            className="relative origin-top-left"
            style={{
              width: FRAME_W,
              height: FRAME_H,
              transform: `scale(${fitScale})`,
              marginBottom: FRAME_H * (fitScale - 1),
            }}
          >
            <iframe
              title="Heatmap page preview"
              src={previewUrl}
              className="absolute inset-0 border-0 bg-white pointer-events-none"
              style={{ width: FRAME_W, height: FRAME_H }}
              sandbox="allow-same-origin allow-scripts allow-popups-to-escape-sandbox"
            />
            <canvas
              ref={canvasRef}
              width={FRAME_W}
              height={FRAME_H}
              className="absolute inset-0 pointer-events-none"
              style={{ width: FRAME_W, height: FRAME_H }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {points.length
            ? `${points.length} hotspots · ${type} · ${from} → ${to}`
            : 'No heat data for this filter yet — browse the site so clicks/moves are recorded.'}
        </p>
      </CardContent>
    </Card>
  );
}

export default HeatmapViewer;
