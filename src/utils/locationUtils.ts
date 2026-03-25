/**
 * Utility functions for location data processing
 */

function isPincodeLike(value: string): boolean {
  const normalized = value.trim().replace(/\s+/g, '');
  return /^\d{5,7}$/.test(normalized);
}

function isCodeLikeToken(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return true;
  if (/[a-zA-Z]/.test(normalized)) return false;
  return /^[\d\s\-\/#.,]+$/.test(normalized);
}

function isGenericRegionToken(value: string): boolean {
  const token = value.trim().toLowerCase();
  if (!token) return true;
  return [
    'india',
    'andhra pradesh',
    'telangana',
    'tamil nadu',
    'karnataka',
    'kerala',
    'maharashtra',
    'gujarat',
    'west bengal',
    'odisha',
    'delhi',
    'puducherry',
  ].includes(token);
}

function pickReadablePlaceName(fullAddress: string): string {
  const parts = fullAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  // Prefer first locality/city-like segment.
  for (const part of parts) {
    if (isPincodeLike(part) || isCodeLikeToken(part)) continue;
    if (!/[a-zA-Z]/.test(part)) continue;
    if (isGenericRegionToken(part)) continue;
    return part;
  }

  // Fallback: first non-code segment.
  const fallback = parts.find((part) => !isPincodeLike(part) && !isCodeLikeToken(part));
  return fallback || fullAddress.trim();
}

/**
 * Extract place name from full address
 * @param fullAddress - The complete address string
 * @returns Object with place name and address
 */
export function extractPlaceName(fullAddress: string): { name: string; address: string } {
  if (!fullAddress || typeof fullAddress !== 'string') {
    return { name: 'Unknown Location', address: fullAddress || '' };
  }

  // Common patterns to extract place names
  const patterns = [
    // Pattern 1: "Place Name, Street Address, City, State, Country"
    /^([^,]+),\s*(.+)$/,
    // Pattern 2: "Place Name - Street Address, City, State, Country"  
    /^([^-]+)\s*-\s*(.+)$/,
    // Pattern 3: "Place Name | Street Address, City, State, Country"
    /^([^|]+)\s*\|\s*(.+)$/,
    // Pattern 4: "Place Name (Street Address, City, State, Country)"
    /^([^(]+)\s*\((.+)\)$/,
  ];

  for (const pattern of patterns) {
    const match = fullAddress.match(pattern);
    if (match) {
      const parsedName = match[1].trim();
      const address = match[2].trim();
      const safeName = isCodeLikeToken(parsedName) ? pickReadablePlaceName(fullAddress) : parsedName;
      
      // Validate that we have a reasonable place name (not too long)
      if (safeName.length > 0 && safeName.length < 100 && !isCodeLikeToken(safeName)) {
        return { name: safeName, address };
      }
    }
  }

  // If no pattern matches, try to extract the first meaningful part
  const parts = fullAddress.split(',');
  if (parts.length > 1) {
    const name = pickReadablePlaceName(fullAddress);
    const address = parts.slice(1).join(',').trim();
    
    // Check if the first part looks like a place name
    if (name.length > 0 && name.length < 80 && !name.toLowerCase().includes('india')) {
      return { name, address };
    }
  }

  if (isPincodeLike(fullAddress.trim()) || isCodeLikeToken(fullAddress.trim())) {
    return { name: 'Unknown Location', address: fullAddress.trim() };
  }

  // Fallback: return the full address as both name and address
  return { name: fullAddress, address: fullAddress };
}

/**
 * Format location for display in admin tables
 * @param location - Location string or object
 * @returns Formatted location display
 */
export function formatLocationForDisplay(location: string | any): { name: string; address: string } {
  if (typeof location === 'string') {
    return extractPlaceName(location);
  }
  
  if (location && typeof location === 'object') {
    if (location.name && location.address) {
      return { name: location.name, address: location.address };
    }
    if (location.name) {
      return { name: location.name, address: location.address || location.name };
    }
    if (location.address) {
      return extractPlaceName(location.address);
    }
  }
  
  return { name: 'Unknown Location', address: location || '' };
}






















































