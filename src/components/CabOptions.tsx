
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

// Make sure the original CabOptions component's export is maintained
export { default } from './cab-options/CabList';
