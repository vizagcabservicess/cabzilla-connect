import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MessageSquare, Phone, RefreshCw, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import { subscribeCustomerWebPush } from '@/services/webPushService';
import {
  SMART_BUDGET_POLL_INTERVAL_MS,
  canSmartBudgetChat,
  canSmartBudgetPayUnlock,
  formatSmartBudgetFeeLabel,
  formatSmartBudgetStatus,
  isSmartBudgetAwaitingFee,
  isSmartBudgetContactsUnlocked,
  isSmartBudgetTerminal,
  type SmartBudgetSession,
} from '@/types/smartBudget';
import { SmartBudgetCountdown } from '@/components/smart-budget/SmartBudgetCountdown';
import { CustomerPostTripForm } from '@/components/smart-budget/customer/CustomerPostTripForm';
import {
  CustomerPortalLayout,
  type CustomerPortalSection,
} from '@/components/smart-budget/customer/CustomerPortalLayout';
import { useSmartBudgetCustomerAuth } from '@/providers/SmartBudgetCustomerAuthProvider';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-base font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function CustomerDashboard() {
  const { customer, isAuthenticated, isLoading, logout, refreshCustomer } = useSmartBudgetCustomerAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<CustomerPortalSection>('post');
  const [sessions, setSessions] = useState<SmartBudgetSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(customer?.name || '');
  const [saving, setSaving] = useState(false);
  const [repostSession, setRepostSession] = useState<SmartBudgetSession | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const list = await smartBudgetAPI.customer.listMySessions();
      setSessions(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const me = await smartBudgetAPI.customer.me();
      refreshCustomer(me);
      setName(me.name || '');
    } catch {
      /* keep stored */
    }
    await loadSessions();
  }, [loadSessions, refreshCustomer]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshAll();
    void subscribeCustomerWebPush().then((result) => {
      if (!result.ok) return;
      try {
        if (sessionStorage.getItem('sb_customer_push_toast') === '1') return;
        sessionStorage.setItem('sb_customer_push_toast', '1');
      } catch {
        /* ignore */
      }
      toast.message('Booking alerts enabled', {
        description: 'You will get a notification when a partner accepts your trip.',
      });
    });
    const id = window.setInterval(() => void loadSessions(), SMART_BUDGET_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isAuthenticated, refreshAll, loadSessions]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/smart-budget/customer/login" replace />;
  }

  const activeSessions = sessions.filter((s) => !isSmartBudgetTerminal(s.status));
  const awaitingFee = sessions.filter((s) => isSmartBudgetAwaitingFee(s));
  const completed = sessions.filter((s) => s.status === 'completed' || s.status === 'fee_paid');

  const renderSessionCard = (session: SmartBudgetSession) => {
    const awaiting = isSmartBudgetAwaitingFee(session);
    const canChat = canSmartBudgetChat(session.status);
    const canPay = canSmartBudgetPayUnlock(session);
    const unlocked = isSmartBudgetContactsUnlocked(session);
    const driverLabel = session.driver_name || session.vendor_name || null;
    const vehicleParts = [session.vehicle_type, session.vehicle_number].filter(Boolean);
    const vehicleLabel = vehicleParts.length > 0 ? vehicleParts.join(' · ') : null;
    const phoneLabel = session.vendor_phone || null;
    const canRepublish =
      unlocked ||
      session.status === 'fee_paid' ||
      session.status === 'completed' ||
      session.status === 'expired' ||
      session.status === 'cancelled';

    return (
      <div
        key={session.id}
        className={`rounded-2xl border bg-white p-4 shadow-sm ${
          awaiting ? 'border-amber-300' : 'border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">
              {session.pickup} → {session.drop_location || 'Local / package'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {session.trip_datetime
                ? new Date(session.trip_datetime).toLocaleString('en-IN')
                : 'Schedule TBD'}
              {session.vehicle_type ? ` · ${session.vehicle_type}` : ''}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] capitalize">
            {formatSmartBudgetStatus(session.status)}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {session.customer_budget != null && (
            <span>Budget ₹{Number(session.customer_budget).toLocaleString('en-IN')}</span>
          )}
          {awaiting && <span className="text-amber-800">{formatSmartBudgetFeeLabel(session)}</span>}
          {session.marketplace_expires_at && session.status === 'marketplace' && (
            <span className="inline-flex items-center gap-1">
              Ends <SmartBudgetCountdown expiresAt={session.marketplace_expires_at} />
            </span>
          )}
          {session.admin_priority_ends_at && session.status === 'admin_priority' && (
            <span className="inline-flex items-center gap-1 text-blue-800">
              Admin review <SmartBudgetCountdown expiresAt={session.admin_priority_ends_at} />
            </span>
          )}
          {session.fee_due_at && awaiting && (
            <span className="inline-flex items-center gap-1 text-amber-900">
              Fee due <SmartBudgetCountdown expiresAt={session.fee_due_at} />
            </span>
          )}
        </div>

        {unlocked ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-950">
            <p className="font-semibold text-emerald-900">Driver & vehicle</p>
            <div className="mt-1 space-y-0.5">
              <p>Driver: {driverLabel || '—'}</p>
              <p>Vehicle: {vehicleLabel || '—'}</p>
              <p className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" />
                {phoneLabel ? (
                  <a className="underline" href={`tel:${phoneLabel}`}>
                    {phoneLabel}
                  </a>
                ) : (
                  <span>—</span>
                )}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link to={`/smart-budget/s/${session.token}`}>Open trip</Link>
          </Button>
          {canChat && (
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link to={`/smart-budget/s/${session.token}/chat`}>
                <MessageSquare className="mr-1 h-3.5 w-3.5" />
                Chat
              </Link>
            </Button>
          )}
          {canPay && (
            <Button asChild size="sm" className="h-8 bg-emerald-700 text-xs hover:bg-emerald-800">
              <Link to={`/smart-budget/s/${session.token}/pay`}>
                <Wallet className="mr-1 h-3.5 w-3.5" />
                Pay 10% fee
              </Link>
            </Button>
          )}
          {canRepublish && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                setRepostSession(session);
                setSection('post');
              }}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Republish
            </Button>
          )}
        </div>
      </div>
    );
  };

  let body: ReactNode = null;
  switch (section) {
    case 'post':
      body = (
        <CustomerPostTripForm
          key={repostSession ? `repost-${repostSession.id}` : 'new-trip'}
          customerName={customer?.name || name || ''}
          customerPhone={customer?.phone || ''}
          prefillFromSession={repostSession}
          onCreated={(session) => {
            setRepostSession(null);
            setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
            if (session.token) {
              navigate(`/smart-budget/s/${session.token}`);
            } else {
              setSection('bookings');
            }
          }}
        />
      );
      break;
    case 'dashboard':
      body = (
        <div className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not load bookings</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-none">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-800">
                Hello{customer?.name ? `, ${customer.name}` : ''}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Post a trip with your budget, track negotiations, chat with vendors, and pay the unlock
                fee from one place.
              </p>
              <Button
                type="button"
                className="mt-3 bg-emerald-700 hover:bg-emerald-800"
                size="sm"
                onClick={() => {
                setRepostSession(null);
                setSection('post');
              }}
              >
                Post a new trip
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active trips" value={String(activeSessions.length)} />
            <StatCard label="Awaiting fee" value={String(awaitingFee.length)} />
            <StatCard label="Completed / unlocked" value={String(completed.length)} />
            <StatCard label="All bookings" value={String(sessions.length)} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Active trips</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSection('bookings')}>
                All bookings
              </Button>
            </div>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
              </div>
            ) : activeSessions.length === 0 ? (
              <Card className="shadow-none">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No active trips yet. Use{' '}
                  <button
                    type="button"
                    className="underline text-emerald-800"
                    onClick={() => {
                      setRepostSession(null);
                      setSection('post');
                    }}
                  >
                    Post a trip
                  </button>{' '}
                  to send your budget to vendors.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">{activeSessions.slice(0, 4).map(renderSessionCard)}</div>
            )}
          </div>
        </div>
      );
      break;
    case 'bookings':
      body = (
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not load bookings</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">
            All Smart Budget trips linked to +91 {customer?.phone}. Open a trip to submit budget,
            chat, or pay the 10% unlock fee.
          </p>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
            </div>
          ) : sessions.length === 0 ? (
            <Card className="shadow-none">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No bookings found for this number yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">{sessions.map(renderSessionCard)}</div>
          )}
        </div>
      );
      break;
    case 'profile':
      body = (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Your Smart Budget customer account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input className="h-9" value={customer?.phone || ''} disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button
              type="button"
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={saving || !name.trim()}
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  try {
                    const updated = await smartBudgetAPI.customer.updateProfile(name.trim());
                    refreshCustomer(updated);
                    toast.success('Profile saved');
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Save failed');
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save profile
            </Button>
          </CardContent>
        </Card>
      );
      break;
    case 'support':
      body = (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Support</CardTitle>
            <CardDescription>Need help with a Smart Budget trip?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Contact Vizag Taxi Hub on WhatsApp for booking support.</p>
            <p className="text-muted-foreground">
              Tip: keep chat on-platform until you pay the 10% unlock fee. After payment, driver and
              vehicle contacts are revealed on your trip page.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/contact">Contact page</Link>
            </Button>
          </CardContent>
        </Card>
      );
      break;
    default: {
      const _exhaustive: never = section;
      body = _exhaustive;
      break;
    }
  }

  return (
    <CustomerPortalLayout
      customer={customer}
      section={section}
      onSectionChange={(next) => {
        // Nav into Post starts a fresh trip; Republish sets prefill then setSection directly.
        if (next === 'post') setRepostSession(null);
        setSection(next);
      }}
      activeCount={activeSessions.length}
      onRefresh={() => void refreshAll()}
      onLogout={() => {
        logout();
        navigate('/smart-budget/customer/login');
      }}
    >
      {body}
    </CustomerPortalLayout>
  );
}

export default function SmartBudgetCustomerDashboardPage() {
  return <CustomerDashboard />;
}
