import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  listNotifications,
  markNotificationRead,
} from '@/services/api/visitorAnalyticsAPI';
import type { VaNotification } from '@/types/visitorAnalytics';

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface NotificationsBellProps {
  pollMs?: number;
  onNavigate?: (n: VaNotification) => void;
}

export function NotificationsBell({ pollMs = 30000, onNavigate }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<VaNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listNotifications(40);
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      // silent on poll
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  const handleOpen = async (next: boolean) => {
    setOpen(next);
    if (next) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  };

  const handleRead = async (n: VaNotification) => {
    if (n.is_read) {
      onNavigate?.(n);
      return;
    }
    try {
      await markNotificationRead(n.id);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x)),
      );
      setUnread((u) => Math.max(0, u - 1));
      onNavigate?.(n);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark read');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative border-slate-200">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 justify-center bg-amber-500 hover:bg-amber-500 text-[10px]">
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        </div>
        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No notifications</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleRead(n)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors ${
                      !n.is_read ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">{formatRelative(n.created_at)}</p>
                      </div>
                      {!n.is_read ? (
                        <span className="mt-1 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationsBell;
