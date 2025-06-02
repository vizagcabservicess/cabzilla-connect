import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  Wallet, 
  Plus, 
  Users, 
  Clock, 
  CheckCircle,
  TrendingUp,
  Star,
  AlertTriangle
} from 'lucide-react';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { WalletManager } from './WalletManager';
import { RequestManagement } from './RequestManagement';
import { RatingSystem } from './RatingSystem';
import { CreateRideForm } from './CreateRideForm';
import { PoolingRide, RideRequest, WalletTransaction } from '@/types/pooling';
import { useQuery } from '@tanstack/react-query';
import { poolingAPI } from '@/services/api/poolingAPI';
import { toast } from 'sonner';

export function ProviderDashboard() {
  const { user, wallet, canCreateRide, refreshWallet } = usePoolingAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateRide, setShowCreateRide] = useState(false);
  const [rides, setRides] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      poolingAPI.rides.getByProvider(user.id)
        .then(data => setRides(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
      poolingAPI.wallet.getTransactions(user.id)
        .then(data => setTransactions(Array.isArray(data) ? data : []));
    }
  }, [user]);

  const handleCreateRide = async (rideData) => {
    try {
      await poolingAPI.rides.create(rideData, user?.providerId);
      toast.success('Ride created successfully!');
      setShowCreateRide(false);
      // Refresh rides
      if (user) {
        const updatedRides = await poolingAPI.rides.getByProvider(user.providerId);
        setRides(Array.isArray(updatedRides) ? updatedRides : []);
      }
    } catch (error) {
      toast.error('Failed to create ride');
    }
  };

  const handleApproveRequest = async (requestId, responseMessage) => {
    try {
      await poolingAPI.requests.approve(requestId, responseMessage);
      toast.success('Request approved!');
      // Optionally refresh rides/requests
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId, responseMessage) => {
    try {
      await poolingAPI.requests.reject(requestId, responseMessage);
      toast.success('Request rejected');
      // Optionally refresh rides/requests
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleWalletDeposit = async (amount) => {
    try {
      if (user) {
        await poolingAPI.wallet.deposit(user.id, amount);
        await refreshWallet();
        toast.success('Money added to wallet!');
        // Refresh transactions
        const updatedTransactions = await poolingAPI.wallet.getTransactions(user.id);
        setTransactions(updatedTransactions);
      }
    } catch (error) {
      toast.error('Failed to add money');
    }
  };

  const handleWalletWithdraw = async (amount) => {
    try {
      if (user) {
        await poolingAPI.wallet.withdraw(user.id, amount);
        await refreshWallet();
        toast.success('Withdrawal request submitted!');
        // Refresh transactions
        const updatedTransactions = await poolingAPI.wallet.getTransactions(user.id);
        setTransactions(updatedTransactions);
      }
    } catch (error) {
      toast.error('Failed to process withdrawal');
    }
  };

  if (showCreateRide) {
    return (
      <div className="p-6">
        <CreateRideForm 
          onSubmit={handleCreateRide}
          onCancel={() => setShowCreateRide(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provider Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}</p>
        </div>
        <Button 
          onClick={() => setShowCreateRide(true)}
          disabled={!canCreateRide()}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Ride</span>
        </Button>
      </div>

      {/* Wallet Alert */}
      {!canCreateRide() && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Minimum Balance Required</p>
                <p className="text-sm text-orange-700">
                  Add ₹{500 - (wallet?.balance || 0)} to your wallet to create rides
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rides</p>
                <p className="text-2xl font-bold">{rides.filter(r => r.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold">{rides.reduce((acc, ride) => acc + (ride.totalSeats - ride.availableSeats), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Wallet className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                <p className="text-2xl font-bold">₹{wallet?.balance || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Star className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Rating</p>
                <p className="text-2xl font-bold">{user?.rating?.toFixed(1) || '0.0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rides">My Rides</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Rides</CardTitle>
              </CardHeader>
              <CardContent>
                {rides.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No rides created yet</p>
                ) : (
                  <div className="space-y-3">
                    {rides.slice(0, 3).map(ride => (
                      <div key={ride.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{ride.fromLocation} → {ride.toLocation}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(ride.departureTime).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={ride.status === 'active' ? 'default' : 'secondary'}>
                          {ride.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {rides.flatMap(r => r.requests?.filter(req => req.status === 'pending') || []).length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No pending requests</p>
                ) : (
                  <div className="space-y-3">
                    {rides.flatMap(r => r.requests?.filter(req => req.status === 'pending') || []).slice(0, 3).map(request => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{request.guestName}</p>
                          <p className="text-sm text-gray-600">{request.seatsRequested} seats</p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rides">
          <Card>
            <CardHeader>
              <CardTitle>My Rides</CardTitle>
            </CardHeader>
            <CardContent>
              {rides.length === 0 ? (
                <div className="text-center py-12">
                  <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No rides yet</h3>
                  <p className="text-gray-600 mb-4">Create your first ride to start earning</p>
                  <Button onClick={() => setShowCreateRide(true)} disabled={!canCreateRide()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Ride
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rides.map(ride => (
                    <div key={ride.id} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {ride.fromLocation} → {ride.toLocation}
                          </h3>
                          <p className="text-gray-600">
                            {new Date(ride.departureTime).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={ride.status === 'active' ? 'default' : 'secondary'}>
                          {ride.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Seats:</span>
                          <p className="font-medium">{ride.totalSeats - ride.availableSeats}/{ride.totalSeats}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Price:</span>
                          <p className="font-medium">₹{ride.pricePerSeat}/seat</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Vehicle:</span>
                          <p className="font-medium">{ride.vehicleInfo.make} {ride.vehicleInfo.model}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Requests:</span>
                          <p className="font-medium">{ride.requests?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <RequestManagement
            requests={rides.flatMap(r => r.requests || [])}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            showProviderActions={true}
          />
        </TabsContent>

        <TabsContent value="wallet">
          <WalletManager
            wallet={wallet}
            transactions={transactions}
            userRole="provider"
            onDeposit={handleWalletDeposit}
            onWithdraw={handleWalletWithdraw}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
