import React, { useState, useEffect } from 'react';
import { X, Settings, Shield, BarChart3, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

interface CookieConsentBannerProps {
  onConsentChange: (preferences: CookiePreferences) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onConsentChange,
  onAcceptAll,
  onRejectAll
}) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    functional: false
  });

  useEffect(() => {
    // Check if consent has already been given
    const consentGiven = localStorage.getItem('cookie-consent-given');
    if (!consentGiven) {
      setShowBanner(true);
    }
  }, []);

  const handlePreferenceChange = (key: keyof CookiePreferences, value: boolean) => {
    if (key === 'necessary') return; // Cannot disable necessary cookies
    
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    // Don't call onConsentChange here - only call it when user clicks Save
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    setPreferences(allAccepted);
    onConsentChange(allAccepted);
    onAcceptAll();
    setShowBanner(false);
    localStorage.setItem('cookie-consent-given', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(allAccepted));
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false
    };
    setPreferences(onlyNecessary);
    onConsentChange(onlyNecessary);
    onRejectAll();
    setShowBanner(false);
    localStorage.setItem('cookie-consent-given', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(onlyNecessary));
  };

  const handleSavePreferences = () => {
    onConsentChange(preferences);
    setShowBanner(false);
    localStorage.setItem('cookie-consent-given', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(preferences));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Cookie Preferences</CardTitle>
                <CardDescription className="text-sm">
                  We use cookies to enhance your experience and analyze our traffic
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBanner(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!showDetails ? (
            // Simple banner view
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                We use cookies to provide essential website functionality, analyze site traffic, 
                and personalize content. By clicking "Accept All", you consent to our use of cookies. 
                You can customize your preferences or learn more in our{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleAcceptAll} className="flex-1">
                  Accept All
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleRejectAll}
                  className="flex-1"
                >
                  Reject All
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowDetails(true)}
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Customize
                </Button>
              </div>
            </div>
          ) : (
            // Detailed preferences view
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-green-600" />
                    <div>
                      <h3 className="text-sm font-medium">Necessary Cookies</h3>
                      <p className="text-xs text-gray-600">
                        Essential for website functionality and security
                      </p>
                    </div>
                  </div>
                  <Switch checked={true} disabled />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-medium">Analytics Cookies</h3>
                      <p className="text-xs text-gray-600">
                        Help us understand how visitors interact with our website
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.analytics}
                    onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-purple-600" />
                    <div>
                      <h3 className="text-sm font-medium">Marketing Cookies</h3>
                      <p className="text-xs text-gray-600">
                        Used to deliver relevant advertisements and marketing campaigns
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.marketing}
                    onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-orange-600" />
                    <div>
                      <h3 className="text-sm font-medium">Functional Cookies</h3>
                      <p className="text-xs text-gray-600">
                        Enable enhanced functionality like location services and preferences
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.functional}
                    onCheckedChange={(checked) => handlePreferenceChange('functional', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleSavePreferences} className="flex-1">
                  Save Preferences
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDetails(false)}
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsentBanner;
