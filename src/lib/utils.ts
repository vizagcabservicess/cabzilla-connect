
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string into a readable format
 * 
 * @param dateString ISO date string
 * @param formatStr Optional format string (default: 'MMM dd, yyyy')
 * @returns Formatted date string
 */
export function formatDate(dateString: string, formatStr: string = 'MMM dd, yyyy'): string {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return original string if parsing fails
  }
}
