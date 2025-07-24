import { useState } from 'react';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { useToast } from "@/components/ui/use-toast";
import { Search, Phone, Mail, Ban, Eye, AlertTriangle, MoreHorizontal, ShieldCheck, ArrowRightLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function CustomerManagement() {
  const { toast } = useToast();
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

  // Handler for flagging/unflagging customers
  const toggleCustomerFlag = (customerId: number) => {
    setCustomers(customers.map(customer => {
      if (customer.id === customerId) {
        const newStatus = customer.status === 'active' ? 'flagged' : 'active';
        return { ...customer, status: newStatus };
      }
      return customer;
    }));
    
    toast({
      title: "Customer Status Updated",
      description: "The customer's status has been updated successfully",
    });
  };
  
  // Handler for issuing refund (placeholder)
  const issueRefund = (customerId: number) => {
    toast({
      title: "Refund Initiated",
      description: "A refund process has been started for this customer",
    });
  };

  // Calculate summary data
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const flaggedCustomers = customers.filter(c => c.status === 'flagged').length;
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  return (
    <div className="space-y-6 overflow-x-hidden px-2 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <h2 className="text-2xl font-bold">Customer Management</h2>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Flagged Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flaggedCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <ScrollArea className="h-[calc(70vh-20px)] w-full rounded-md border">
          <div className="w-full overflow-x-auto">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleCustomerFlag(customer.id)}>
                            {customer.status === 'flagged' ? (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Remove Flag
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Flag Customer
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => issueRefund(customer.id)}>
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Issue Refund
                          </DropdownMenuItem>
                          {customer.status !== 'blocked' && (
                            <DropdownMenuItem className="text-red-600">
                              <Ban className="h-3.5 w-3.5 mr-2" /> Block Customer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" className="h-3 bg-gray-100" />
        </ScrollArea>
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
