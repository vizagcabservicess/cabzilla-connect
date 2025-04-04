
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  ShieldAlert, 
  Database, 
  AlertTriangle, 
  ServerOff, 
  RefreshCcw, 
  Database as DatabaseIcon,
  Server,
  Globe,
  XCircle
} from "lucide-react";
import { 
  forceEnableFallbackMode, 
  disableFallbackMode, 
  getSystemStatus,
  fixDatabaseTables
} from "@/utils/apiHelper";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusBannerProps {
  onRefresh?: () => void;
}

export function StatusBanner({ onRefresh }: StatusBannerProps) {
  const [status, setStatus] = React.useState(getSystemStatus());
  const [isFixing, setIsFixing] = React.useState(false);
  
  // Update status every 5 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getSystemStatus());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleToggleFallback = () => {
    if (status.fallbackMode) {
      disableFallbackMode();
    } else {
      forceEnableFallbackMode();
    }
    
    // Update status immediately
    setStatus(getSystemStatus());
    
    // Refresh the page if callback provided
    if (onRefresh) {
      setTimeout(() => {
        onRefresh();
      }, 500);
    }
  };
  
  const handleFixDatabase = async () => {
    setIsFixing(true);
    await fixDatabaseTables();
    setIsFixing(false);
    
    // Update status
    setStatus(getSystemStatus());
    
    // Refresh the page if callback provided
    if (onRefresh) {
      onRefresh();
    }
  };
  
  return (
    <Alert className={status.fallbackMode ? "border-amber-500 bg-amber-50" : "border-green-500 bg-green-50"}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {status.fallbackMode ? (
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          ) : (
            <Shield className="h-4 w-4 text-green-600" />
          )}
          <div>
            <AlertTitle className={status.fallbackMode ? "text-amber-700" : "text-green-700"}>
              System Status: {status.fallbackMode ? "Fallback Mode" : "API Mode"}
            </AlertTitle>
            <AlertDescription className="text-xs mt-1">
              {status.fallbackMode ? (
                <>
                  Using local data storage until API connection is restored.
                  {status.fallbackExpiry && (
                    <span className="block mt-1">
                      Auto-retry at: {status.fallbackExpiry}
                    </span>
                  )}
                </>
              ) : (
                <>
                  Connected to API. {status.apiErrorCount > 0 && (
                    <span className="text-red-600">
                      ({status.apiErrorCount} recent errors)
                    </span>
                  )}
                </>
              )}
            </AlertDescription>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={status.isPreview ? "outline" : "secondary"} className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {status.isPreview ? "Preview" : "Production"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{status.isPreview ? "Running in preview/development environment" : "Running in production environment"}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={status.fallbackMode ? "outline" : "secondary"} className="text-xs">
                    <DatabaseIcon className="h-3 w-3 mr-1" />
                    {status.fallbackMode ? "Local Storage" : "Database"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Data source: {status.fallbackMode ? "Using local storage" : "Using database"}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={status.apiErrorCount > 0 ? "destructive" : "outline"} className="text-xs">
                    <ServerOff className="h-3 w-3 mr-1" />
                    API Errors: {status.apiErrorCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{status.apiErrorCount} API errors detected</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          
          <Button 
            size="sm" 
            variant={status.fallbackMode ? "outline" : "destructive"} 
            onClick={handleToggleFallback}
          >
            {status.fallbackMode ? (
              <>
                <Server className="h-3 w-3 mr-1" />
                Try API Mode
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Enable Fallback
              </>
            )}
          </Button>
          
          {!status.fallbackMode && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleFixDatabase}
              disabled={isFixing}
            >
              <Database className={`h-3 w-3 mr-1 ${isFixing ? "animate-pulse" : ""}`} />
              {isFixing ? "Fixing..." : "Fix Database"}
            </Button>
          )}
          
          {onRefresh && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefresh}
            >
              <RefreshCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}
