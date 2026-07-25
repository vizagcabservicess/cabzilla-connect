import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  Loader2,
  SkipForward,
  MousePointer2,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getRecording,
  getRecordingChunkData,
  getStoredSiteId,
  getStoredVaToken,
  VaWebSocket,
} from '@/services/api/visitorAnalyticsAPI';
import type { RecordingOp, SerializedMutation, WsEnvelope } from '@/types/visitorAnalytics';

type Speed = 1 | 2 | 4;

interface TimelineEvent {
  tAbs: number;
  tRel: number;
  label: string;
  op: RecordingOp['op'];
  index: number;
}

function isRecordingOp(v: unknown): v is RecordingOp {
  return typeof v === 'object' && v != null && 'op' in v && 't' in v;
}

function opDedupeKey(op: RecordingOp): string {
  switch (op.op) {
    case 'full':
      return `full:${op.t}:${op.html.length}:${op.w}x${op.h}`;
    case 'mut':
      return `mut:${op.t}:${op.mutations.length}`;
    case 'mm':
      return `mm:${op.t}:${op.x},${op.y}`;
    case 'click':
      return `click:${op.t}:${op.x},${op.y}`;
    case 'scroll':
      return `scroll:${op.t}:${op.x},${op.y}:${op.d}`;
    case 'input':
      return `input:${op.t}:${op.sel}:${op.v}`;
    case 'key':
      return `key:${op.t}:${op.k}`;
    case 'resize':
      return `resize:${op.t}:${op.w}x${op.h}`;
    case 'vis':
      return `vis:${op.t}:${op.state}`;
    case 'focus':
      return `focus:${op.t}`;
    case 'blur':
      return `blur:${op.t}`;
    default: {
      const _exhaustive: never = op;
      return String(_exhaustive);
    }
  }
}

async function fetchChunkOps(sessionId: string, chunkIndex: number): Promise<RecordingOp[]> {
  const { events } = await getRecordingChunkData(sessionId, chunkIndex);
  return Array.isArray(events) ? events.filter(isRecordingOp) : [];
}

/**
 * Load enough chunks for scrubbing without requesting every tiny mm chunk.
 * Small sessions: load everything. Large: all fulls + sampled mids + recent tail.
 */
function prioritizeChunks(
  chunks: Array<{ index: number; byteSize?: number }>,
): Array<{ index: number; byteSize?: number }> {
  if (chunks.length <= 48) return [...chunks].sort((a, b) => a.index - b.index);
  const fulls = chunks.filter((c) => (c.byteSize ?? 0) >= 4_000);
  const sampled = chunks.filter((_, i) => i % 2 === 0);
  const recent = chunks.slice(-40);
  return [
    ...new Map([...fulls, ...sampled, ...recent].map((c) => [c.index, c] as const)).values(),
  ].sort((a, b) => a.index - b.index);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]!);
    }
  }
  const runners = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () =>
    run(),
  );
  await Promise.all(runners);
  return results;
}

/** Prefer the guest's real viewport from full/resize ops (mobile stays mobile). */
function inferViewport(ops: RecordingOp[]): { w: number; h: number } {
  let fromFullW = 0;
  let fromFullH = 0;
  let maxX = 0;
  let maxY = 0;
  for (const op of ops) {
    if (op.op === 'full' || op.op === 'resize') {
      // Latest full/resize wins — matches what the guest was actually seeing
      if (op.w > 0) fromFullW = op.w;
      if (op.h > 0) fromFullH = op.h;
    }
    if (op.op === 'mm' || op.op === 'click') {
      maxX = Math.max(maxX, op.x || 0);
      maxY = Math.max(maxY, op.y || 0);
    }
  }
  let w = fromFullW || (maxX > 0 ? Math.ceil(maxX + 48) : 0) || 390;
  let h = fromFullH || (maxY > 0 ? Math.ceil(maxY + 48) : 0) || 844;
  // Only expand to cover cursor if recorded viewport was slightly too small
  if (maxX > w) w = Math.ceil(maxX + 24);
  if (maxY > h) h = Math.ceil(maxY + 24);
  w = Math.min(Math.max(w, 280), 2560);
  h = Math.min(Math.max(h, 400), 2400);
  return { w, h };
}

function deviceLabelForViewport(w: number, h: number): 'Mobile' | 'Tablet' | 'Desktop' {
  const shortSide = Math.min(w, h);
  if (shortSide < 600) return 'Mobile';
  if (shortSide < 900) return 'Tablet';
  return 'Desktop';
}

function clampFrameSize(w: number, h: number): { w: number; h: number } {
  return {
    w: Math.min(Math.max(Math.round(w) || 390, 280), 2560),
    h: Math.min(Math.max(Math.round(h) || 844, 400), 2400),
  };
}

function applyMutation(doc: Document, m: SerializedMutation): void {
  let target: Element | null = null;
  try {
    target = doc.querySelector(m.target);
  } catch {
    target = null;
  }
  if (!target) return;

  switch (m.type) {
    case 'attributes':
      if (m.attributeName) {
        if (m.oldValue == null) target.removeAttribute(m.attributeName);
        else target.setAttribute(m.attributeName, m.oldValue);
      }
      break;
    case 'characterData':
      if (m.text != null) target.textContent = m.text;
      break;
    case 'childList':
      if (m.removed?.length) {
        for (const sel of m.removed) {
          try {
            doc.querySelector(sel)?.remove();
          } catch {
            // ignore
          }
        }
      }
      if (m.added?.length) {
        for (const html of m.added) {
          try {
            target.insertAdjacentHTML('beforeend', html);
          } catch {
            // ignore
          }
        }
      }
      break;
    default: {
      const _exhaustive: never = m.type;
      void _exhaustive;
      break;
    }
  }
}

function ensureReplayBase(html: string): string {
  if (!html || /<base\s/i.test(html)) return html;
  const base = `${window.location.origin}/`;
  const tag = `<base href="${base}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${tag}`);
  }
  return `<!DOCTYPE html><html><head>${tag}</head><body>${html}</body></html>`;
}

function applyOp(
  iframe: HTMLIFrameElement,
  op: RecordingOp,
  cursor: HTMLDivElement | null,
  frame: { w: number; h: number },
  onFrameSize?: (w: number, h: number) => void,
): void {
  const doc = iframe.contentDocument;
  if (!doc) return;

  const applyFrame = (w: number, h: number) => {
    // Use the guest viewport as recorded — do not force desktop minimums
    const next = clampFrameSize(w || frame.w, h || frame.h);
    iframe.style.width = `${next.w}px`;
    iframe.style.height = `${next.h}px`;
    iframe.setAttribute('width', String(next.w));
    iframe.setAttribute('height', String(next.h));
    onFrameSize?.(next.w, next.h);
  };

  switch (op.op) {
    case 'full': {
      // Tiny/empty snapshots (failed capture / truncated) must not wipe a good frame
      if ((op.html?.length ?? 0) < 500) {
        console.warn('[va] skipping undersized full snapshot', op.html?.length ?? 0);
        applyFrame(op.w || frame.w, op.h || frame.h);
        break;
      }
      const html = ensureReplayBase(op.html || '<html><body></body></html>');
      // Always size before write so we never leave the browser's ~300×150 default
      applyFrame(op.w || frame.w, op.h || frame.h);
      try {
        doc.open();
        doc.write(html);
        doc.close();
      } catch (err) {
        console.warn('[va] failed to paint full snapshot', err);
      }
      // Re-apply after write (some browsers reset iframe chrome size)
      applyFrame(op.w || frame.w, op.h || frame.h);
      break;
    }
    case 'mut':
      for (const m of op.mutations || []) applyMutation(doc, m);
      break;
    case 'mm':
      if (cursor) {
        cursor.style.display = 'block';
        cursor.style.transform = `translate(${op.x}px, ${op.y}px)`;
      }
      break;
    case 'click':
      if (cursor) {
        cursor.style.display = 'block';
        cursor.style.transform = `translate(${op.x}px, ${op.y}px)`;
        cursor.classList.add('va-click-flash');
        setTimeout(() => cursor.classList.remove('va-click-flash'), 200);
      }
      break;
    case 'scroll': {
      iframe.contentWindow?.scrollTo(op.x, op.y);
      break;
    }
    case 'input': {
      try {
        const el = doc.querySelector(op.sel) as HTMLInputElement | HTMLTextAreaElement | null;
        if (el) el.value = op.v;
      } catch {
        // ignore
      }
      break;
    }
    case 'resize': {
      applyFrame(op.w || frame.w, op.h || frame.h);
      break;
    }
    case 'key':
    case 'vis':
    case 'focus':
    case 'blur':
      break;
    default: {
      const _exhaustive: never = op;
      void _exhaustive;
      break;
    }
  }
}

function opLabel(op: RecordingOp): string {
  switch (op.op) {
    case 'full':
      return 'Full snapshot';
    case 'mut':
      return `DOM mutation (${op.mutations.length})`;
    case 'mm':
      return 'Mouse move';
    case 'click':
      return `Click (${op.x},${op.y})`;
    case 'scroll':
      return `Scroll ${op.d}%`;
    case 'input':
      return 'Input';
    case 'key':
      return `Key ${op.k}`;
    case 'resize':
      return `Resize ${op.w}×${op.h}`;
    case 'vis':
      return `Visibility ${op.state}`;
    case 'focus':
      return 'Focus';
    case 'blur':
      return 'Blur';
    default: {
      const _exhaustive: never = op;
      return String(_exhaustive);
    }
  }
}

function formatTime(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(clamped / 60);
  const r = clamped % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function indexAtTime(list: RecordingOp[], absMs: number): number {
  let idx = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i]!.t <= absMs) idx = i;
    else break;
  }
  return idx;
}

interface SessionReplayPlayerProps {
  sessionId: string;
  onClose?: () => void;
  live?: boolean;
}

export function SessionReplayPlayer({ sessionId, onClose, live = false }: SessionReplayPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const seekRafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const opsRef = useRef<RecordingOp[]>([]);
  const seenKeysRef = useRef<Set<string>>(new Set());
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef<Speed>(1);
  const timeAbsRef = useRef(0);
  const t0Ref = useRef(0);
  const hasFullRef = useRef(false);
  const pendingLiveRef = useRef<RecordingOp[]>([]);
  const opsStateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followLiveRef = useRef(live);
  const scrubbingRef = useRef(false);
  const frameSizeRef = useRef({ w: 1280, h: 720 });

  const [loading, setLoading] = useState(true);
  const [waitingSnapshot, setWaitingSnapshot] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [currentRel, setCurrentRel] = useState(0);
  const [durationRel, setDurationRel] = useState(0);
  const [ops, setOps] = useState<RecordingOp[]>([]);
  const [eventIndex, setEventIndex] = useState(0);
  const [liveConnected, setLiveConnected] = useState(false);
  const [frameW, setFrameW] = useState(1280);
  const [frameH, setFrameH] = useState(720);
  const [fitScale, setFitScale] = useState(0.7);
  const [followLive, setFollowLive] = useState(live);

  const setFrameSize = useCallback((w: number, h: number) => {
    const next = clampFrameSize(w, h);
    frameSizeRef.current = next;
    setFrameW(next.w);
    setFrameH(next.h);
  }, []);

  const deviceLabel = useMemo(() => deviceLabelForViewport(frameW, frameH), [frameW, frameH]);
  const isMobileFrame = deviceLabel === 'Mobile';

  useEffect(() => {
    followLiveRef.current = followLive;
  }, [followLive]);

  useEffect(() => {
    setFollowLive(live);
    followLiveRef.current = live;
    scrubbingRef.current = false;
    seenKeysRef.current = new Set();
    t0Ref.current = 0;
    timeAbsRef.current = 0;
    setCurrentRel(0);
    setDurationRel(0);
    setFrameSize(1280, 720);
  }, [live, sessionId, setFrameSize]);

  const paintOp = useCallback((iframe: HTMLIFrameElement, op: RecordingOp) => {
    applyOp(iframe, op, cursorRef.current, frameSizeRef.current, setFrameSize);
  }, [setFrameSize]);

  const syncTimelineMeta = useCallback((list: RecordingOp[]) => {
    if (!list.length) {
      t0Ref.current = 0;
      setDurationRel(0);
      setOps(list);
      return;
    }
    if (!t0Ref.current) t0Ref.current = list[0]!.t;
    setDurationRel(Math.max(0, list[list.length - 1]!.t - t0Ref.current));
    setOps(list);
    const vp = inferViewport(list);
    setFrameSize(vp.w, vp.h);
  }, [setFrameSize]);

  const setTimeAbs = useCallback((abs: number, eventIdx?: number) => {
    timeAbsRef.current = abs;
    setCurrentRel(Math.max(0, abs - t0Ref.current));
    if (eventIdx != null) setEventIndex(eventIdx);
  }, []);

  // Fit guest viewport into the stage (mobile phones scale to height + width)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const availW = Math.max(el.clientWidth - (isMobileFrame ? 48 : 16), 1);
      const availH = Math.max(el.clientHeight - (isMobileFrame ? 48 : 16), 1);
      const scale = Math.min(1, availW / Math.max(frameW, 1), availH / Math.max(frameH, 1));
      setFitScale(Number.isFinite(scale) && scale > 0 ? scale : 0.7);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [frameW, frameH, isMobileFrame]);

  // Keep the iframe element sized to the stage viewport even before the first full paints
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.style.width = `${frameW}px`;
    iframe.style.height = `${frameH}px`;
    iframe.setAttribute('width', String(frameW));
    iframe.setAttribute('height', String(frameH));
  }, [frameW, frameH]);

  const timeline = useMemo<TimelineEvent[]>(() => {
    const t0 = t0Ref.current;
    return ops
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => o.op !== 'mm')
      .map(({ o, i }) => ({
        tAbs: o.t,
        tRel: Math.max(0, o.t - t0),
        label: opLabel(o),
        op: o.op,
        index: i,
      }));
  }, [ops]);

  const rebuildTo = useCallback(
    (targetIndex: number) => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const list = opsRef.current;
      if (!list.length) return;
      const idx = Math.max(0, Math.min(targetIndex, list.length - 1));

      // Prefer the latest usable full snapshot at or before the seek target
      let start = -1;
      for (let i = 0; i <= idx; i++) {
        const op = list[i];
        if (op?.op === 'full' && (op.html?.length ?? 0) >= 500) start = i;
      }
      if (start < 0) {
        for (let i = 0; i < list.length; i++) {
          const op = list[i];
          if (op?.op === 'full' && (op.html?.length ?? 0) >= 500) {
            start = i;
            break;
          }
        }
      }
      if (start < 0) {
        setWaitingSnapshot(true);
        return;
      }

      setWaitingSnapshot(false);
      const paintUntil = Math.max(start, idx);
      for (let i = start; i <= paintUntil; i++) {
        const op = list[i]!;
        // Never apply a later tiny full that would blank the page mid-rebuild
        if (op.op === 'full' && (op.html?.length ?? 0) < 500) continue;
        paintOp(iframe, op);
      }
      indexRef.current = paintUntil + 1;
      setTimeAbs(list[paintUntil]!.t, paintUntil);
    },
    [paintOp, setTimeAbs],
  );

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const stopFollowLive = useCallback(() => {
    if (!live) return;
    followLiveRef.current = false;
    setFollowLive(false);
  }, [live]);

  const tick = useCallback(
    (now: number) => {
      if (!playingRef.current) return;
      const dt = (now - lastTickRef.current) * speedRef.current;
      lastTickRef.current = now;
      timeAbsRef.current += dt;

      const list = opsRef.current;
      const iframe = iframeRef.current;
      while (indexRef.current < list.length && list[indexRef.current]!.t <= timeAbsRef.current) {
        const op = list[indexRef.current]!;
        if (!(op.op === 'full' && (op.html?.length ?? 0) < 500) && iframe) {
          paintOp(iframe, op);
        }
        indexRef.current += 1;
      }

      setTimeAbs(timeAbsRef.current, Math.max(0, indexRef.current - 1));

      const endAbs = list.length ? list[list.length - 1]!.t : 0;
      if (indexRef.current >= list.length || timeAbsRef.current >= endAbs) {
        playingRef.current = false;
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [paintOp, setTimeAbs],
  );

  const play = useCallback(() => {
    if (!opsRef.current.length) return;
    stopFollowLive();
    const list = opsRef.current;
    const endAbs = list[list.length - 1]!.t;
    if (indexRef.current >= list.length || timeAbsRef.current >= endAbs) {
      rebuildTo(0);
    }
    playingRef.current = true;
    setPlaying(true);
    lastTickRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [rebuildTo, tick, stopFollowLive]);

  const seekRel = useCallback(
    (relMs: number, opts?: { preview?: boolean }) => {
      if (!opts?.preview) {
        pause();
        stopFollowLive();
        scrubbingRef.current = false;
      }
      const abs = t0Ref.current + Math.max(0, relMs);
      const idx = indexAtTime(opsRef.current, abs);
      rebuildTo(idx);
    },
    [pause, rebuildTo, stopFollowLive],
  );

  const onScrubInput = useCallback(
    (relMs: number) => {
      scrubbingRef.current = true;
      stopFollowLive();
      pause();
      setCurrentRel(relMs);
      timeAbsRef.current = t0Ref.current + relMs;
      if (seekRafRef.current != null) cancelAnimationFrame(seekRafRef.current);
      seekRafRef.current = requestAnimationFrame(() => {
        seekRel(relMs, { preview: true });
      });
    },
    [pause, seekRel, stopFollowLive],
  );

  const onScrubCommit = useCallback(
    (relMs: number) => {
      if (seekRafRef.current != null) cancelAnimationFrame(seekRafRef.current);
      scrubbingRef.current = false;
      seekRel(relMs);
    },
    [seekRel],
  );

  const jumpToEvent = useCallback(
    (index: number) => {
      pause();
      stopFollowLive();
      rebuildTo(index);
    },
    [pause, rebuildTo, stopFollowLive],
  );

  const jumpToLive = useCallback(() => {
    const list = opsRef.current;
    if (!list.length) return;
    followLiveRef.current = true;
    setFollowLive(true);
    scrubbingRef.current = false;
    pause();
    rebuildTo(list.length - 1);
  }, [pause, rebuildTo]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const flushOpsState = useCallback(() => {
    if (opsStateTimer.current) clearTimeout(opsStateTimer.current);
    opsStateTimer.current = setTimeout(() => {
      const list = opsRef.current;
      syncTimelineMeta(list);
      if (
        live &&
        followLiveRef.current &&
        !scrubbingRef.current &&
        !playingRef.current &&
        list.length
      ) {
        setTimeAbs(list[list.length - 1]!.t, list.length - 1);
      }
    }, live ? 150 : 0);
  }, [live, syncTimelineMeta, setTimeAbs]);

  const mergeOps = useCallback((incoming: RecordingOp[]): RecordingOp[] => {
    const added: RecordingOp[] = [];
    for (const op of incoming) {
      const key = opDedupeKey(op);
      if (seenKeysRef.current.has(key)) continue;
      seenKeysRef.current.add(key);
      added.push(op);
    }
    if (!added.length) return [];
    opsRef.current = [...opsRef.current, ...added].sort((a, b) => a.t - b.t);
    return added;
  }, []);

  const appendLiveOps = useCallback(
    (incoming: RecordingOp[]) => {
      if (!incoming.length) return;
      const iframe = iframeRef.current;
      const sorted = [...incoming].sort((a, b) => a.t - b.t);
      const following = live && followLiveRef.current && !scrubbingRef.current;

      if (live && !hasFullRef.current) {
        const full = sorted.find((o) => o.op === 'full');
        if (!full) {
          pendingLiveRef.current.push(...sorted);
          if (pendingLiveRef.current.length > 400) {
            pendingLiveRef.current = pendingLiveRef.current.slice(-200);
          }
          setWaitingSnapshot(true);
          return;
        }
        hasFullRef.current = true;
        setWaitingSnapshot(false);
        const buffered = pendingLiveRef.current.splice(0);
        const after = [
          ...buffered.filter((o) => o.op !== 'full' && o.t >= full.t),
          ...sorted.filter((o) => o !== full && o.t >= full.t),
        ];
        mergeOps([full, ...after]);
        if (following) rebuildTo(opsRef.current.length - 1);
        flushOpsState();
        return;
      }

      const added = mergeOps(sorted);
      if (!added.length) return;

      const hadFull = added.some((o) => o.op === 'full');
      if (hadFull) {
        hasFullRef.current = true;
        setWaitingSnapshot(false);
      }

      if (following && iframe) {
        // New full snapshot = hard resync to live tip (keeps view matching visitor)
        if (hadFull) {
          rebuildTo(opsRef.current.length - 1);
        } else {
          for (const op of added) paintOp(iframe, op);
          indexRef.current = opsRef.current.length;
          timeAbsRef.current = opsRef.current[opsRef.current.length - 1]!.t;
        }
      }
      flushOpsState();
    },
    [live, flushOpsState, paintOp, mergeOps, rebuildTo],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setWaitingSnapshot(!!live);
      seenKeysRef.current = new Set();
      opsRef.current = [];
      t0Ref.current = 0;
      try {
        const { recording } = await getRecording(sessionId);
        if (cancelled) return;
        if (!recording?.hasRecording || !recording.chunks?.length) {
          if (!live) {
            toast.error('No recording available for this session');
            setOps([]);
            return;
          }
          opsRef.current = [];
          setOps([]);
          setDurationRel(0);
          return;
        }

        if (live) {
          const newestFulls = [...recording.chunks]
            .filter((c) => (c.byteSize ?? 0) >= 4_000)
            .sort((a, b) => (b.byteSize ?? 0) - (a.byteSize ?? 0));
          let best: RecordingOp | null = null;
          for (const c of newestFulls.slice(0, 8)) {
            const chunkOps = await fetchChunkOps(sessionId, c.index).catch(() => [] as RecordingOp[]);
            const full = [...chunkOps]
              .reverse()
              .find((o) => o.op === 'full' && (o.html?.length ?? 0) >= 500);
            if (!full || full.op !== 'full') continue;
            if (!best || best.op !== 'full' || full.html.length > best.html.length) {
              best = full;
            }
          }
          if (best && best.op === 'full') {
            hasFullRef.current = true;
            setWaitingSnapshot(false);
            setLoading(false);
            mergeOps([best]);
            syncTimelineMeta(opsRef.current);
            setTimeAbs(best.t, 0);
            requestAnimationFrame(() => {
              const iframe = iframeRef.current;
              if (iframe) paintOp(iframe, best!);
            });
          }
        }

        const chunkList = prioritizeChunks(recording.chunks);
        let missingFiles = 0;
        const parts = await mapPool(chunkList, 3, async (chunk) => {
          try {
            return await fetchChunkOps(sessionId, chunk.index);
          } catch {
            missingFiles += 1;
            return [] as RecordingOp[];
          }
        });
        let all = parts.flat().sort((a, b) => a.t - b.t);
        const hasFull = all.some((o) => o.op === 'full');
        if (cancelled) return;

        if (!hasFull && !live) {
          toast.error(
            missingFiles > 0 || recording.chunks.length > 0
              ? 'This recording’s page snapshot is missing (often wiped on server redeploy). Open a new visitor session after the latest deploy — keep the tab open ~5s.'
              : 'Recording has no page snapshot yet. Keep the visitor tab open ~5s, then open a newer session.',
          );
        }

        seenKeysRef.current = new Set();
        opsRef.current = [];
        mergeOps(all);
        all = opsRef.current;
        hasFullRef.current = hasFull;
        setWaitingSnapshot(live && !hasFull);
        t0Ref.current = all[0]?.t ?? 0;
        syncTimelineMeta(all);
        requestAnimationFrame(() => {
          if (all.length) rebuildTo(live ? all.length - 1 : 0);
          if (live) {
            playingRef.current = false;
            setPlaying(false);
            followLiveRef.current = true;
            setFollowLive(true);
          }
        });
      } catch (e) {
        if (!cancelled) {
          if (live) console.warn('[va] initial recording load failed', e);
          else toast.error(e instanceof Error ? e.message : 'Failed to load recording');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      pause();
      if (opsStateTimer.current) clearTimeout(opsStateTimer.current);
      if (seekRafRef.current != null) cancelAnimationFrame(seekRafRef.current);
    };
  }, [sessionId, rebuildTo, pause, live, paintOp, mergeOps, syncTimelineMeta, setTimeAbs]);

  // Live: refresh newest full snapshots
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const poll = async () => {
      if (scrubbingRef.current || playingRef.current) return;
      try {
        const { recording } = await getRecording(sessionId);
        if (cancelled || !recording?.chunks?.length) return;
        const candidates = [...recording.chunks]
          .filter((c) => (c.byteSize ?? 0) >= 4_000)
          .sort((a, b) => b.index - a.index)
          .slice(0, 2);
        for (const c of candidates) {
          const chunkOps = await fetchChunkOps(sessionId, c.index);
          const full = [...chunkOps].reverse().find((o) => o.op === 'full');
          if (!full) continue;
          const prev = [...opsRef.current].reverse().find((o) => o.op === 'full');
          if (
            prev?.op === 'full' &&
            full.op === 'full' &&
            prev.html.length === full.html.length &&
            prev.t === full.t
          ) {
            return;
          }
          appendLiveOps(chunkOps.some((o) => o.op === 'full') ? chunkOps : [full]);
          return;
        }
      } catch {
        // ignore
      }
    };
    const id = window.setInterval(() => void poll(), 2500);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [live, sessionId, appendLiveOps]);

  useEffect(() => {
    if (!live) return;
    const siteId = getStoredSiteId();
    const token = getStoredVaToken();
    if (!siteId || !token) return;

    const ws = new VaWebSocket({ role: 'dashboard', siteId, token });
    ws.connect();
    setLiveConnected(true);

    const off = ws.on((msg: WsEnvelope) => {
      if (msg.type !== 'recording.live') return;
      const payload = msg.payload as {
        sessionId?: string;
        events?: unknown[];
        fetchChunk?: boolean;
        chunkIndex?: number;
        hasFull?: boolean;
      };
      if (payload.sessionId !== sessionId) return;

      void (async () => {
        if (payload.hasFull && payload.chunkIndex != null) {
          try {
            const events = await fetchChunkOps(sessionId, payload.chunkIndex);
            if (events.length) appendLiveOps(events);
          } catch {
            return;
          }
          return;
        }
        let events = Array.isArray(payload.events) ? payload.events.filter(isRecordingOp) : [];
        if ((!events.length || payload.fetchChunk) && payload.chunkIndex != null) {
          try {
            events = await fetchChunkOps(sessionId, payload.chunkIndex);
          } catch {
            return;
          }
        }
        if (events.length) appendLiveOps(events);
      })();
    });

    return () => {
      off();
      ws.close();
      setLiveConnected(false);
    };
  }, [live, sessionId, appendLiveOps]);

  const sliderMax = Math.max(durationRel, 1);
  const sliderValue = Math.min(Math.max(0, currentRel), sliderMax);

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base font-semibold text-slate-900">
            {live ? 'Live session' : 'Session replay'}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {sessionId.slice(0, 8)}…
          </Badge>
          {live && (
            <Badge
              className={
                followLive && liveConnected
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1'
                  : 'bg-slate-100 text-slate-600 gap-1'
              }
            >
              <span className="relative flex h-2 w-2">
                {followLive && liveConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    followLive && liveConnected ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </span>
              {followLive ? (liveConnected ? 'LIVE' : 'Connecting…') : 'Paused follow'}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs gap-1 font-medium">
            {deviceLabel === 'Mobile' ? (
              <Smartphone className="h-3 w-3" />
            ) : deviceLabel === 'Tablet' ? (
              <Tablet className="h-3 w-3" />
            ) : (
              <Monitor className="h-3 w-3" />
            )}
            {deviceLabel}
            <span className="text-slate-400 font-normal tabular-nums">
              {frameW}×{frameH}
            </span>
          </Badge>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading recording chunks…
          </div>
        ) : (
          <>
            <div
              ref={stageRef}
              className={`relative w-full overflow-auto rounded-lg border border-slate-200 ${
                isMobileFrame ? 'bg-slate-800 flex items-start justify-center p-4' : 'bg-slate-300'
              }`}
              style={{ maxHeight: 'min(720px, 70vh)', minHeight: 360 }}
            >
              {waitingSnapshot && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/50 text-white text-sm gap-2 px-4 text-center">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Waiting for page snapshot… keep the visitor tab open a few seconds, then Jump to live
                </div>
              )}
              <div
                className={isMobileFrame ? 'relative shrink-0 rounded-[1.75rem] bg-black p-2 shadow-xl' : 'relative'}
                style={{
                  width: frameW * fitScale + (isMobileFrame ? 16 : 0),
                  height: frameH * fitScale + (isMobileFrame ? 16 : 0),
                }}
              >
                <div
                  className="absolute origin-top-left overflow-hidden bg-white"
                  style={{
                    top: isMobileFrame ? 8 : 0,
                    left: isMobileFrame ? 8 : 0,
                    width: frameW,
                    height: frameH,
                    transform: `scale(${fitScale})`,
                    borderRadius: isMobileFrame ? '1.25rem' : 0,
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    title="Session replay"
                    sandbox="allow-same-origin allow-popups-to-escape-sandbox"
                    className="bg-white border-0 block"
                    style={{ width: frameW, height: frameH }}
                  />
                  <div
                    ref={cursorRef}
                    className="pointer-events-none absolute top-0 left-0 z-10 hidden"
                    style={{ marginLeft: -6, marginTop: -6 }}
                  >
                    <MousePointer2 className="h-4 w-4 text-amber-600 drop-shadow" />
                  </div>
                </div>
              </div>
              <style>{`
                .va-click-flash { filter: drop-shadow(0 0 6px #f59e0b); }
                .va-scrub {
                  -webkit-appearance: none;
                  appearance: none;
                  height: 8px;
                  border-radius: 999px;
                  background: #e2e8f0;
                  outline: none;
                }
                .va-scrub::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background: #d97706;
                  border: 2px solid #fff;
                  box-shadow: 0 0 0 1px #d97706;
                  cursor: pointer;
                }
                .va-scrub::-moz-range-thumb {
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background: #d97706;
                  border: 2px solid #fff;
                  cursor: pointer;
                }
              `}</style>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => (playing ? pause() : play())}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={!ops.length}
              >
                {playing ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                {playing ? 'Pause' : 'Play'}
              </Button>
              <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v) as Speed)}>
                <SelectTrigger className="w-[90px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1×</SelectItem>
                  <SelectItem value="2">2×</SelectItem>
                  <SelectItem value="4">4×</SelectItem>
                </SelectContent>
              </Select>
              {live && !followLive && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={jumpToLive}>
                  Jump to live
                </Button>
              )}
              <span className="text-xs text-slate-500 tabular-nums ml-auto">
                {formatTime(sliderValue)} / {formatTime(durationRel)}
              </span>
            </div>

            <input
              type="range"
              className="va-scrub w-full cursor-pointer"
              min={0}
              max={sliderMax}
              step={100}
              value={sliderValue}
              disabled={!ops.length || sliderMax <= 1}
              aria-label="Seek session"
              onPointerDown={() => {
                scrubbingRef.current = true;
                stopFollowLive();
                pause();
              }}
              onInput={(e) => onScrubInput(Number((e.target as HTMLInputElement).value))}
              onChange={(e) => onScrubCommit(Number((e.target as HTMLInputElement).value))}
            />

            <div className="flex items-center gap-2">
              <SkipForward className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-600 shrink-0">Jump to event</span>
              <Select
                value={timeline.some((ev) => ev.index === eventIndex) ? String(eventIndex) : undefined}
                onValueChange={(v) => jumpToEvent(Number(v))}
              >
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {timeline.slice(0, 250).map((ev) => (
                    <SelectItem key={`${ev.index}-${ev.tAbs}-${ev.op}`} value={String(ev.index)}>
                      {formatTime(ev.tRel)} — {ev.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-slate-400">
              {ops.length} events · drag the orange handle to scrub
              {live
                ? followLive
                  ? ' · synced to live visitor'
                  : ' · scrubbing (click Jump to live to resync)'
                : ''}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SessionReplayPlayer;
