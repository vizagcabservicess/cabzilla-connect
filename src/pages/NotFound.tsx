import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isApiError, setIsApiError] = useState(false);
  
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md px-4">
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
