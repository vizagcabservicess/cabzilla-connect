
import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { Location, searchLocations, vizagLocations, apDestinations } from '@/lib/locationData';
import { cn } from '@/lib/utils';

interface LocationInputProps {
  label: string;
  placeholder: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  className?: string;
  isPickupLocation?: boolean;
  readOnly?: boolean;
}

export function LocationInput({ 
  label, 
  placeholder, 
  value, 
  onChange,
  className,
  isPickupLocation = false,
  readOnly = false
}: LocationInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Location[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Initialize with popular locations based on whether it's pickup (Vizag) or drop (AP)
  useEffect(() => {
    if (isPickupLocation) {
      setResults(vizagLocations);
    } else {
      setResults(apDestinations);
    }
  }, [isPickupLocation]);

  // Reset search query when value changes externally
  useEffect(() => {
    if (value) {
      setSearchQuery(value.name);
    } else {
      setSearchQuery('');
    }
  }, [value]);

  // Handle search
  useEffect(() => {
    if (searchQuery.length > 1 || (!searchQuery && (isPickupLocation || !isPickupLocation))) {
      const locations = searchLocations(searchQuery, isPickupLocation);
      setResults(locations);
      setIsOpen(true);
      setFocusedIndex(-1);
    } else if (!searchQuery) {
      // If empty query, show default locations
      if (isPickupLocation) {
        setResults(vizagLocations);
      } else {
        setResults(apDestinations);
      }
      setIsOpen(false);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [searchQuery, isPickupLocation]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(e.target as Node) &&
        resultsRef.current && 
        !resultsRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      scrollToFocused();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
      scrollToFocused();
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      selectLocation(results[focusedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const scrollToFocused = () => {
    if (focusedIndex >= 0 && resultsRef.current) {
      const focusedElement = resultsRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ 
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  };

  const selectLocation = (location: Location) => {
    onChange(location);
    setIsOpen(false);
    setSearchQuery(location.name);
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
    
    // Reset to default locations
    if (isPickupLocation) {
      setResults(vizagLocations);
    } else {
      setResults(apDestinations);
    }
  };
  
  const handleInputFocus = () => {
    if (!readOnly) {
      setIsOpen(true);
      // Show default locations on focus
      if (results.length === 0) {
        if (isPickupLocation) {
          setResults(vizagLocations);
        } else {
          setResults(apDestinations);
        }
      }
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <label className="input-label">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cabGray-500">
          <Search size={18} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          className={cn(
            "w-full pl-10 pr-10 py-3 shadow-input", 
            readOnly ? "bg-gray-100 cursor-not-allowed" : ""
          )}
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => !readOnly && setSearchQuery(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
        />
        
        {searchQuery && !readOnly && (
          <button 
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cabGray-400 hover:text-cabGray-600 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && !readOnly && (
        <div 
          ref={resultsRef}
          className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-md shadow-elevated max-h-60 overflow-y-auto"
        >
          <div className="p-2 text-xs text-cabGray-500 border-b border-cabGray-100">
            {isPickupLocation ? "Popular pickup locations in Visakhapatnam" : "Popular destinations in Andhra Pradesh"}
          </div>
          {results.map((location, index) => (
            <div 
              key={location.id}
              className={cn(
                "px-3 py-2.5 cursor-pointer transition-colors",
                index === focusedIndex ? "bg-cabBlue-50" : "hover:bg-cabGray-50"
              )}
              onClick={() => selectLocation(location)}
            >
              <div className="flex items-start">
                <MapPin size={16} className="text-cabGray-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <div className="text-cabGray-800 font-medium">{location.name}</div>
                  <div className="text-xs text-cabGray-500">{location.city}, {location.state}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
