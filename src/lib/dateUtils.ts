import { format, parseISO } from "date-fns";

export function formatDate(date: Date | string) {
  if (!date) return "";
  
  let d: Date;
  if (typeof date === "string") {
    // Handle ISO string format and ensure it's treated as local time
    if (date.includes('T') || date.includes('Z')) {
      // ISO format - parse and treat as local
      d = parseISO(date);
    } else {
      // SQL datetime format (YYYY-MM-DD HH:MM:SS) - treat as local
      d = new Date(date);
    }
  } else {
    d = date;
  }
  
  return format(d, "dd MMM yyyy");
}

export function formatTime(date: Date | string) {
  if (!date) return "";
  
  let d: Date;
  if (typeof date === "string") {
    // Handle ISO string format and ensure it's treated as local time
    if (date.includes('T') || date.includes('Z')) {
      // ISO format - parse and treat as local
      d = parseISO(date);
    } else {
      // SQL datetime format (YYYY-MM-DD HH:MM:SS) - treat as local
      d = new Date(date);
    }
  } else {
    d = date;
  }
  
  return format(d, "hh:mm a");
}

export function formatDateTime(date: Date | string) {
  if (!date) return "";
  
  let d: Date;
  if (typeof date === "string") {
    // Handle different date formats
    if (date.includes('T') || date.includes('Z')) {
      // ISO format - parse and treat as local
      d = parseISO(date);
    } else if (date.includes('-') && date.includes(':')) {
      // SQL datetime format (YYYY-MM-DD HH:MM:SS) - treat as UTC and convert to local
      // Add Z to treat as UTC, then convert to local time
      d = new Date(date + 'Z');
    } else {
      // Fallback
      d = new Date(date);
    }
  } else {
    d = date;
  }
  
  return format(d, "dd MMM yyyy 'at' hh:mm a");
}

// Helper function to convert UTC datetime to local time
export function convertUTCToLocal(utcDateString: string): Date {
  if (!utcDateString) return new Date();
  
  // If it's already in ISO format with Z, parse it
  if (utcDateString.includes('Z')) {
    return parseISO(utcDateString);
  }
  
  // If it's in SQL datetime format without timezone, treat as UTC and convert to local
  if (utcDateString.includes('-') && utcDateString.includes(':')) {
    return new Date(utcDateString + 'Z');
  }
  
  // Fallback
  return new Date(utcDateString);
} 