import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Clock, CreditCard, XCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';

interface BookingFlowProps {
  ride: PoolingRide;
  requestedSeats: number;
  onSendRequest: (message?: string) => void;
  onPayment: () => void;
  onCancel: () => void;
  currentStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'paid' | 'completed';
  canCancel?: boolean;
}

export function BookingFlow({ 
  ride, 
  requestedSeats, 
  onSendRequest, 
  onPayment, 
  onCancel, 
  currentStatus,
  canCancel = true 
}: BookingFlowProps) {
  const [requestMessage, setRequestMessage] = useState('');
  const [showMessageBox, setShowMessageBox] = useState(false);

  const statusSteps = [
    { id: 'pending', label: 'Request Sent', icon: Clock, color: 'yellow' },
    { id: 'approved', label: 'Approved', icon: CheckCircle, color: 'green' },
    { id: 'paid', label: 'Payment Complete', icon: CreditCard, color: 'blue' },
    { id: 'completed', label: 'Trip Completed', icon: CheckCircle, color: 'purple' }
  ];

  const getCurrentStepIndex = () => {
    switch (currentStatus) {
      case 'pending': return 0;
      case 'approved': return 1;
      case 'paid': return 2;
      case 'completed': return 3;
      default: return -1;
    }
  };

  const totalAmount = ride.pricePerSeat * requestedSeats;
  const cancellationDeadline = new Date(ride.departureTime);
  cancellationDeadline.setHours(cancellationDeadline.getHours() - 2); // 2 hours before departure
  const canCancelFree = new Date() < cancellationDeadline;

  const handleSendRequest = () => {
    onSendRequest(requestMessage);
    setShowMessageBox(false);
    setRequestMessage('');
  };

  if (currentStatus === 'rejected') {
    return (
      <Alert className="border-red-200 bg-red-50">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Your ride request was declined by the provider. Please try searching for other available rides.
        </AlertDescription>
      </Alert>
    );
  }

  if (currentStatus === 'none') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request This Ride</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Total Amount:</span>
              <span className="text-xl font-bold text-blue-600">₹{totalAmount}</span>
            </div>
            <div className="text-sm text-gray-600">
              ₹{ride.pricePerSeat} × {requestedSeats} seat(s)
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Payment will only be required after the provider approves your request.
            </AlertDescription>
          </Alert>

          {!showMessageBox ? (
            <div className="flex gap-2">
              <Button onClick={() => onSendRequest()} className="flex-1">
                Send Request
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowMessageBox(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Add Message
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Add a message for the provider (optional)"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                maxLength={200}
              />
              <div className="flex gap-2">
                <Button onClick={handleSendRequest} className="flex-1">
                  Send Request
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowMessageBox(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Booking Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Progress */}
        <div className="space-y-4">
          {statusSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= getCurrentStepIndex();
            const isCurrent = index === getCurrentStepIndex();
            
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive 
                    ? `bg-${step.color}-100 text-${step.color}-600` 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${
                    isActive ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </div>
                  {isCurrent && (
                    <div className="text-sm text-gray-500">
                      {step.id === 'pending' && 'Waiting for provider approval...'}
                      {step.id === 'approved' && 'Ready for payment'}
                    </div>
                  )}
                </div>
                {isActive && (
                  <Badge variant={step.color === 'green' ? 'default' : 'secondary'}>
                    {isCurrent ? 'Current' : 'Complete'}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Show payment button when approved */}
          {currentStatus === 'approved' && (
            <Button onClick={onPayment} className="w-full" size="lg">
              <CreditCard className="h-4 w-4 mr-2" />
              Pay ₹{totalAmount}
            </Button>
          )}

          {(currentStatus === 'pending' || currentStatus === 'approved') && canCancel && (
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={onCancel} 
                className="w-full"
                disabled={!canCancelFree}
              >
                Cancel Booking
                {canCancelFree ? ' (Free)' : ' (Charges Apply)'}
              </Button>
              
              {!canCancelFree && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 text-sm">
                    Cancellation charges may apply as the departure time is less than 2 hours away.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Booking Details */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Seats:</span>
            <span className="font-medium">{requestedSeats}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Amount:</span>
            <span className="font-medium">₹{totalAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Provider:</span>
            <span className="font-medium">{ride.providerName}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
