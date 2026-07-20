import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink, Loader2, MessageSquare, RefreshCw, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import { SmartBudgetChatThread } from '@/components/smart-budget/SmartBudgetChatThread';
import {
  formatSmartBudgetFeeLabel,
  formatSmartBudgetStatus,
  isSmartBudgetTerminal,
  type SmartBudgetAdminCustomer,
  type SmartBudgetAdminCustomerSummary,
  type SmartBudgetMessage,
  type SmartBudgetSession,
} from '@/types/smartBudget';

export function SmartBudgetCustomersAdmin() {
  const [customers, setCustomers] = useState<SmartBudgetAdminCustomer[]>([]);
  const [summary, setSummary] = useState<SmartBudgetAdminCustomerSummary | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [bids, setBids] = useState<SmartBudgetSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBids, setLoadingBids] = useState(false);
  const [bidsTick, setBidsTick] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [chatSession, setChatSession] = useState<SmartBudgetSession | null>(null);
  const [chatMessages, setChatMessages] = useState<SmartBudgetMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await smartBudgetAPI.admin.listCustomers({
        q: debouncedQuery || undefined,
        limit: 200,
      });
      setCustomers(result.customers);
      setSummary(result.summary);
      setSelectedPhone((prev) => {
        if (prev && result.customers.some((c) => c.phone === prev)) return prev;
        return result.customers[0]?.phone ?? null;
      });
      // Force bids panel to reload even if the same phone stays selected.
      setBidsTick((n) => n + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load customers';
      setError(msg);
      setCustomers([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const onRefresh = () => void loadCustomers();
    window.addEventListener('sb-admin-refresh-customers', onRefresh);
    return () => window.removeEventListener('sb-admin-refresh-customers', onRefresh);
  }, [loadCustomers]);

  useEffect(() => {
    if (!selectedPhone) {
      setBids([]);
      return;
    }
    let cancelled = false;
    setLoadingBids(true);
    void smartBudgetAPI.admin
      .listCustomerBids(selectedPhone)
      .then((list) => {
        if (!cancelled) setBids(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setBids([]);
          toast.error(err instanceof Error ? err.message : 'Failed to load bids');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBids(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPhone, bidsTick]);

  const openChat = async (bid: SmartBudgetSession) => {
    setChatSession(bid);
    setChatMessages([]);
    setLoadingChat(true);
    try {
      const msgs = await smartBudgetAPI.admin.getMessages(bid.id);
      setChatMessages(msgs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load chat');
    } finally {
      setLoadingChat(false);
    }
  };

  const refreshChat = async () => {
    if (!chatSession) return;
    setLoadingChat(true);
    try {
      const msgs = await smartBudgetAPI.admin.getMessages(chatSession.id);
      setChatMessages(msgs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh chat');
    } finally {
      setLoadingChat(false);
    }
  };

  const selected = customers.find((c) => c.phone === selectedPhone) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-700" />
            Customers & bids
          </h2>
          <p className="text-xs text-muted-foreground">
            Customers who posted a bid — offer-link WhatsApp OTP or customer portal (after signup
            OTP). Portal accounts with no trips are hidden.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/smart-budget/customer/login" target="_blank">
              Customer login
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadCustomers()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Posted customers</p>
              <p className="text-lg font-semibold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Portal accounts</p>
              <p className="text-lg font-semibold">{summary.with_portal}</p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase text-muted-foreground">OTP link trips</p>
              <p className="text-lg font-semibold">{summary.otp_link_trips ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Portal trips</p>
              <p className="text-lg font-semibold">{summary.portal_trips ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load customers</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer list</CardTitle>
            <CardDescription className="text-xs">Search by name or phone</CardDescription>
            <Input
              className="mt-2 h-9"
              placeholder="Search name, phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </CardHeader>
          <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : customers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No posted trips yet (OTP link or portal).
              </p>
            ) : (
              customers.map((customer) => (
                <button
                  key={customer.phone}
                  type="button"
                  onClick={() => setSelectedPhone(customer.phone)}
                  className={`w-full rounded-lg border p-3 text-left transition hover:border-emerald-400 ${
                    selectedPhone === customer.phone ? 'border-emerald-600 bg-emerald-50/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{customer.name || 'Customer'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">+91 {customer.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={customer.has_portal_login ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {customer.has_portal_login ? 'Portal' : 'OTP link'}
                      </Badge>
                      {(customer.portal_trip_count ?? 0) > 0 &&
                        (customer.otp_link_count ?? 0) > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            Both sources
                          </Badge>
                        )}
                      <Badge variant="outline" className="text-[10px]">
                        {customer.sessions_count} bid{customer.sessions_count === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    <span>{customer.active_count} active</span>
                    {customer.max_budget != null && (
                      <>
                        <span>·</span>
                        <span>Max ₹{Number(customer.max_budget).toLocaleString('en-IN')}</span>
                      </>
                    )}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selected ? `Bids · +91 ${selected.phone}` : 'Customer bids'}
            </CardTitle>
            <CardDescription className="text-xs">
              {selected
                ? `${selected.name || 'Customer'} · ${
                    loadingBids ? 'Loading…' : `${bids.length} Smart Budget session(s)`
                  }`
                : 'Select a customer to view their budgets / trips'}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
            {!selected ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Select a customer.</p>
            ) : loadingBids ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : bids.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No bids for this phone.</p>
            ) : (
              bids.map((bid) => (
                <div key={bid.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {bid.pickup} → {bid.drop_location || 'Local / package'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {bid.trip_datetime
                          ? new Date(bid.trip_datetime).toLocaleString('en-IN')
                          : 'Schedule TBD'}
                        {bid.vehicle_type ? ` · ${bid.vehicle_type}` : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {formatSmartBudgetStatus(bid.status)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>
                      Bid{' '}
                      {bid.customer_budget != null
                        ? `₹${Number(bid.customer_budget).toLocaleString('en-IN')}`
                        : '—'}
                    </span>
                    <span>·</span>
                    <span>{formatSmartBudgetFeeLabel(bid)}</span>
                    {bid.vendor_name ? (
                      <>
                        <span>·</span>
                        <span>Vendor: {bid.vendor_name}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="h-7 bg-emerald-700 text-[11px] hover:bg-emerald-800"
                      onClick={() => void openChat(bid)}
                    >
                      <MessageSquare className="mr-1 h-3 w-3" />
                      View chat
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                      <Link to={`/smart-budget/s/${bid.token}`} target="_blank">
                        Open trip <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        toast.message(`Session #${bid.id}`, {
                          description: 'Switch to Negotiations tab to manage this trip.',
                        });
                      }}
                    >
                      Session #{bid.id}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(chatSession)}
        onOpenChange={(open) => {
          if (!open) {
            setChatSession(null);
            setChatMessages([]);
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-3 overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-700" />
              Trip chat
              {chatSession ? ` · #${chatSession.id}` : ''}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {chatSession
                ? `${chatSession.pickup} → ${chatSession.drop_location || 'Local'} · ${formatSmartBudgetStatus(chatSession.status)}${
                    chatSession.vendor_name ? ` · Vendor: ${chatSession.vendor_name}` : ''
                  }`
                : 'Customer · Vendor · Admin messages'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={loadingChat || !chatSession}
              onClick={() => void refreshChat()}
            >
              {loadingChat ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
            {chatSession ? (
              <Button asChild size="sm" variant="outline" className="h-8">
                <Link to={`/smart-budget/s/${chatSession.token}`} target="_blank">
                  Open trip <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <SmartBudgetChatThread
              messages={chatMessages}
              currentRole="admin"
              isLoading={loadingChat}
              disabled={!chatSession || isSmartBudgetTerminal(chatSession.status)}
              onSend={async (body) => {
                if (!chatSession) return;
                const msg = await smartBudgetAPI.admin.sendMessage(chatSession.id, body);
                setChatMessages((prev) => [...prev, msg]);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
