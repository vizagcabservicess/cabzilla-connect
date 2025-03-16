
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return <ErrorDisplay error={this.state.error} reset={() => this.setState({ hasError: false, error: null })} />;
    }

    return this.props.children;
  }
}

// A separate component for the error display
function ErrorDisplay({ error, reset }: { error: Error | null, reset: () => void }) {
  const navigate = useNavigate();
  
  const clearCache = () => {
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Attempt to clear caches if browser supports it
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Reset error state
    reset();
    
    // Reload the page
    window.location.reload();
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Application Error
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="p-4 border border-red-100 rounded-md bg-red-50 mb-4">
            <p className="text-red-700 font-medium mb-2">Something went wrong with the application:</p>
            <p className="text-sm font-mono bg-white p-2 rounded border border-red-200 overflow-auto">
              {error ? error.message : 'Unknown error'}
            </p>
          </div>
          
          <div className="text-sm space-y-2">
            <p className="font-medium">You can try:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Refreshing the page</li>
              <li>Clearing your browser cache</li>
              <li>Going back to the previous page</li>
              <li>Returning to the home page</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button 
            onClick={clearCache}
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
            Go Home
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

// This is a hook to allow functional components to use the error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundaryClass fallback={fallback}>
        <Component {...props} />
      </ErrorBoundaryClass>
    );
  };
}

export default ErrorBoundaryClass;
