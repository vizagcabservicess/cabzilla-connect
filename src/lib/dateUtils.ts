
import { format, parseISO } from 'date-fns';

/**
 * Format a date to a readable string
 * @param date The date to format (accepts string or Date)
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string | null): string => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, 'dd MMM yyyy');
};

/**
 * Format a time from a date
 * @param date The date containing the time to format (accepts string or Date)
 * @returns Formatted time string
 */
export const formatTime = (date: Date | string | null): string => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, 'hh:mm a');
};

/**
 * Format a full date and time
 * @param date The date to format (accepts string or Date)
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: Date | string | null): string => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, 'dd MMM yyyy, hh:mm a');
};
