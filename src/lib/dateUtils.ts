
import { format } from 'date-fns';

/**
 * Format a date to a readable string
 * @param date The date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date | null): string => {
  if (!date) return '';
  return format(date, 'dd MMM yyyy');
};

/**
 * Format a time from a date
 * @param date The date containing the time to format
 * @returns Formatted time string
 */
export const formatTime = (date: Date | null): string => {
  if (!date) return '';
  return format(date, 'hh:mm a');
};
