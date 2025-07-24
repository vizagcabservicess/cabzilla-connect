
import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bell, AlertTriangle, CheckCircle, Clock, Car, 
  Calendar, User, DollarSign, X, RefreshCw 
} from "lucide-react";

export function AdminNotifications() {
  // Sample notification data - in production, this would come from an API
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'emergency',
      title: 'Driver Rajesh reported an accident',
      description: 'Location: Near Gachibowli Flyover. Contact: 9966363662',
      time: '10 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'booking',
      title: 'New booking received',
      description: 'Customer: Anil Kumar, From: Airport, To: Jubilee Hills',
      time: '25 minutes ago',
      read: false
    },
    {
      id: 3,
      type: 'maintenance',
      title: 'Vehicle maintenance due',
      description: 'Vehicle: AP31XX1234 is due for service. Last service: 3 months ago',
      time: '1 hour ago',
      read: false
    },
    {
      id: 4,
      type: 'driver',
      title: 'Driver availability alert',
      description: 'Only 5 drivers available in Hitech City area. High demand expected.',
      time: '2 hours ago',
      read: true
    },
    {
      id: 5,
      type: 'payment',
      title: 'Payment failed',
      description: 'Customer: Sunita Reddy, Booking: #BK12345, Amount: ₹850',
      time: '3 hours ago',
      read: true
    },
    {
      id: 6,
      type: 'complaint',
      title: 'Customer complaint received',
      description: 'Customer: Venkat Rao, Issue: Driver behavior, Booking: #BK12340',
      time: '5 hours ago',
      read: true
    },
    {
      id: 7,
      type: 'booking',
      title: 'Booking cancelled',
      description: 'Customer: Priya Sharma, Booking: #BK12338, Refund processed',
      time: '8 hours ago',
      read: true
    },
    {
      id: 8,
      type: 'system',
      title: 'System maintenance completed',
      description: 'Server maintenance completed successfully. All systems operational.',
      time: '1 day ago',
      read: true
    }
  ]);

  const [filter, setFilter] = useState('all');

  // Function to mark notification as read
  const markAsRead = (id: number) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  // Function to mark all as read
  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  // Function to filter notifications
  const filteredNotifications = filter === 'all' 
    ? notifications 
    : filter === 'unread'
      ? notifications.filter(n => !n.read)
      : notifications.filter(n => n.type === filter);

  // Function to get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'booking':
        return <Car className="h-5 w-5 text-blue-500" />;
      case 'maintenance':
        return <RefreshCw className="h-5 w-5 text-yellow-500" />;
      case 'driver':
        return <User className="h-5 w-5 text-green-500" />;
      case 'payment':
        return <DollarSign className="h-5 w-5 text-purple-500" />;
      case 'complaint':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'system':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Notifications & Alerts</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
          <Button>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className={`cursor-pointer ${filter === 'all' ? 'border-primary' : ''}`}
          onClick={() => setFilter('all')}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <span>All</span>
            </div>
            <Badge>{notifications.length}</Badge>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer ${filter === 'unread' ? 'border-primary' : ''}`}
          onClick={() => setFilter('unread')}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Unread</span>
            </div>
            <Badge>{notifications.filter(n => !n.read).length}</Badge>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer ${filter === 'emergency' ? 'border-primary' : ''}`}
          onClick={() => setFilter('emergency')}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Emergency</span>
            </div>
            <Badge>{notifications.filter(n => n.type === 'emergency').length}</Badge>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer ${filter === 'booking' ? 'border-primary' : ''}`}
          onClick={() => setFilter('booking')}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-500" />
              <span>Bookings</span>
            </div>
            <Badge>{notifications.filter(n => n.type === 'booking').length}</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`hover:shadow-md transition-shadow ${!notification.read ? 'bg-blue-50' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{notification.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{notification.description}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" /> {notification.time}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {!notification.read && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Bell className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No notifications found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
