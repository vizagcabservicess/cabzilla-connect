
import React from 'react';
import { X, AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationBannerProps {
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  details?: string;
  time?: string;
  onClose?: () => void;
  className?: string;
}

export function NotificationBanner({
  type,
  title,
  details,
  time,
  onClose,
  className
}: NotificationBannerProps) {
  // Define icon and colors based on type
  const iconMap = {
    error: <AlertCircle className="h-6 w-6 text-red-500" />,
    warning: <AlertTriangle className="h-6 w-6 text-amber-500" />,
    success: <CheckCircle className="h-6 w-6 text-green-500" />,
    info: <AlertCircle className="h-6 w-6 text-blue-500" />
  };

  const bgColors = {
    error: 'bg-white dark:bg-zinc-900 border-red-100 dark:border-red-900/50',
    warning: 'bg-white dark:bg-zinc-900 border-amber-100 dark:border-amber-900/50',
    success: 'bg-white dark:bg-zinc-900 border-green-100 dark:border-green-900/50',
    info: 'bg-white dark:bg-zinc-900 border-blue-100 dark:border-blue-900/50'
  };

  return (
    <div className={cn(
      'relative p-6 border rounded-lg shadow-sm mb-4',
      bgColors[type],
      className
    )}>
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
          aria-label="Close notification"
        >
          <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      )}
      
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {iconMap[type]}
        </div>
        
        <div className="flex-1">
          <h3 className="font-medium">{title}</h3>
          {details && <p className="mt-1 text-sm text-muted-foreground">{details}</p>}
          
          {time && (
            <div className="mt-2 flex items-center text-xs text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {time}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Specialized version for payment failures
export function PaymentFailedBanner({
  customer,
  booking,
  amount,
  time,
  onClose
}: {
  customer: string;
  booking: string;
  amount: string;
  time: string;
  onClose?: () => void;
}) {
  return (
    <NotificationBanner
      type="error"
      title="Payment failed"
      details={`Customer: ${customer}, Booking: ${booking}, Amount: ${amount}`}
      time={time}
      onClose={onClose}
    />
  );
}

// Specialized version for customer complaints
export function CustomerComplaintBanner({
  customer,
  issue,
  booking,
  time,
  onClose
}: {
  customer: string;
  issue: string;
  booking: string;
  time: string;
  onClose?: () => void;
}) {
  return (
    <NotificationBanner
      type="warning"
      title="Customer complaint received"
      details={`Customer: ${customer}, Issue: ${issue}, Booking: ${booking}`}
      time={time}
      onClose={onClose}
    />
  );
}

// Specialized version for booking cancellations
export function BookingCancelledBanner({
  customer,
  booking,
  status,
  time,
  onClose
}: {
  customer: string;
  booking: string;
  status: string;
  time: string;
  onClose?: () => void;
}) {
  return (
    <NotificationBanner
      type="info"
      title="Booking cancelled"
      details={`Customer: ${customer}, Booking: ${booking}, ${status}`}
      time={time}
      onClose={onClose}
    />
  );
}

// Specialized version for system notifications
export function SystemNotificationBanner({
  title,
  message,
  time,
  onClose
}: {
  title: string;
  message: string;
  time: string;
  onClose?: () => void;
}) {
  return (
    <NotificationBanner
      type="success"
      title={title}
      details={message}
      time={time}
      onClose={onClose}
    />
  );
}
