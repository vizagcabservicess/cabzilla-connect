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
  AlertTriangle,
  LogOut
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
import { useNavigate } from 'react-router-dom';

function safeToFixed(value, digits = 2, fallback = '0.00') {
  const num = Number(value);
  return isNaN(num) ? fallback : num.toFixed(digits);
}

export function ProviderDashboard() {
  const { user, walletData, canCreateRide, setWalletData, logout } = usePoolingAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateRide, setShowCreateRide] = useState(false);
  const [rides, setRides] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [providerRequests, setProviderRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_, forceUpdate] = useState(0);

  useEffect(() => {
    if (user) {
      const providerId = (user as any).providerId || user.id;
      setLoading(true);
      poolingAPI.rides.getByProvider(providerId)
        .then(data => {
          console.log('Fetched rides (raw):', data);
          function toCamelCaseRide(r: any) {
            return {
              ...r,
              id: r.id,
              type: r.type,
              providerId: r.provider_id,
              providerName: r.provider_name,
              providerPhone: r.provider_phone,
              providerRating: r.provider_rating,
              fromLocation: r.from_location,
              toLocation: r.to_location,
              departureTime: r.departure_time,
              arrivalTime: r.arrival_time,
              totalSeats: r.total_seats,
              availableSeats: r.available_seats,
              pricePerSeat: r.price_per_seat,
              vehicleInfo: r.vehicleInfo || {
                make: r.make,
                model: r.model,
                color: r.color,
                plateNumber: r.plate_number,
      },
              route: r.route || r.route_stops || [],
              amenities: r.amenities,
              rules: r.rules,
              status: r.status,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
              requests: r.requests || [],
              ratings: r.ratings || [],
            };
          }
          let ridesArr: any[] = [];
          if (Array.isArray(data)) {
            ridesArr = data;
          } else if (data && Array.isArray((data as any).data)) {
            ridesArr = (data as any).data;
          }
          const mappedRides = ridesArr.map(toCamelCaseRide);
          console.log('Mapped rides:', mappedRides);
          setRides(mappedRides);
        })
        .finally(() => setLoading(false));
      poolingAPI.wallet.getTransactions(providerId, 'provider')
        .then(data => setTransactions(Array.isArray(data) ? data : []));
      poolingAPI.wallet.getBalance(providerId, 'provider')
        .then(data => setWalletData(data));
      // Fetch all requests for this provider
      poolingAPI.requests.getByProvider(providerId)
        .then(async (data) => {
          console.log('Fetched requests (raw):', data);
          let requestsArr: any[] = [];
          if (Array.isArray(data)) {
            requestsArr = data;
          } else if (data && Array.isArray((data as any).data)) {
            requestsArr = (data as any).data;
          }
          // Map snake_case to camelCase for all requests
          function toCamelCaseRequest(r: any) {
            return {
              ...r,
              id: r.id,
              rideId: r.ride_id,
              guestId: r.guest_id,
              seatsRequested: r.seats_requested,
              requestMessage: r.request_message,
              responseMessage: r.response_message,
              status: r.status,
              requestedAt: r.requested_at,
              respondedAt: r.responded_at,
            };
          }
          let requests = requestsArr.map(toCamelCaseRequest);
          console.log('Mapped requests:', requests);
          // Fetch guest info for each request
          const uniqueGuestIds = [...new Set(requests.map(r => Number(r.guestId)).filter(id => !isNaN(id)))];
          const guestInfoMap: Record<number, any> = {};
          for (const guestId of uniqueGuestIds) {
            if (!guestId) continue;
            try {
              const guest = await poolingAPI.auth.getUserById(guestId);
              guestInfoMap[guestId] = guest;
            } catch (e) {
              guestInfoMap[guestId] = { name: 'Unknown', email: '', phone: '' };
            }
          }
          // Merge guest info into requests
          requests = requests.map(r => ({
            ...r,
            guestName: r.guestName || guestInfoMap[Number(r.guestId)]?.name || '',
            guestEmail: r.guestEmail || guestInfoMap[Number(r.guestId)]?.email || '',
            guestPhone: r.guestPhone || guestInfoMap[Number(r.guestId)]?.phone || '',
          }));
          setProviderRequests(requests);
        });
    }
  }, [user]);

  const handleCreateRide = async (rideData) => {
    try {
      await poolingAPI.rides.create({ ...rideData, providerId: user?.id || user?.id });
      toast.success('Ride created successfully!');
      setShowCreateRide(false);
      // Refresh rides
      if (user) {
        const updatedRides = await poolingAPI.rides.getByProvider(user.id);
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

  console.log('walletData in dashboard:', walletData);

  const handleWalletDeposit = async (amount) => {
    if (!user) return;
    // Call backend to credit wallet
    const res = await fetch('/api/pooling/wallet/add-funds.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, amount })
    });
    if (!res.ok) {
      toast.error('Failed to add money to wallet');
      return;
    }
    // Refresh wallet balance
    const updatedWallet = await poolingAPI.wallet.getBalance(user.id);
    if (typeof setWalletData === 'function') setWalletData(updatedWallet);
    forceUpdate(n => n + 1); // force re-render
    toast.success('Money added to wallet!');
  };

  const handleWalletWithdraw = async (amount) => {
    try {
      if (user) {
        await poolingAPI.wallet.withdraw(user.id, amount);
        // Refresh wallet balance
        const updatedWallet = await poolingAPI.wallet.getBalance(user.id);
        if (typeof setWalletData === 'function') setWalletData(updatedWallet);
        // Refresh transactions
        const updatedTransactions = await poolingAPI.wallet.getTransactions(user.id);
        setTransactions(updatedTransactions);
        forceUpdate(n => n + 1); // force re-render
        toast.success('Withdrawal successful!');
      }
    } catch (error) {
      toast.error('Failed to process withdrawal');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/pooling/login');
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
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        <Button 
          onClick={() => setShowCreateRide(true)}
          disabled={!canCreateRide()}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Ride</span>
        </Button>
        </div>
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
                  Add ₹{500 - (Number(walletData?.balance) || 0)} to your wallet to create rides
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
                <p className="text-2xl font-bold">₹{walletData?.balance || 0}</p>
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
                <p className="text-2xl font-bold">{safeToFixed(user?.rating, 1, '0.0')}</p>
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
            requests={providerRequests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            showProviderActions={true}
          />
        </TabsContent>

        <TabsContent value="wallet">
          <WalletManager
            wallet={walletData}
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
