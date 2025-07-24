
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Car, 
  Wallet, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  IndianRupee,
  MapPin,
  Star
} from 'lucide-react';
import { PoolingAnalytics, PoolingUser, PoolingRide, PoolingBooking, Dispute } from '@/types/pooling';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - replace with real API calls
  const mockAnalytics: PoolingAnalytics = {
    totalRides: 156,
    activeRides: 23,
    completedRides: 120,
    cancelledRides: 13,
    totalBookings: 445,
    pendingBookings: 12,
    confirmedBookings: 380,
    totalRevenue: 125000,
    commissionEarned: 12500,
    averageRating: 4.3,
    totalProviders: 89,
    verifiedProviders: 76,
    activeDisputes: 3,
    refundsProcessed: 8,
    cancellationRate: 8.3,
    monthlyGrowth: 15.4,
    revenueByType: {
      carpool: 75000,
      bus: 35000,
      sharedTaxi: 15000
    },
    topRoutes: [
      { route: 'Hyderabad → Vijayawada', bookings: 45, revenue: 13500 },
      { route: 'Visakhapatnam → Hyderabad', bookings: 38, revenue: 11400 },
      { route: 'Guntur → Tirupati', bookings: 32, revenue: 9600 }
    ]
  };

  const mockUsers: PoolingUser[] = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+91 9966363662',
      role: 'provider',
      isActive: true,
      rating: 4.5,
      totalRides: 25,
      walletBalance: 2500,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+91 9876543211',
      role: 'guest',
      isActive: true,
      rating: 4.8,
      totalRides: 12,
      walletBalance: 750,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-14T00:00:00Z'
    }
  ];

  const mockDisputes: Dispute[] = [
    {
      id: 1,
      bookingId: 123,
      raisedBy: 2,
      raisedAgainst: 1,
      type: 'payment',
      subject: 'Payment not received',
      description: 'Payment was deducted but ride was cancelled',
      status: 'investigating',
      priority: 'high',
      createdAt: '2024-01-15T10:00:00Z'
    }
  ];

  const handleTriggerPayout = async (userId: number) => {
    try {
      // API call to trigger manual payout
      console.log('Triggering payout for user:', userId);
    } catch (error) {
      console.error('Failed to trigger payout:', error);
    }
  };

  const handleResolveDispute = async (disputeId: number, resolution: string) => {
    try {
      // API call to resolve dispute
      console.log('Resolving dispute:', disputeId, resolution);
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and management</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rides</p>
                <p className="text-2xl font-bold">{mockAnalytics.totalRides}</p>
                <p className="text-xs text-green-600">+{mockAnalytics.monthlyGrowth}% this month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{mockUsers.length}</p>
                <p className="text-xs text-gray-600">{mockAnalytics.totalProviders} providers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IndianRupee className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">₹{mockAnalytics.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-600">₹{mockAnalytics.commissionEarned.toLocaleString()} commission</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Disputes</p>
                <p className="text-2xl font-bold">{mockAnalytics.activeDisputes}</p>
                <p className="text-xs text-gray-600">{mockAnalytics.refundsProcessed} refunds processed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="rides">Rides</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Car Pool</span>
                    <span className="font-bold">₹{mockAnalytics.revenueByType.carpool.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bus</span>
                    <span className="font-bold">₹{mockAnalytics.revenueByType.bus.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shared Taxi</span>
                    <span className="font-bold">₹{mockAnalytics.revenueByType.sharedTaxi.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Routes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAnalytics.topRoutes.map((route, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{route.route}</p>
                        <p className="text-sm text-gray-600">{route.bookings} bookings</p>
                      </div>
                      <span className="font-bold">₹{route.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={user.role === 'provider' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{user.walletBalance}</p>
                      <p className="text-sm text-gray-600">{user.totalRides} rides</p>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm">{user.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rides">
          <Card>
            <CardHeader>
              <CardTitle>Ride Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ride Management</h3>
                <p className="text-gray-600">Monitor all platform rides and bookings</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Provider Payouts</p>
                    <p className="text-sm text-gray-600">Pending: ₹25,000</p>
                  </div>
                  <Button onClick={() => handleTriggerPayout(1)}>
                    Trigger Payout
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Refund Requests</p>
                    <p className="text-sm text-gray-600">Pending: 3 requests</p>
                  </div>
                  <Button variant="outline">
                    Process Refunds
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes">
          <Card>
            <CardHeader>
              <CardTitle>Dispute Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockDisputes.map(dispute => (
                  <div key={dispute.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{dispute.subject}</h3>
                        <p className="text-sm text-gray-600">Booking #{dispute.bookingId}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge variant={dispute.priority === 'high' ? 'destructive' : 'default'}>
                          {dispute.priority}
                        </Badge>
                        <Badge variant="outline">
                          {dispute.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm mb-3">{dispute.description}</p>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => handleResolveDispute(dispute.id, 'Resolved in favor of customer')}>
                        Resolve
                      </Button>
                      <Button size="sm" variant="outline">
                        Investigate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
