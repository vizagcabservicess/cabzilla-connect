import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  MapPin,
  Monitor,
  Phone,
  Mail,
  Tag,
  StickyNote,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addVisitorNote,
  getOperatorVisitorInfo,
  listChatOperators,
  listSiteTags,
  tagVisitor,
  untagVisitor,
} from '@/services/api/visitorAnalyticsAPI';
import type {
  ChatOperator,
  VisitorInfoResponse,
  VisitorTag,
} from '@/types/visitorAnalytics';

interface VisitorInfoSidebarProps {
  visitorId: string;
  onAssign?: (operatorId: string) => void;
  assignedOperatorId?: string | null;
  departmentLabel?: string | null;
}

export function VisitorInfoSidebar({
  visitorId,
  onAssign,
  assignedOperatorId,
  departmentLabel,
}: VisitorInfoSidebarProps) {
  const [info, setInfo] = useState<VisitorInfoResponse | null>(null);
  const [operators, setOperators] = useState<ChatOperator[]>([]);
  const [allTags, setAllTags] = useState<VisitorTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [tagName, setTagName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [visitorInfo, ops, tags] = await Promise.all([
        getOperatorVisitorInfo(visitorId),
        listChatOperators(),
        listSiteTags(),
      ]);
      setInfo(visitorInfo);
      setOperators(ops.operators || []);
      setAllTags(tags.tags || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load visitor');
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [visitorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addVisitorNote(visitorId, note.trim());
      setNote('');
      await load();
      toast.success('Note added');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async () => {
    if (!tagName.trim()) return;
    setSaving(true);
    try {
      await tagVisitor(visitorId, tagName.trim());
      setTagName('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to tag');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await untagVisitor(visitorId, tagId);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove tag');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!info) {
    return <p className="text-sm text-slate-500 p-4">Visitor not found</p>;
  }

  const v = info.visitor;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {v.name || 'Anonymous visitor'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">{v.visitor_key}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {v.is_returning ? 'Returning' : 'New'}
            </Badge>
            {departmentLabel && (
              <Badge variant="outline" className="text-[10px]">
                {departmentLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-sm text-slate-600">
          {v.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {v.phone}
            </p>
          )}
          {v.email && (
            <p className="flex items-center gap-2 truncate">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {v.email}
            </p>
          )}
          {(v.city || v.country) && (
            <p className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {[v.city, v.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        <Separator />

        {onAssign && (
          <div className="space-y-1.5">
            <Label className="text-xs">Assign operator</Label>
            <Select
              value={assignedOperatorId || ''}
              onValueChange={(id) => onAssign(id)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.name} ({op.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <Tag className="h-3.5 w-3.5" /> Tags
          </div>
          <div className="flex flex-wrap gap-1">
            {(info.tags || []).map((t) => (
              <Badge
                key={t.id}
                variant="secondary"
                className="gap-1 pr-1"
                style={t.color ? { backgroundColor: `${t.color}22`, borderColor: t.color } : undefined}
              >
                {t.name}
                <button type="button" onClick={() => void handleRemoveTag(t.id)} className="hover:text-rose-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Add tag"
              className="h-8 text-xs"
              list="va-tag-suggestions"
            />
            <datalist id="va-tag-suggestions">
              {allTags.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => void handleAddTag()} disabled={saving}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <StickyNote className="h-3.5 w-3.5" /> Notes
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(info.notes || []).length === 0 ? (
              <p className="text-xs text-slate-400">No notes yet</p>
            ) : (
              info.notes.map((n) => (
                <div key={n.id} className="rounded-md bg-slate-50 border border-slate-100 p-2 text-xs text-slate-700">
                  {n.note}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            className="min-h-[60px] text-xs"
          />
          <Button size="sm" variant="outline" onClick={() => void handleAddNote()} disabled={saving || !note.trim()}>
            Save note
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5" /> Recent sessions
          </p>
          {(info.sessions || []).slice(0, 5).map((s) => (
            <div key={s.id} className="text-xs text-slate-600 border border-slate-100 rounded-md p-2">
              <p className="truncate font-medium">{s.landing_page || s.id.slice(0, 8)}</p>
              <p className="text-slate-400 mt-0.5">
                {new Date(s.started_at).toLocaleString()} · {s.device_type}
                {s.city ? ` · ${s.city}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

export default VisitorInfoSidebar;
