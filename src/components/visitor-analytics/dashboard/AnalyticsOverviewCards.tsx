import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Eye,
  MessageCircle,
  CreditCard,
  MousePointerClick,
  RefreshCw,
  Phone,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { cn } from '@/lib/utils';

export interface MetricExtras {
  deltaPct?: number | null;
  sparkline?: number[];
}

export interface OverviewMetrics {
  liveCount: number;
  sessionsToday: number;
  pageviewsToday: number;
  chatsToday: number;
  whatsappClicks: number;
  phoneClicks: number;
  bookingsStarted: number;
  bookingsCompleted: number;
  paymentsSuccess: number;
  returningShare?: number;
  extras?: Partial<Record<keyof OverviewMetrics, MetricExtras>>;
}

interface AnalyticsOverviewCardsProps {
  metrics: OverviewMetrics;
  loading?: boolean;
  /** When range is not a single “today”, soften “today” labels */
  rangeLabel?: string;
}

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  if (!values.length) return null;
  const w = 72;
  const h = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const pts = values
    .map((v, i) => {
      const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

function DeltaBadge({ deltaPct }: { deltaPct?: number | null }) {
  if (deltaPct == null || Number.isNaN(deltaPct)) {
    return <span className="text-[11px] text-slate-400">—</span>;
  }
  const up = deltaPct >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums',
        up ? 'text-emerald-600' : 'text-rose-600',
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}
      {deltaPct.toFixed(0)}%
      <span className="font-normal text-slate-400 ml-0.5">vs prior</span>
    </span>
  );
}

const cards: Array<{
  key: keyof OverviewMetrics;
  label: string;
  todayLabel?: string;
  icon: React.ReactNode;
  sparkStroke: string;
  iconWrap: string;
}> = [
  {
    key: 'liveCount',
    label: 'Live now',
    icon: <Users className="h-4 w-4 text-emerald-700" />,
    sparkStroke: '#10b981',
    iconWrap: 'bg-emerald-50',
  },
  {
    key: 'sessionsToday',
    label: 'Sessions',
    todayLabel: 'Sessions today',
    icon: <RefreshCw className="h-4 w-4 text-sky-700" />,
    sparkStroke: '#0ea5e9',
    iconWrap: 'bg-sky-50',
  },
  {
    key: 'pageviewsToday',
    label: 'Pageviews',
    icon: <Eye className="h-4 w-4 text-slate-600" />,
    sparkStroke: '#64748b',
    iconWrap: 'bg-slate-100',
  },
  {
    key: 'chatsToday',
    label: 'Chats',
    icon: <MessageCircle className="h-4 w-4 text-amber-700" />,
    sparkStroke: '#d97706',
    iconWrap: 'bg-amber-50',
  },
  {
    key: 'whatsappClicks',
    label: 'WhatsApp clicks',
    icon: <FaWhatsapp className="h-4 w-4 text-emerald-600" />,
    sparkStroke: '#059669',
    iconWrap: 'bg-emerald-50',
  },
  {
    key: 'phoneClicks',
    label: 'Call clicks',
    icon: <Phone className="h-4 w-4 text-sky-600" />,
    sparkStroke: '#0284c7',
    iconWrap: 'bg-sky-50',
  },
  {
    key: 'bookingsStarted',
    label: 'Bookings started',
    icon: <MousePointerClick className="h-4 w-4 text-orange-600" />,
    sparkStroke: '#ea580c',
    iconWrap: 'bg-orange-50',
  },
  {
    key: 'paymentsSuccess',
    label: 'Payments',
    icon: <CreditCard className="h-4 w-4 text-amber-800" />,
    sparkStroke: '#b45309',
    iconWrap: 'bg-amber-50',
  },
];

export function AnalyticsOverviewCards({
  metrics,
  loading,
  rangeLabel,
}: AnalyticsOverviewCardsProps) {
  const isTodayFocused = !rangeLabel || rangeLabel === 'today';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {cards.map((c) => {
        const raw = metrics[c.key];
        const value = typeof raw === 'number' ? raw : 0;
        const extras = metrics.extras?.[c.key];
        const label =
          isTodayFocused && c.todayLabel ? c.todayLabel : c.label;
        return (
          <Card
            key={c.key}
            className="border-slate-200/80 bg-white shadow-sm overflow-hidden"
          >
            <CardContent className="p-3.5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide leading-tight">
                  {label}
                </span>
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    c.iconWrap,
                  )}
                >
                  {c.icon}
                </span>
              </div>
              <p className="text-2xl font-semibold text-slate-900 tabular-nums tracking-tight">
                {loading ? '—' : value.toLocaleString()}
              </p>
              <div className="mt-1.5 flex items-end justify-between gap-1 min-h-[28px]">
                <div>
                  {c.key === 'liveCount' ? (
                    <span className="text-[11px] text-slate-400">Realtime</span>
                  ) : (
                    <DeltaBadge deltaPct={extras?.deltaPct} />
                  )}
                  {c.key === 'bookingsStarted' && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {metrics.bookingsCompleted} completed
                    </p>
                  )}
                </div>
                {extras?.sparkline && extras.sparkline.length > 1 ? (
                  <Sparkline values={extras.sparkline} stroke={c.sparkStroke} />
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default AnalyticsOverviewCards;
