
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  Plus, 
  Car, 
  Users, 
  TrendingUp, 
  AlertCircle,
  Calendar,
  Star,
  IndianRupee,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { PoolingRide, WalletTransaction, ProviderEarnings } from '@/types/pooling';
import { RequestManagement } from './RequestManagement';
import { WalletManager } from './WalletManager';
import { toast } from 'sonner';

interface ProviderDashboardProps {
  rides: PoolingRide[];
  earnings: ProviderEarnings[];
  walletTransactions: WalletTransaction[];
  onCreateRide: () => void;
  onEditRide: (rideId: number) => void;
  onDeleteRide: (rideId: number) => void;
  onApproveRequest: (requestId: number, responseMessage?: string) => Promise<void>;
  onRejectRequest: (requestId: number, responseMessage?: string) => Promise<void>;
}

export function ProviderDashboard({
  rides,
  earnings,
  walletTransactions,
  onCreateRide,
  onEditRide,
  onDeleteRide,
  onApproveRequest,
  onRejectRequest
}: ProviderDashboardProps) {
  const { user, wallet, canCreateRide } = usePoolingAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const totalEarnings = earnings.reduce((sum, earning) => sum + earning.netAmount, 0);
  const pendingEarnings = earnings
    .filter(e => e.status === 'pending')
    .reduce((sum, earning) => sum + earning.netAmount, 0);
  
  const activeRides = rides.filter(ride => ride.status === 'active');
  const totalRequests = rides.reduce((sum, ride) => sum + (ride.requests?.length || 0), 0);
  const pendingRequests = rides.reduce((sum, ride) => 
    sum + (ride.requests?.filter(req => req.status === 'pending').length || 0), 0);

  const handleDeleteRide = (rideId: number) => {
    if (confirm('Are you sure you want to delete this ride? This action cannot be undone.')) {
      onDeleteRide(rideId);
      toast.success('Ride deleted successfully');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Provider Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}</p>
        </div>
        <Button onClick={onCreateRide} disabled={!canCreateRide()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Ride
        </Button>
      </div>

      {/* Wallet Balance Alert */}
      {wallet && wallet.balance < wallet.minimumBalance && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">
                  Low Wallet Balance
                </p>
                <p className="text-sm text-orange-700">
                  You need ₹{wallet.minimumBalance} minimum to create rides. 
                  Current balance: ₹{wallet.balance}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rides">My Rides</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Car className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Rides</p>
                    <p className="text-2xl font-bold">{activeRides.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Requests</p>
                    <p className="text-2xl font-bold">{totalRequests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold">₹{totalEarnings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                    <p className="text-2xl font-bold">₹{wallet?.balance || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Rides</CardTitle>
              </CardHeader>
              <CardContent>
                {activeRides.slice(0, 3).map(ride => (
                  <div key={ride.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{ride.fromLocation} → {ride.toLocation}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(ride.departureTime), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {ride.availableSeats}/{ride.totalSeats} seats
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingRequests > 0 ? (
                  <div className="text-center py-4">
                    <p className="text-2xl font-bold text-orange-600">{pendingRequests}</p>
                    <p className="text-sm text-gray-600">requests waiting for approval</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setActiveTab('requests')}
                    >
                      View All Requests
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-4">No pending requests</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rides" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Rides</h2>
            <Button onClick={onCreateRide} disabled={!canCreateRide()}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Ride
            </Button>
          </div>

          {rides.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rides created yet</h3>
                <p className="text-gray-600 mb-4">Start by creating your first ride</p>
                <Button onClick={onCreateRide} disabled={!canCreateRide()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Ride
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rides.map(ride => (
                <Card key={ride.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {ride.type}
                          </Badge>
                          <Badge className={
                            ride.status === 'active' ? 'bg-green-100 text-green-800' :
                            ride.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {ride.status}
                          </Badge>
                        </div>
                        
                        <h3 className="font-semibold text-lg mb-2">
                          {ride.fromLocation} → {ride.toLocation}
                        </h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Departure:</span>
                            <p className="font-medium">
                              {format(new Date(ride.departureTime), 'MMM dd, HH:mm')}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Seats:</span>
                            <p className="font-medium">
                              {ride.availableSeats}/{ride.totalSeats} available
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Price:</span>
                            <p className="font-medium">₹{ride.pricePerSeat}/seat</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Requests:</span>
                            <p className="font-medium">{ride.requests?.length || 0}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onEditRide(ride.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteRide(ride.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests">
          <RequestManagement
            requests={rides.flatMap(ride => ride.requests || [])}
            onApprove={onApproveRequest}
            onReject={onRejectRequest}
            showProviderActions={true}
          />
        </TabsContent>

        <TabsContent value="earnings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <IndianRupee className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold">₹{totalEarnings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold">₹{pendingEarnings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available</p>
                    <p className="text-2xl font-bold">₹{wallet?.balance || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Earnings History</CardTitle>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No earnings yet</p>
              ) : (
                <div className="space-y-4">
                  {earnings.map(earning => (
                    <div key={earning.id} className="flex items-center justify-between py-3 border-b">
                      <div>
                        <p className="font-medium">Booking #{earning.bookingId}</p>
                        <p className="text-sm text-gray-600">
                          Gross: ₹{earning.grossAmount} | Commission: ₹{earning.commissionAmount}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{earning.netAmount}</p>
                        <Badge variant={
                          earning.status === 'paid' ? 'default' :
                          earning.status === 'released' ? 'secondary' : 'outline'
                        }>
                          {earning.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <WalletManager
            wallet={wallet}
            transactions={walletTransactions}
            userRole="provider"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
