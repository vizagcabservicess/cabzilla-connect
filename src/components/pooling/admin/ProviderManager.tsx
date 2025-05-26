
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  Car, 
  Star,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Provider {
  id: number;
  name: string;
  phone: string;
  email: string;
  rating: number;
  totalRides: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  joinedDate: string;
  documents: {
    type: string;
    status: 'pending' | 'verified' | 'rejected';
    uploadedAt: string;
  }[];
}

const ProviderManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, [selectedStatus, searchTerm]);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await fetch(`/api/pooling/providers.php?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }
      
      const data = await response.json();
      setProviders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const handleVerifyDocument = async (providerId: number, documentType: string, action: 'approve' | 'reject') => {
    try {
      const status = action === 'approve' ? 'verified' : 'rejected';
      
      const response = await fetch('/api/pooling/documents.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider_id: providerId,
          type: documentType,
          status: status
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update document status');
      }

      toast.success(`Document ${action}d successfully`);
      fetchProviders(); // Refresh the data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update document');
      console.error('Error updating document:', err);
    }
  };

  const handleUpdateProviderStatus = async (providerId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/pooling/providers.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: providerId,
          verification_status: newStatus
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update provider status');
      }

      toast.success('Provider status updated successfully');
      fetchProviders(); // Refresh the data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update provider');
      console.error('Error updating provider:', err);
    }
  };

  const totalProviders = providers.length;
  const verifiedProviders = providers.filter(p => p.verificationStatus === 'verified').length;
  const pendingProviders = providers.filter(p => p.verificationStatus === 'pending').length;
  const averageRating = totalProviders > 0 
    ? (providers.reduce((acc, p) => acc + p.rating, 0) / totalProviders).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProviders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedProviders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingProviders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Provider Management</CardTitle>
              <CardDescription>Manage driver and vehicle owner registrations</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProviders}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Providers List */}
          <div className="space-y-4">
            {providers.map((provider) => (
              <Card key={provider.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">{provider.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {provider.phone}
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {provider.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{provider.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          <span>{provider.totalRides} rides</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          Joined: {new Date(provider.joinedDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Documents Status */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Document Verification:</h4>
                        <div className="flex gap-2 flex-wrap">
                          {provider.documents.map((doc, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                              {getStatusIcon(doc.status)}
                              <span className="text-sm">{doc.type}</span>
                              {doc.status === 'pending' && (
                                <div className="flex gap-1 ml-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleVerifyDocument(provider.id, doc.type, 'approve')}
                                    className="h-6 text-xs"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleVerifyDocument(provider.id, doc.type, 'reject')}
                                    className="h-6 text-xs"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(provider.verificationStatus)}
                      <div className="flex gap-2">
                        {provider.verificationStatus === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateProviderStatus(provider.id, 'verified')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateProviderStatus(provider.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Documents
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {providers.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No providers found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderManager;
