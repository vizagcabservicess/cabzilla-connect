
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Car, 
  Plus, 
  Wallet, 
  Star, 
  Calendar, 
  Users, 
  Clock, 
  MapPin,
  Check,
  X,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide, RideRequest, PoolingWallet, WalletTransaction } from '@/types/pooling';
import { CreateRideForm } from './CreateRideForm';
import { WalletManager } from './WalletManager';
import { RequestManagement } from './RequestManagement';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function ProviderDashboard() {
  const { user, canCreateRide } = usePoolingAuth();
  const [myRides, setMyRides] = useState<PoolingRide[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);
  const [wallet, setWallet] = useState<PoolingWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [showCreateRide, setShowCreateRide] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProviderData();
    }
  }, [user]);

  const loadProviderData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadMyRides(),
        loadPendingRequests(),
        loadWallet(),
        loadTransactions()
      ]);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyRides = async () => {
    try {
      const rides = await poolingAPI.rides.getByProvider(user!.id);
      setMyRides(rides);
    } catch (error) {
      console.error('Failed to load rides:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      // Get all requests for my rides
      const allRequests: RideRequest[] = [];
      for (const ride of myRides) {
        const requests = await poolingAPI.requests.getByRide(ride.id);
        allRequests.push(...requests.filter(req => req.status === 'pending'));
      }
      setPendingRequests(allRequests);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const loadWallet = async () => {
    try {
      const walletData = await poolingAPI.wallet.get(user!.id);
      setWallet(walletData);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const transactionData = await poolingAPI.wallet.getTransactions(user!.id);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      await poolingAPI.requests.approve(requestId, 'Request approved! Please proceed with payment.');
      toast.success('Request approved');
      loadPendingRequests();
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await poolingAPI.requests.reject(requestId, 'Sorry, this request cannot be accommodated.');
      toast.success('Request rejected');
      loadPendingRequests();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleCreateRide = async (rideData: any) => {
    try {
      await poolingAPI.rides.create(rideData, user!.id);
      toast.success('Ride created successfully');
      setShowCreateRide(false);
      loadMyRides();
    } catch (error) {
      toast.error('Failed to create ride');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      case 'full': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}!</p>
        </div>

        {/* Wallet Balance Alert */}
        {!canCreateRide() && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-orange-600" />
                <span className="text-orange-800">
                  Maintain ₹500 minimum balance to create rides. Current balance: ₹{wallet?.balance || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Car className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Rides</p>
                  <p className="text-2xl font-bold">{myRides.filter(r => r.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Wallet className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Wallet Balance</p>
                  <p className="text-2xl font-bold">₹{wallet?.balance || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Star className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="text-2xl font-bold">{user?.rating?.toFixed(1) || 'New'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rides" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rides">My Rides</TabsTrigger>
            <TabsTrigger value="requests">Requests ({pendingRequests.length})</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          {/* Rides Tab */}
          <TabsContent value="rides" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Rides</h2>
              <Button 
                onClick={() => setShowCreateRide(true)}
                disabled={!canCreateRide()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Ride
              </Button>
            </div>

            {showCreateRide && (
              <CreateRideForm
                onSubmit={handleCreateRide}
                onCancel={() => setShowCreateRide(false)}
              />
            )}

            <div className="space-y-4">
              {myRides.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">No rides created yet. Create your first ride to start earning!</p>
                  </CardContent>
                </Card>
              ) : (
                myRides.map((ride) => (
                  <Card key={ride.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span className="font-semibold">{ride.fromLocation}</span>
                              <span className="text-gray-500">→</span>
                              <span className="font-semibold">{ride.toLocation}</span>
                            </div>
                            <Badge className={`${getStatusColor(ride.status)} text-white`}>
                              {ride.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Departure</p>
                              <p className="font-medium">{format(new Date(ride.departureTime), 'PPP p')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Available Seats</p>
                              <p className="font-medium">{ride.availableSeats}/{ride.totalSeats}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Price per Seat</p>
                              <p className="font-medium">₹{ride.pricePerSeat}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Total Revenue</p>
                              <p className="font-medium">₹{(ride.totalSeats - ride.availableSeats) * ride.pricePerSeat}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <RequestManagement
              requests={pendingRequests}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <WalletManager
              wallet={wallet}
              transactions={transactions}
              onWalletUpdate={loadWallet}
            />
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <DollarSign className="w-6 h-6 text-green-600" />
                      <span className="text-sm text-gray-600">Total Earnings</span>
                    </div>
                    <p className="text-2xl font-bold">₹{wallet?.totalEarnings || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                      <span className="text-sm text-gray-600">This Month</span>
                    </div>
                    <p className="text-2xl font-bold">₹0</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Wallet className="w-6 h-6 text-purple-600" />
                      <span className="text-sm text-gray-600">Available Balance</span>
                    </div>
                    <p className="text-2xl font-bold">₹{wallet?.balance || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-600">{format(new Date(transaction.createdAt), 'PPP')}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                          </p>
                          <p className="text-sm text-gray-600">₹{transaction.balanceAfter}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
