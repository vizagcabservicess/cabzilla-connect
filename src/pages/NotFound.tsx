import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft, Search, MapPin, Car, Plane } from "lucide-react";
import { URLRedirectService } from "@/services/urlRedirectService";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isApiError, setIsApiError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedPages, setSuggestedPages] = useState<Array<{title: string, path: string, description: string}>>([]);
  
  // Popular pages that users might be looking for
  const POPULAR_PAGES = [
    { title: 'Local Taxi', path: '/local-taxi', description: 'Book local taxi services', icon: <Car className="h-4 w-4" /> },
    { title: 'Outstation Taxi', path: '/outstation-taxi', description: 'Inter-city travel services', icon: <MapPin className="h-4 w-4" /> },
    { title: 'Airport Transfer', path: '/airport-taxi', description: 'Airport pickup and drop', icon: <Plane className="h-4 w-4" /> },
    { title: 'Tour Packages', path: '/tours', description: 'Sightseeing tours', icon: <MapPin className="h-4 w-4" /> },
    { title: 'Fleet', path: '/fleet', description: 'Our vehicle fleet', icon: <Car className="h-4 w-4" /> },
    { title: 'Contact Us', path: '/contact', description: 'Get in touch with us', icon: <Search className="h-4 w-4" /> },
  ];
  
  useEffect(() => {
    // Check if this is an API error or a regular 404 page
    const isApiPath = location.pathname.includes('/api/');
    const queryParams = new URLSearchParams(location.search);
    const apiErrorParam = queryParams.get('apiError');
    
    setIsApiError(isApiPath || apiErrorParam === 'true');
    
    // Generate suggested pages based on the current path
    const pathLower = location.pathname.toLowerCase();
    const suggestions = POPULAR_PAGES.filter(page => 
      page.title.toLowerCase().includes(pathLower.replace(/[^a-z]/g, ' ')) ||
      page.description.toLowerCase().includes(pathLower.replace(/[^a-z]/g, ' '))
    );
    
    setSuggestedPages(suggestions.length > 0 ? suggestions : POPULAR_PAGES.slice(0, 3));
    
    // Track 404 error for analytics
    window.visitorAnalytics?.trackInteraction('404_error', 'page', {
      path: location.pathname,
      search: location.search,
      referrer: document.referrer
    });
    
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
      "with search params:",
      location.search,
      "and state:",
      location.state
    );
  }, [location]);

  const goBack = () => {
    navigate(-1);
  };

  const goHome = () => {
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Try to find a matching page
      const matchingPage = POPULAR_PAGES.find(page => 
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (matchingPage) {
        navigate(matchingPage.path);
      } else {
        // Navigate to search results or home page
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="flex justify-center mb-6">
          <AlertCircle size={60} className="text-red-500" />
        </div>
        <h1 className="text-2xl md:text-4xl font-medium mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">
          {isApiError ? "API Endpoint Not Found" : "Page Not Found"}
        </p>
        <p className="text-gray-500 mb-6">
          {isApiError 
            ? "The requested API endpoint could not be found. This might be due to a server configuration issue."
            : "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."}
        </p>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search for services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" className="rounded-l-none">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>
        
        {/* Suggested Pages */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Pages</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedPages.map((page) => (
              <Button
                key={page.path}
                variant="outline"
                onClick={() => navigate(page.path)}
                className="flex items-center gap-2 h-auto p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  {page.icon}
                  <div>
                    <div className="font-medium">{page.title}</div>
                    <div className="text-sm text-gray-500">{page.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="outline" 
            onClick={goBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Go Back
          </Button>
          <Button 
            onClick={goHome}
            className="flex items-center gap-2"
          >
            <Home size={16} />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
