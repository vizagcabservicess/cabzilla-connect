import { Lock, Unlock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  canSmartBudgetPayUnlock,
  computeBookingFee,
  isSmartBudgetContactsUnlocked,
  SMART_BUDGET_DEFAULTS,
} from '@/types/smartBudget';
import type { SmartBudgetSession } from '@/types/smartBudget';

interface SmartBudgetFeeGateProps {
  session: SmartBudgetSession;
  onPay: () => void;
  isPaying?: boolean;
}

export function SmartBudgetFeeGate({ session, onPay, isPaying = false }: SmartBudgetFeeGateProps) {
  const unlocked = isSmartBudgetContactsUnlocked(session);
  const base = session.customer_budget ?? session.quoted_fare ?? 0;
  const rawFee =
    session.booking_fee_amount ??
    computeBookingFee(Number(base), SMART_BUDGET_DEFAULTS.bookingFeePercent);
  const fee = Number(base) > 0 ? Math.max(1, Number(rawFee)) : Number(rawFee);

  if (unlocked) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <Unlock className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Contacts unlocked</p>
          <p className="text-emerald-800/80">
            Booking fee of ₹{Number(fee).toLocaleString('en-IN')} received. Driver and phone details are
            visible. Advance payment cannot be charged again.
          </p>
        </div>
      </div>
    );
  }

  if (!canSmartBudgetPayUnlock(session)) {
    return (
      <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
        Booking fee payment is not available for this ride right now.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 text-sm text-amber-950">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">
            Pay {SMART_BUDGET_DEFAULTS.bookingFeePercent}% booking fee to unlock contacts
          </p>
          <p className="text-amber-900/80">
            ₹{Number(fee).toLocaleString('en-IN')} · Phone numbers stay hidden until payment.
          </p>
        </div>
      </div>
      <Button type="button" onClick={onPay} disabled={isPaying || fee <= 0}>
        {isPaying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening payment…
          </>
        ) : (
          `Pay ₹${Number(fee).toLocaleString('en-IN')}`
        )}
      </Button>
    </div>
  );
}
