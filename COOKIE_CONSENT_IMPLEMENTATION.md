# Cookie Consent Implementation

This document outlines the cookie consent implementation for Vizag Taxi Hub, designed to comply with Microsoft Clarity requirements and European privacy regulations.

## Overview

The implementation includes:
- Google Consent Mode v2 integration
- Microsoft Clarity consent management
- Google Analytics consent management
- User-friendly cookie consent banner
- Detailed privacy policy updates

## Components

### 1. CookieConsentBanner (`src/components/CookieConsentBanner.tsx`)
- Modern, responsive cookie consent banner
- Granular cookie preference controls
- Support for Accept All, Reject All, and Customize options
- Integration with Google Consent Mode v2

### 2. CookieConsentContext (`src/contexts/CookieConsentContext.tsx`)
- React context for managing cookie consent state
- Automatic application of consent to tracking scripts
- Persistent storage of user preferences
- Integration with both Google Analytics and Microsoft Clarity

### 3. ConsentManager (`src/utils/consentManager.ts`)
- Utility functions for consent management
- Google Consent Mode v2 initialization
- Microsoft Clarity and Google Analytics integration
- Local storage management

### 4. CookieConsentManager (`src/components/CookieConsentManager.tsx`)
- Wrapper component that conditionally shows the consent banner
- Integrates with the consent context

## Implementation Details

### Google Consent Mode v2
The implementation uses Google Consent Mode v2 with the following consent types:
- `ad_storage`: Marketing cookies
- `analytics_storage`: Analytics cookies (Google Analytics, Microsoft Clarity)
- `functionality_storage`: Functional cookies
- `personalization_storage`: Personalization cookies
- `security_storage`: Security cookies (always granted)

### Microsoft Clarity Integration
- Clarity script is only loaded when analytics consent is given
- Uses the `loadClarity()` function for dynamic loading
- Respects user consent choices

### Google Analytics Integration
- Configured with consent-aware settings
- Only sends data when analytics consent is granted
- Uses Google Consent Mode v2 for proper consent management

## Usage

### Basic Implementation
The cookie consent is automatically initialized in `main.tsx` and the banner is shown via `CookieConsentManager` component.

### Testing
Use the `CookieConsentTest` component to verify the implementation:
```tsx
import CookieConsentTest from '@/components/CookieConsentTest';

// Add to any page for testing
<CookieConsentTest />
```

### Manual Consent Management
```tsx
import { useCookieConsent } from '@/contexts/CookieConsentContext';

const MyComponent = () => {
  const { preferences, acceptAll, rejectAll, updatePreferences } = useCookieConsent();
  
  // Use consent state and methods
};
```

## Privacy Policy Updates

The privacy policy has been updated to include:
- Detailed cookie information
- Consent management explanation
- Third-party analytics disclosure
- User rights regarding cookies

## Compliance

This implementation ensures compliance with:
- Microsoft Clarity requirements (deadline: October 31, 2025)
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- Google Consent Mode v2 best practices

## Testing Checklist

- [ ] Cookie banner appears on first visit
- [ ] Accept All enables all tracking scripts
- [ ] Reject All disables non-essential tracking
- [ ] Customize allows granular control
- [ ] Preferences persist across page reloads
- [ ] Google Analytics respects consent choices
- [ ] Microsoft Clarity respects consent choices
- [ ] Privacy policy includes cookie information

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Future Enhancements

- Cookie preference center page
- Cookie audit functionality
- A/B testing for banner design
- Integration with additional consent management platforms

## Troubleshooting

### Common Issues

1. **Banner not showing**: Check if `cookie-consent-given` is set in localStorage
2. **Tracking not working**: Verify consent preferences and browser console for errors
3. **Clarity not loading**: Ensure analytics consent is granted and check network tab

### Debug Mode
Enable debug logging by adding to browser console:
```javascript
localStorage.removeItem('cookie-consent-given');
localStorage.removeItem('cookie-preferences');
// Reload page to see banner again
```

## Support

For issues or questions regarding the cookie consent implementation, contact the development team or refer to the Microsoft Clarity documentation for consent requirements.
