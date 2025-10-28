import React from 'react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CookieConsentTest: React.FC = () => {
  const { preferences, hasConsent, acceptAll, rejectAll } = useCookieConsent();

  const handleTestConsent = () => {
    // Test Google Analytics consent
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'test_event', {
        event_category: 'consent_test',
        event_label: 'cookie_consent_test',
        value: 1
      });
      console.log('Google Analytics test event sent');
    }

    // Test Microsoft Clarity consent
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('event', 'consent_test');
      console.log('Microsoft Clarity test event sent');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Cookie Consent Test</CardTitle>
        <CardDescription>
          Test the cookie consent implementation and verify tracking scripts work correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-medium">Current Consent Status:</h3>
          <div className="flex items-center gap-2">
            <span>Consent Given:</span>
            <Badge variant={hasConsent ? 'default' : 'destructive'}>
              {hasConsent ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Cookie Preferences:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Necessary:</span>
              <Badge variant={preferences.necessary ? 'default' : 'destructive'}>
                {preferences.necessary ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Analytics:</span>
              <Badge variant={preferences.analytics ? 'default' : 'destructive'}>
                {preferences.analytics ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Marketing:</span>
              <Badge variant={preferences.marketing ? 'default' : 'destructive'}>
                {preferences.marketing ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Functional:</span>
              <Badge variant={preferences.functional ? 'default' : 'destructive'}>
                {preferences.functional ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Test Actions:</h3>
          <div className="flex flex-wrap gap-2">
            <Button onClick={acceptAll} variant="outline">
              Accept All
            </Button>
            <Button onClick={rejectAll} variant="outline">
              Reject All
            </Button>
            <Button onClick={handleTestConsent} variant="outline">
              Test Tracking
            </Button>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <p>Check browser console for tracking event logs.</p>
          <p>Open browser developer tools to verify Google Analytics and Microsoft Clarity events.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CookieConsentTest;
