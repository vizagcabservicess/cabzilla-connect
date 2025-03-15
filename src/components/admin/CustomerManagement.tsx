
import { useState } from 'react';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { Search, Phone, Mail, Ban, Eye, AlertTriangle } from "lucide-react";

export function CustomerManagement() {
  // Sample customer data - in production, this would come from an API
  const [customers, setCustomers] = useState([
    { 
      id: 1, 
      name: 'Anil Kumar', 
      phone: '9876543210', 
      email: 'anil@example.com',
      totalRides: 45, 
      totalSpent: 38000, 
      rating: 5.0,
      status: 'active',
      lastRide: '2023-03-15'
    },
    { 
      id: 2, 
      name: 'Sunita Reddy', 
      phone: '8765432109', 
      email: 'sunita@example.com',
      totalRides: 20, 
      totalSpent: 16500, 
      rating: 4.2,
      status: 'active',
      lastRide: '2023-03-12'
    },
    { 
      id: 3, 
      name: 'Venkat Rao', 
      phone: '7654321098', 
      email: 'venkat@example.com',
      totalRides: 35, 
      totalSpent: 28000, 
      rating: 4.8,
      status: 'active',
      lastRide: '2023-03-14'
    },
    { 
      id: 4, 
      name: 'Priya Sharma', 
      phone: '6543210987', 
      email: 'priya@example.com',
      totalRides: 15, 
      totalSpent: 12000, 
      rating: 4.6,
      status: 'active',
      lastRide: '2023-03-10'
    },
    { 
      id: 5, 
      name: 'Karthik M', 
      phone: '9876543211', 
      email: 'karthik@example.com',
      totalRides: 5, 
      totalSpent: 4500, 
      rating: 3.8,
      status: 'flagged',
      lastRide: '2023-03-08'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  // Function to filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'flagged':
        return <Badge className="bg-yellow-100 text-yellow-800">Flagged</Badge>;
      case 'blocked':
        return <Badge className="bg-red-100 text-red-800">Blocked</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Customer Management</h2>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Signups (This Week)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableCaption>List of all registered customers</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Total Rides</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Ride</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {customer.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {customer.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{customer.totalRides}</TableCell>
                <TableCell>₹{customer.totalSpent.toLocaleString('en-IN')}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <span className="font-bold mr-1">{customer.rating}</span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(customer.status)}</TableCell>
                <TableCell>{new Date(customer.lastRide).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    {customer.status === 'flagged' ? (
                      <Button variant="outline" size="sm" className="text-red-600">
                        <Ban className="h-3 w-3 mr-1" /> Block
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Flag
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Star icon component for ratings
function Star(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
