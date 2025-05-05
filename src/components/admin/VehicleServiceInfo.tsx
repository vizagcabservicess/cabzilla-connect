
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Timer, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VehicleServiceInfoProps {
  lastServiceDate: string;
  nextServiceDue: string;
  lastServiceOdometer?: number;
  nextServiceOdometer?: number;
  currentOdometer?: number;
}

export function VehicleServiceInfo({
  lastServiceDate,
  nextServiceDue,
  lastServiceOdometer = 0,
  nextServiceOdometer = 0,
  currentOdometer
}: VehicleServiceInfoProps) {
  const formattedLastService = new Date(lastServiceDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  const formattedNextService = new Date(nextServiceDue).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Calculate days until next service
  const today = new Date();
  const nextServiceDate = new Date(nextServiceDue);
  const daysUntilService = Math.floor((nextServiceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate odometer progress
  let odometerProgress = 0;
  const showOdometerProgress = nextServiceOdometer > 0 && lastServiceOdometer > 0;
  
  if (showOdometerProgress && currentOdometer) {
    const totalRange = nextServiceOdometer - lastServiceOdometer;
    const currentProgress = currentOdometer - lastServiceOdometer;
    odometerProgress = Math.min(100, Math.max(0, (currentProgress / totalRange) * 100));
  }

  const getServiceStatus = () => {
    if (daysUntilService < 0) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-800' };
    } else if (daysUntilService < 7) {
      return { label: 'Due Soon', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'On Schedule', color: 'bg-green-100 text-green-800' };
    }
  };

  const serviceStatus = getServiceStatus();

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-sm">Service Status</h4>
          <Badge className={serviceStatus.color}>{serviceStatus.label}</Badge>
        </div>
        
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>Last Service:</span>
            </div>
            <span className="font-medium">{formattedLastService}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Timer className="h-4 w-4 text-gray-500" />
              <span>Next Service:</span>
            </div>
            <span className="font-medium">{formattedNextService}</span>
          </div>
          
          {daysUntilService < 0 ? (
            <div className="flex items-center gap-1 text-red-600 mt-1">
              <AlertTriangle className="h-4 w-4" />
              <span>Service overdue by {Math.abs(daysUntilService)} days</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-gray-600 mt-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Next service in {daysUntilService} days</span>
            </div>
          )}
          
          {showOdometerProgress && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Last: {lastServiceOdometer} km</span>
                <span>Next: {nextServiceOdometer} km</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Progress value={odometerProgress} className="h-2" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {currentOdometer ? 
                        `Current: ${currentOdometer} km (${odometerProgress.toFixed(0)}%)` : 
                        `${nextServiceOdometer - lastServiceOdometer} km until next service`
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          
          {!showOdometerProgress && (
            <div className="mt-2 text-xs text-gray-500">
              {nextServiceOdometer > 0 ? 
                `Next service at ${nextServiceOdometer} km` : 
                'No odometer reading set for next service'
              }
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
