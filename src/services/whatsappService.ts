
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 91, return as is
  if (cleaned.startsWith('91')) {
    return cleaned;
  }
  
  // If it's a 10-digit number, add 91 prefix
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  // Return as is for other formats
  return cleaned;
}
