
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
  const [responseMessages, setResponseMessages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
    }
  };

  const handleApprove = async (request: RideRequest) => {
    try {
      setLoading(prev => ({ ...prev, [request.id]: true }));
      await onApprove(request.id, responseMessages[request.id]);
      toast.success('Request approved successfully!');
      setResponseMessages(prev => ({ ...prev, [request.id]: '' }));
    } catch (error) {
      toast.error('Failed to approve request');
    } finally {
      setLoading(prev => ({ ...prev, [request.id]: false }));
    }
  };

  const handleReject = async (request: RideRequest) => {
    try {
      setLoading(prev => ({ ...prev, [request.id]: true }));
      await onReject(request.id, responseMessages[request.id]);
      toast.success('Request rejected');
      setResponseMessages(prev => ({ ...prev, [request.id]: '' }));
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setLoading(prev => ({ ...prev, [request.id]: false }));
    }
  };

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {showProviderActions ? 'No ride requests yet' : 'No requests sent yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {showProviderActions ? 'Ride Requests' : 'My Requests'}
      </h3>
      
      {requests.map((request) => (
        <Card key={request.id}>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {request.guestName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{request.guestName}</div>
                    <div className="text-sm text-gray-600">{request.guestPhone}</div>
                  </div>
                </div>
                <Badge className={getStatusColor(request.status)}>
                  {getStatusIcon(request.status)}
                  <span className="ml-1 capitalize">{request.status}</span>
                </Badge>
              </div>

              {/* Request Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Seats Requested:</span>
                  <span className="ml-2 font-medium">{request.seatsRequested}</span>
                </div>
                <div>
                  <span className="text-gray-600">Requested At:</span>
                  <span className="ml-2">
                    {format(new Date(request.requestedAt), 'MMM dd, HH:mm')}
                  </span>
                </div>
              </div>

              {/* Request Message */}
              {request.requestMessage && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Message:</div>
                  <div className="text-sm">{request.requestMessage}</div>
                </div>
              )}

              {/* Response Message */}
              {request.responseMessage && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Response:</div>
                  <div className="text-sm">{request.responseMessage}</div>
                  {request.respondedAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      Responded at {format(new Date(request.respondedAt), 'MMM dd, HH:mm')}
                    </div>
                  )}
                </div>
              )}

              {/* Provider Actions */}
              {showProviderActions && request.status === 'pending' && (
                <div className="space-y-3 pt-4 border-t">
                  <Textarea
                    placeholder="Add a response message (optional)"
                    value={responseMessages[request.id] || ''}
                    onChange={(e) => setResponseMessages(prev => ({
                      ...prev,
                      [request.id]: e.target.value
                    }))}
                    rows={2}
                  />
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleApprove(request)}
                      disabled={loading[request.id]}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(request)}
                      disabled={loading[request.id]}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* Guest Actions */}
              {!showProviderActions && request.status === 'approved' && (
                <div className="pt-4 border-t">
                  <Button className="w-full">
                    Proceed to Payment
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
