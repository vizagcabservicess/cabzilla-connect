
import React from 'react';
import { AlertCircle, RefreshCw, Database, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fixDatabaseTables, forceRefreshVehicles } from '@/utils/apiHelper';
import { toast } from 'sonner';

interface ErrorNotificationProps {
  title: string;
  message: string;
  errorCode?: string | number;
  onRetry?: () => void;
  onFixDatabase?: () => void;
  variant?: "default" | "destructive" | "warning";
}

export function ErrorNotification({
  title,
  message,
  errorCode,
  onRetry,
  onFixDatabase,
  variant = "destructive"
}: ErrorNotificationProps) {
  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    } else {
      toast.info('Refreshing data...');
      try {
        await forceRefreshVehicles();
        toast.success('Data refreshed successfully');
        window.location.reload();
      } catch (error) {
        toast.error('Failed to refresh data. Please try again.');
      }
    }
  };

  const handleFixDatabase = async () => {
    if (onFixDatabase) {
      onFixDatabase();
    } else {
      toast.info('Fixing database...');
      try {
        const success = await fixDatabaseTables();
        if (success) {
          toast.success('Database fixed successfully');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.error('Failed to fix database. Please try again.');
        }
      } catch (error) {
        toast.error('Failed to fix database. Please try again.');
      }
    }
  };

  return (
    <Alert variant={variant} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-4">
        <div className="flex flex-col">
          <p>{message}</p>
          {errorCode && (
            <div className="mt-2 p-2 bg-muted text-muted-foreground rounded text-sm font-mono">
              {errorCode}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleFixDatabase}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Fix Database
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function LoadingError({ 
  message = "There was a problem loading the data. Please try again.",
  errorCode,
  onRetry,
  onFixDatabase
}: {
  message?: string;
  errorCode?: string | number;
  onRetry?: () => void;
  onFixDatabase?: () => void;
}) {
  return (
    <ErrorNotification
      title="Error Loading Data"
      message={message}
      errorCode={errorCode}
      onRetry={onRetry}
      onFixDatabase={onFixDatabase}
      variant="destructive"
    />
  );
}

export function WarningNotification({
  title,
  message,
  onAction,
  actionLabel = "Fix Now"
}: {
  title: string;
  message: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <Alert variant="warning" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-4">
        <p>{message}</p>
        {onAction && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAction}
            className="w-fit"
          >
            {actionLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
