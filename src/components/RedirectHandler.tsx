import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { URLRedirectService } from '@/services/urlRedirectService';

interface RedirectHandlerProps {
  children: React.ReactNode;
}

export function RedirectHandler({ children }: RedirectHandlerProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = URLRedirectService.checkRedirect(location.pathname);
    
    if (redirect) {
      console.log(`Redirecting from ${location.pathname} to ${redirect.to} (${redirect.type})`);
      
      // Track the redirect for analytics (if available)
      window.visitorAnalytics?.trackInteraction('url_redirect', 'page', {
        from: location.pathname,
        to: redirect.to,
        type: redirect.type
      });
      
      // Use replace for permanent redirects to update browser history
      if (redirect.type === 'permanent') {
        navigate(redirect.to, { replace: true });
      } else {
        navigate(redirect.to);
      }
    }
  }, [location.pathname, navigate]);

  return <>{children}</>;
}



