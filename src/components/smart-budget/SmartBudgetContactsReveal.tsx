import { Phone, User, Car } from 'lucide-react';
import { isSmartBudgetContactsUnlocked, type SmartBudgetSession } from '@/types/smartBudget';

interface SmartBudgetContactsRevealProps {
  session: SmartBudgetSession;
  perspective: 'customer' | 'vendor' | 'admin';
}

function mask(value?: string | null, masked?: string | null): string {
  if (masked) return masked;
  if (!value) return '—';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

export function SmartBudgetContactsReveal({ session, perspective }: SmartBudgetContactsRevealProps) {
  const unlocked = isSmartBudgetContactsUnlocked(session);

  if (perspective === 'customer') {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Trip contacts
        </p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{session.driver_name || session.vendor_name || (unlocked ? '—' : 'Hidden until fee paid')}</span>
          </li>
          <li className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span>{session.vehicle_number || (unlocked ? '—' : 'Hidden until fee paid')}</span>
          </li>
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>
              {unlocked
                ? session.vendor_phone || '—'
                : mask(session.vendor_phone, session.vendor_phone_masked)}
            </span>
          </li>
        </ul>
      </div>
    );
  }

  if (perspective === 'vendor') {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Customer details
        </p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{session.customer_name || (unlocked ? '—' : 'Hidden until fee paid')}</span>
          </li>
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>
              {unlocked
                ? session.customer_phone || '—'
                : mask(session.customer_phone, session.customer_phone_masked)}
            </span>
          </li>
          <li className="text-muted-foreground">
            Pickup: {unlocked ? session.pickup : 'Visible after booking fee'}
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        All parties
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="font-medium">Customer</p>
          <p>{session.customer_name || '—'}</p>
          <p>{session.customer_phone || '—'}</p>
        </div>
        <div>
          <p className="font-medium">Vendor / driver</p>
          <p>{session.vendor_name || session.driver_name || (session.admin_vehicle_assigned ? 'Own fleet' : '—')}</p>
          <p>{session.vendor_phone || '—'}</p>
          <p>{session.vehicle_number || '—'}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {unlocked ? 'Contacts unlocked for customer & vendor.' : 'Contacts still masked for parties until fee paid.'}
      </p>
    </div>
  );
}
