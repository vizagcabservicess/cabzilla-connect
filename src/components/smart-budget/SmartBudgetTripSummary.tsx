import type { SmartBudgetSession } from '@/types/smartBudget';
import { formatSmartBudgetStatus } from '@/types/smartBudget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Car, Users, Pencil, Route, Clock } from 'lucide-react';
import {
  parseSmartBudgetTripDisplayMeta,
  stripSmartBudgetSystemMeta,
} from '@/lib/smartBudgetTripMeta';

interface SmartBudgetTripSummaryProps {
  session: Pick<
    SmartBudgetSession,
    | 'pickup'
    | 'drop_location'
    | 'trip_datetime'
    | 'vehicle_type'
    | 'passengers'
    | 'quoted_fare'
    | 'customer_budget'
    | 'special_requests'
    | 'status'
  >;
  showStatus?: boolean;
  /** Hide website original fare (vendors must not see list price). */
  hideWebsiteFare?: boolean;
  /**
   * When true (default for partner views with hideWebsiteFare), never show
   * search-results / system meta as "Special requests" — only customer-typed notes.
   */
  hideSystemMeta?: boolean;
  /** When set, shows a pencil edit control in the top-right of the card. */
  onEdit?: () => void;
  editLabel?: string;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function SmartBudgetTripSummary({
  session,
  showStatus = true,
  hideWebsiteFare = false,
  hideSystemMeta,
  onEdit,
  editLabel = 'Edit trip',
}: SmartBudgetTripSummaryProps) {
  const stripSystem = hideSystemMeta ?? hideWebsiteFare;
  const showQuoted = !hideWebsiteFare && session.quoted_fare != null;
  const { tripType, packageLabel, kilometers } = parseSmartBudgetTripDisplayMeta(
    session.special_requests,
    session.drop_location
  );
  const customerNotes = stripSystem
    ? stripSmartBudgetSystemMeta(session.special_requests)
    : (session.special_requests || '').trim();

  return (
    <div className="space-y-3">
      {(showStatus || onEdit) && (
        <div className="flex items-start justify-between gap-2">
          {showStatus ? (
            <Badge variant="secondary" className="font-normal">
              {formatSmartBudgetStatus(session.status)}
            </Badge>
          ) : (
            <span />
          )}
          {onEdit ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
              onClick={onEdit}
              aria-label={editLabel}
              title={editLabel}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      )}
      <div className="grid gap-3 text-sm">
        <div className="flex gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <div>
            <p className="text-xs text-muted-foreground">Pickup</p>
            <p className="font-medium text-foreground">{session.pickup}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
          <div>
            <p className="text-xs text-muted-foreground">Drop</p>
            <p className="font-medium text-foreground">{session.drop_location}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatWhen(session.trip_datetime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span>{session.vehicle_type}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{session.passengers} pax</span>
          </div>
        </div>
        {(tripType || packageLabel || kilometers) && (
          <div className="flex flex-wrap gap-4 border-t pt-3">
            {tripType ? (
              <div>
                <p className="text-xs text-muted-foreground">Trip type</p>
                <p className="font-medium text-foreground">{tripType}</p>
              </div>
            ) : null}
            {packageLabel ? (
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Package</p>
                  <p className="font-medium text-foreground">{packageLabel}</p>
                </div>
              </div>
            ) : null}
            {kilometers ? (
              <div className="flex items-start gap-2">
                <Route className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Kilometers</p>
                  <p className="font-medium text-foreground">{kilometers}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}
        {(showQuoted || session.customer_budget != null) && (
          <div className="flex flex-wrap gap-4 border-t pt-3">
            {showQuoted && (
              <div>
                <p className="text-xs text-muted-foreground">Website fare</p>
                <p className="font-semibold">₹{Number(session.quoted_fare).toLocaleString('en-IN')}</p>
              </div>
            )}
            {session.customer_budget != null && (
              <div>
                <p className="text-xs text-muted-foreground">Customer budget</p>
                <p className="font-semibold text-emerald-800">
                  ₹{Number(session.customer_budget).toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>
        )}
        {customerNotes ? (
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            <p className="mb-1 text-xs text-muted-foreground">Special requests</p>
            <p>{customerNotes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
