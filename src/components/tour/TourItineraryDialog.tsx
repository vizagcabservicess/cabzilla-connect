import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { tourDetailAPI } from "@/services/api/tourDetailAPI";
import type { TourItinerary } from "@/types/tour";

type TourItineraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: string;
  tourName: string;
};

function normalizeItinerary(raw: unknown): TourItinerary[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const day = item as Record<string, unknown>;
      const activities = Array.isArray(day.activities)
        ? day.activities.map((activity) => String(activity).trim()).filter(Boolean)
        : [];
      return {
        day: Number(day.day) || index + 1,
        title: String(day.title ?? "").trim(),
        description: String(day.description ?? "").trim(),
        activities,
      };
    })
    .filter((day): day is TourItinerary => day !== null);
}

export function TourItineraryDialog({
  open,
  onOpenChange,
  tourId,
  tourName,
}: TourItineraryDialogProps) {
  const [days, setDays] = useState<TourItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!open || !tourId) return;

    let cancelled = false;
    setIsLoading(true);
    setLoadFailed(false);

    void tourDetailAPI.getTourDetail(tourId).then((detail) => {
      if (cancelled) return;
      setDays(normalizeItinerary(detail?.itinerary));
      setLoadFailed(!detail);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, tourId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] max-w-lg overflow-hidden p-0 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-base font-semibold text-gray-900">
            Tour itinerary
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {tourName}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading itinerary…
            </div>
          ) : days.length > 0 ? (
            <div className="space-y-3">
              {days.map((day) => (
                <div
                  key={`${day.day}-${day.title}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    Day {day.day}
                    {day.title ? ` · ${day.title}` : ""}
                  </p>
                  {day.description ? (
                    <p className="mt-1 text-sm text-slate-700">{day.description}</p>
                  ) : null}
                  {day.activities.length > 0 ? (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm text-slate-700">
                      {day.activities.map((activity) => (
                        <li key={activity}>{activity}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              {loadFailed
                ? "Could not load this itinerary. Please try again."
                : "No itinerary is available for this tour yet."}
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 px-5 py-3">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
