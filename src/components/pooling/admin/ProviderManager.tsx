import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Download
} from 'lucide-react';

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

  // Mock data
  const [providers] = useState<Provider[]>([
    {
      id: 1,
      name: 'Rajesh Kumar',
      phone: '+91 9966363662',
      email: 'rajesh@example.com',
      rating: 4.8,
      totalRides: 156,
      verificationStatus: 'verified',
      joinedDate: '2024-01-15',
      documents: [
        { type: 'Driving License', status: 'verified', uploadedAt: '2024-01-16' },
        { type: 'Vehicle Registration', status: 'verified', uploadedAt: '2024-01-16' },
        { type: 'Insurance', status: 'verified', uploadedAt: '2024-01-16' }
      ]
    },
    {
      id: 2,
      name: 'Suresh Reddy',
      phone: '+91 9876543211',
      email: 'suresh@example.com',
      rating: 4.5,
      totalRides: 89,
      verificationStatus: 'pending',
      joinedDate: '2024-02-20',
      documents: [
        { type: 'Driving License', status: 'pending', uploadedAt: '2024-02-21' },
        { type: 'Vehicle Registration', status: 'verified', uploadedAt: '2024-02-21' },
        { type: 'Insurance', status: 'pending', uploadedAt: '2024-02-21' }
      ]
    },
    {
      id: 3,
      name: 'Ramesh Varma',
      phone: '+91 9876543212',
      email: 'ramesh@example.com',
      rating: 3.9,
      totalRides: 45,
      verificationStatus: 'rejected',
      joinedDate: '2024-03-10',
      documents: [
        { type: 'Driving License', status: 'rejected', uploadedAt: '2024-03-11' },
        { type: 'Vehicle Registration', status: 'verified', uploadedAt: '2024-03-11' },
        { type: 'Insurance', status: 'pending', uploadedAt: '2024-03-11' }
      ]
    }
  ]);

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.phone.includes(searchTerm) ||
                         provider.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || provider.verificationStatus === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

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

  const handleVerifyDocument = (providerId: number, documentType: string, action: 'approve' | 'reject') => {
    console.log(`${action} document ${documentType} for provider ${providerId}`);
    // Implementation would update the document status
  };

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
            <div className="text-2xl font-bold">{providers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.filter(p => p.verificationStatus === 'verified').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.filter(p => p.verificationStatus === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(providers.reduce((acc, p) => acc + p.rating, 0) / providers.length).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Management</CardTitle>
          <CardDescription>Manage driver and vehicle owner registrations</CardDescription>
        </CardHeader>
        <CardContent>
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
            {filteredProviders.map((provider) => (
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

          {filteredProviders.length === 0 && (
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
