import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, Clock, XCircle, MessageSquare, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { poolingAPI } from '@/services/api/poolingAPI';

interface Notification {
  id: string;
  type: 'request_approved' | 'request_rejected' | 'payment_reminder' | 'trip_reminder' | 'message_received';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

interface NotificationCenterProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ userId, isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    const count = notifications.filter(n => !n.isRead).length;
    setUnreadCount(count);
  }, [notifications]);

  const loadNotifications = async () => {
    // Fetch real notifications from backend
    try {
      const data = await poolingAPI.notifications.getByUser(userId);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotifications([]);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'request_approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'request_rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'payment_reminder':
        return <CreditCard className="h-5 w-5 text-blue-600" />;
      case 'trip_reminder':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'message_received':
        return <MessageSquare className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-200';
      case 'medium': return 'bg-yellow-100 border-yellow-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return time.toLocaleDateString();
  };

  // Real-time notification simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate receiving new notifications
      const randomEvents = [
        'request_approved',
        'message_received',
        'trip_reminder'
      ];
      
      if (Math.random() < 0.1) { // 10% chance every 10 seconds
        const newNotification: Notification = {
          id: Date.now().toString(),
          type: randomEvents[Math.floor(Math.random() * randomEvents.length)] as any,
          title: 'New Notification',
          message: 'You have a new update!',
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: 'medium'
        };

        setNotifications(prev => [newNotification, ...prev]);
        toast.success('New notification received!');
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  return (
    <Card className="fixed top-16 right-4 w-96 max-h-96 z-50 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  } ${getPriorityColor(notification.priority)}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${
                          !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      {/* Payment link/button for payment-related notifications */}
                      {(notification.type === 'payment_reminder' || notification.type === 'request_approved') && notification.actionUrl && (
                        <a href={notification.actionUrl} className="inline-block mt-2 text-blue-600 underline font-medium">
                          Pay Now
                        </a>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
