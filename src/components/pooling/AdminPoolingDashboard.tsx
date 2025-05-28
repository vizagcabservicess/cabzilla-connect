
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Car, 
  TrendingUp, 
  Wallet, 
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Download,
  Eye,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { PoolingAnalytics, PoolingUser, PoolingRide, PoolingBooking, Dispute } from '@/types/pooling';

interface AdminPoolingDashboardProps {
  analytics: PoolingAnalytics;
  users: PoolingUser[];
  rides: PoolingRide[];
  bookings: PoolingBooking[];
  disputes: Dispute[];
  onTriggerPayout: (providerId: number, amount: number) => Promise<void>;
  onResolveDispute: (disputeId: number, resolution: string) => Promise<void>;
  onSuspendUser: (userId: number) => Promise<void>;
  onActivateUser: (userId: number) => Promise<void>;
}

export function AdminPoolingDashboard({
  analytics,
  users,
  rides,
  bookings,
  disputes,
  onTriggerPayout,
  onResolveDispute,
  onSuspendUser,
  onActivateUser
}: AdminPoolingDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const pendingDisputes = disputes.filter(d => d.status === 'open' || d.status === 'investigating');
  const providers = users.filter(u => u.role === 'provider');
  const guests = users.filter(u => u.role === 'guest');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Pooling Dashboard</h1>
          <p className="text-gray-600">Monitor and manage the pooling platform</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="rides">Rides</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Car className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Rides</p>
                    <p className="text-2xl font-bold">{analytics.totalRides}</p>
                    <p className="text-sm text-green-600">
                      {analytics.activeRides} active
                    </p>
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
                    <p className="text-2xl font-bold">{users.length}</p>
                    <p className="text-sm text-blue-600">
                      {providers.length} providers, {guests.length} guests
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">₹{analytics.totalRevenue}</p>
                    <p className="text-sm text-green-600">
                      +{analytics.monthlyGrowth}% this month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Disputes</p>
                    <p className="text-2xl font-bold">{pendingDisputes.length}</p>
                    <p className="text-sm text-red-600">
                      Needs attention
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Service Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Car Pool</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{analytics.revenueByType.carpool}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Bus</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{analytics.revenueByType.bus}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Shared Taxi</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ₹{analytics.revenueByType.sharedTaxi}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Routes */}
          <Card>
            <CardHeader>
              <CardTitle>Top Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topRoutes.slice(0, 5).map((route, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="font-medium">{route.route}</p>
                      <p className="text-sm text-gray-600">{route.bookings} bookings</p>
                    </div>
                    <p className="font-bold">₹{route.revenue}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">User Management</h2>
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Providers ({providers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {providers.slice(0, 10).map(provider => (
                    <div key={provider.id} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-gray-600">{provider.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                            {provider.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {provider.rating && (
                            <span className="text-sm text-gray-600">
                              ⭐ {provider.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => provider.isActive ? 
                            onSuspendUser(provider.id) : 
                            onActivateUser(provider.id)
                          }
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guests ({guests.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {guests.slice(0, 10).map(guest => (
                    <div key={guest.id} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <p className="font-medium">{guest.name}</p>
                        <p className="text-sm text-gray-600">{guest.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={guest.isActive ? 'default' : 'secondary'}>
                            {guest.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {guest.totalRides || 0} rides
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => guest.isActive ? 
                            onSuspendUser(guest.id) : 
                            onActivateUser(guest.id)
                          }
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Dispute Management</h2>
            <Badge variant="destructive">
              {pendingDisputes.length} Pending
            </Badge>
          </div>

          {disputes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Disputes</h3>
                <p className="text-gray-600">All good! No disputes to resolve.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {disputes.map(dispute => (
                <Card key={dispute.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={
                            dispute.status === 'open' ? 'destructive' :
                            dispute.status === 'investigating' ? 'default' :
                            dispute.status === 'resolved' ? 'secondary' : 'outline'
                          }>
                            {dispute.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {dispute.priority}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {dispute.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <h3 className="font-semibold text-lg mb-2">{dispute.subject}</h3>
                        <p className="text-gray-600 mb-4">{dispute.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Booking ID:</span>
                            <span className="ml-2 font-medium">#{dispute.bookingId}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Created:</span>
                            <span className="ml-2">
                              {format(new Date(dispute.createdAt), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>

                        {dispute.resolution && (
                          <div className="mt-4 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-800">Resolution:</p>
                            <p className="text-sm text-green-700">{dispute.resolution}</p>
                          </div>
                        )}
                      </div>
                      
                      {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onResolveDispute(dispute.id, 'Resolved by admin')}
                          >
                            Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
