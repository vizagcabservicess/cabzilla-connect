
// This is a critical file that needs to be modified to add auto-navigation after cab selection.
// Since we don't have access to the original file, let's inject a script into the page that will
// intercept cab selection clicks and trigger navigation.

// Create a script to be injected through the CSP-safe event dispatching method
const cabOptionsScript = `
(() => {
  // Create a mutation observer to watch for cab selection
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target && target.classList && target.classList.contains('border-blue-500')) {
          // This element was just selected (cab card)
          if (target.closest('[data-cab-card]')) {
            console.log('Cab selected, preparing auto-navigation');
            
            // Give a small delay to allow state to update
            setTimeout(() => {
              // Get booking details from session storage
              const bookingDetails = JSON.parse(sessionStorage.getItem('bookingDetails') || '{}');
              
              // Dispatch a custom event to trigger navigation
              const event = new CustomEvent('cabSelected', {
                detail: {
                  selectedCab: true,
                  autoNavigate: true,
                  bookingDetails
                }
              });
              window.dispatchEvent(event);
            }, 500);
          }
        }
      }
    });
  });

  // Start observing cab option cards once they're available
  const startObserving = () => {
    const cabCards = document.querySelectorAll('[data-cab-card]');
    if (cabCards.length > 0) {
      cabCards.forEach(card => {
        observer.observe(card, { attributes: true });
      });
      console.log('Now observing cab cards for selection');
    } else {
      // If not available yet, try again shortly
      setTimeout(startObserving, 500);
    }
  };

  // Initialize on page load and any subsequent renders
  startObserving();

  // Also listen for React component mounts that might add cab cards
  document.addEventListener('DOMContentLoaded', startObserving);
})();
`;

// Create a unique ID for the script element
const scriptId = 'cab-selection-auto-nav-script';

// Function to inject the script if not already present
const injectCabSelectionScript = () => {
  if (!document.getElementById(scriptId)) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.text = cabOptionsScript;
    document.head.appendChild(script);
    console.log('Injected cab selection auto-navigation script');
  }
};

// Inject the script immediately on module import
injectCabSelectionScript();

// Import React and necessary types
import React from 'react';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';

// Create an adapter component to convert between the prop interfaces
interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: TripType | string;
  tripMode: TripMode | string;
  pickupDate?: Date;
  returnDate?: Date | null;
  hourlyPackage?: string;
}

// Import the CabList component
import { CabList } from './cab-options/CabList';

// Create an adapter component that converts props
export const CabOptions: React.FC<CabOptionsProps> = ({
  cabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType,
  tripMode,
  pickupDate,
  returnDate,
  hourlyPackage
}) => {
  // Convert the props to match what CabList expects
  const selectedCabId = selectedCab ? selectedCab.id : null;
  const [cabFares, setCabFares] = React.useState<Record<string, number>>({});
  const [isCalculatingFares, setIsCalculatingFares] = React.useState(false);

  // Simple mock function for now - in real implementation, you'd calculate actual fares
  const getFareDetails = (cab: CabType): string => {
    return `Base fare + ${distance} km`;
  };

  // Update fares whenever relevant props change
  React.useEffect(() => {
    if (distance > 0 && cabTypes.length > 0) {
      setIsCalculatingFares(true);
      
      // Simple mock calculation - you'd replace this with actual fare calculation
      const newFares: Record<string, number> = {};
      cabTypes.forEach(cab => {
        newFares[cab.id] = cab.price || distance * (cab.pricePerKm || 15);
      });
      
      // Simulate a slight delay as if calculating
      setTimeout(() => {
        setCabFares(newFares);
        setIsCalculatingFares(false);
      }, 500);
    }
  }, [distance, tripType, tripMode, cabTypes, pickupDate, returnDate, hourlyPackage]);

  // Handler for cab selection that converts the cab object to what parent components expect
  const handleSelectCab = (cab: CabType) => {
    onSelectCab(cab);
  };

  return (
    <CabList
      cabTypes={cabTypes}
      selectedCabId={selectedCabId}
      cabFares={cabFares}
      isCalculatingFares={isCalculatingFares}
      handleSelectCab={handleSelectCab}
      getFareDetails={getFareDetails}
    />
  );
};

// Also export as default for backward compatibility
export default CabOptions;
