
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isApiError, setIsApiError] = useState(false);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    // Check if this is an API error or a regular 404 page
    const isApiPath = location.pathname.includes('/api/');
    const queryParams = new URLSearchParams(location.search);
    const apiErrorParam = queryParams.get('apiError');
    
    setIsApiError(isApiPath || apiErrorParam === 'true');
    
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className={`text-center ${isMobile ? 'px-6 py-8 max-w-sm' : 'max-w-md px-4'}`}>
        <div className="flex justify-center mb-6">
          <div className="rounded-full w-16 h-16 bg-red-100 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-500" />
          </div>
        </div>
        <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold mb-4 text-gray-900`}>404</h1>
        <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-600 mb-4`}>
          Page Not Found
        </p>
        <p className={`text-gray-500 mb-8 ${isMobile ? 'text-sm' : ''}`}>
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        
        <div className="space-y-3">
          <button 
            onClick={goBack}
            className="flex items-center justify-center gap-2 w-full border border-gray-300 bg-white text-gray-700 py-3 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </button>
          
          <button 
            onClick={goHome}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <Home size={18} />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
