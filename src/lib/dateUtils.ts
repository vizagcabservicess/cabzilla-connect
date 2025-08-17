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
      // SQL datetime format (YYYY-MM-DD HH:MM:SS) - treat as IST
      d = new Date(date);
    } else {
      // Fallback
      d = new Date(date);
    }
  } else {
    d = date;
  }
  
  return format(d, "dd MMM yyyy 'at' hh:mm a");
}

// Helper function to parse date strings (now treating all dates as IST)
export function convertUTCToLocal(dateString: string): Date {
  if (!dateString) return new Date();
  
  // All dates are now stored in IST, so just parse normally
  if (dateString.includes('T') || dateString.includes('Z')) {
    return parseISO(dateString);
  }
  
  // SQL datetime format (YYYY-MM-DD HH:MM:SS) - treat as IST
  return new Date(dateString);
} 

// Helper function to format date for API requests (IST format)
export function formatDateForAPI(date: Date): string {
  if (!date) return '';
  
  // Format as YYYY-MM-DD HH:mm:ss in IST
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
} 