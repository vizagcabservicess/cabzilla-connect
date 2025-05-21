
import { format } from "date-fns";

export function formatDate(date: Date | string) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatTime(date: Date | string) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "hh:mm a");
}

export function formatDateTime(date: Date | string) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy, hh:mm a");
}
