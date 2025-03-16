import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, RefreshCw, Home } from 'lucide-react';
import { toast } from 'sonner';

interface FallbackErrorComponentProps {
  error?: Error | string;
  resetErrorBoundary?: () => void;
}

export function FallbackErrorComponent({ 
  error, 
  resetErrorBoundary 
}: FallbackErrorComponentProps) {
  const navigate = useNavigate();
  const errorMessage = error instanceof Error ? error.message : String(error || 'An error occurred');

  useEffect(() => {
    // Show toast message
    toast.error('An error occurred', {
      description: errorMessage.substring(0, 100) + (errorMessage.length > 100 ? '...' : ''),
      duration: 5000,
    });

    // Log details for debugging
    console.error('Error caught by fallback component:', error);
  }, [error, errorMessage]);

  const handleReset = () => {
    // Clear any cached data
    try {
      // Clear localStorage except for authentication
      const authToken = localStorage.getItem('auth_token');
      localStorage.clear();
      if (authToken) localStorage.setItem('auth_token', authToken);
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear caches if supported
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
    } catch (e) {
      console.error('Error clearing cache:', e);
    }
    
    // Reset error boundary if available
    if (resetErrorBoundary) {
      resetErrorBoundary();
    }
    
    // Otherwise reload the page
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Something Went Wrong
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="mt-1">
              {errorMessage}
            </AlertDescription>
          </Alert>
          
          <div className="text-sm space-y-2 mt-4">
            <p className="font-medium">You can try:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Refreshing the page</li>
              <li>Clearing your browser cache</li>
              <li>Going back to the previous page</li>
              <li>Returning to the home page</li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-wrap gap-2 pt-4">
          <Button 
            onClick={handleReset} 
            variant="default"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Cache & Reload
          </Button>
          
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </Button>
          
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
