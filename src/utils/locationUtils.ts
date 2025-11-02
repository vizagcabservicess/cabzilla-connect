/**
 * Utility functions for location data processing
 */

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
      const name = match[1].trim();
      const address = match[2].trim();
      
      // Validate that we have a reasonable place name (not too long)
      if (name.length > 0 && name.length < 100) {
        return { name, address };
      }
    }
  }

  // If no pattern matches, try to extract the first meaningful part
  const parts = fullAddress.split(',');
  if (parts.length > 1) {
    const name = parts[0].trim();
    const address = parts.slice(1).join(',').trim();
    
    // Check if the first part looks like a place name
    if (name.length > 0 && name.length < 80 && !name.includes('India')) {
      return { name, address };
    }
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












































