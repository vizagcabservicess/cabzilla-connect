
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, User, MessageSquare, Star } from 'lucide-react';
import { format } from 'date-fns';
import { RideRequest, RequestStatus } from '@/types/pooling';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';

interface RequestManagementProps {
  requests: RideRequest[];
  onApprove: (requestId: number, responseMessage?: string) => Promise<void>;
  onReject: (requestId: number, responseMessage?: string) => Promise<void>;
  showProviderActions?: boolean;
}

export function RequestManagement({ 
  requests, 
  onApprove, 
  onReject, 
  showProviderActions = false 
}: RequestManagementProps) {
  const { user } = usePoolingAuth();
  const [responseMessages, setResponseMessages] = useState<{ [key: number]: string }>({});
  const [processingRequest, setProcessingRequest] = useState<number | null>(null);

  const handleApprove = async (requestId: number) => {
    try {
      setProcessingRequest(requestId);
      await onApprove(requestId, responseMessages[requestId]);
      toast.success('Request approved successfully!');
    } catch (error) {
      toast.error('Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      setProcessingRequest(requestId);
      await onReject(requestId, responseMessages[requestId]);
      toast.success('Request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
          <p className="text-gray-600">
            {showProviderActions 
              ? 'When guests request to join your rides, they will appear here'
              : 'Your ride requests will appear here'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map(request => (
        <Card key={request.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{request.guestName}</h3>
                  <p className="text-sm text-gray-600">{request.guestEmail}</p>
                  <p className="text-sm text-gray-600">{request.guestPhone}</p>
                </div>
              </div>
              <Badge className={getStatusColor(request.status)}>
                {getStatusIcon(request.status)}
                <span className="ml-1 capitalize">{request.status}</span>
              </Badge>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Seats Requested:</p>
              <p className="font-medium">{request.seatsRequested} seats</p>
            </div>

            {request.requestMessage && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Message:</p>
                <p className="bg-gray-50 p-3 rounded-lg text-sm">{request.requestMessage}</p>
              </div>
            )}

            {request.responseMessage && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Response:</p>
                <p className="bg-blue-50 p-3 rounded-lg text-sm">{request.responseMessage}</p>
              </div>
            )}

            <div className="text-xs text-gray-500 mb-4">
              Requested on {format(new Date(request.requestedAt), 'MMM dd, yyyy HH:mm')}
              {request.respondedAt && (
                <span> • Responded on {format(new Date(request.respondedAt), 'MMM dd, yyyy HH:mm')}</span>
              )}
            </div>

            {showProviderActions && request.status === 'pending' && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Optional response message..."
                  value={responseMessages[request.id] || ''}
                  onChange={(e) => setResponseMessages(prev => ({
                    ...prev,
                    [request.id]: e.target.value
                  }))}
                  rows={2}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleApprove(request.id)}
                    disabled={processingRequest === request.id}
                    className="flex-1"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(request.id)}
                    disabled={processingRequest === request.id}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
