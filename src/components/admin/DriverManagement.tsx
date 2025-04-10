
import { useState } from 'react';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { 
  MapPin, Phone, Mail, CheckCircle, XCircle, 
  Plus, Edit, AlertTriangle, Search, Star, 
  MoreHorizontal, ToggleLeft, Car, Settings
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DriverManagement() {
  const { toast } = useToast();
  // Sample driver data - in production, this would come from an API
  const [drivers, setDrivers] = useState([
    { 
      id: 1, 
      name: 'Rajesh Kumar', 
      phone: '9876543210', 
      email: 'rajesh@example.com',
      licenseNo: 'DL-1234567890',
      status: 'available', 
      totalRides: 352, 
      earnings: 120000, 
      rating: 4.8,
      location: 'Hyderabad Central',
      vehicle: 'Sedan - AP 31 XX 1234'
    },
    { 
      id: 2, 
      name: 'Pavan Reddy', 
      phone: '8765432109', 
      email: 'pavan@example.com',
      licenseNo: 'DL-0987654321',
      status: 'busy', 
      totalRides: 215, 
      earnings: 85500, 
      rating: 4.6,
      location: 'Gachibowli',
      vehicle: 'SUV - AP 32 XX 5678'
    },
    { 
      id: 3, 
      name: 'Suresh Verma', 
      phone: '7654321098', 
      email: 'suresh@example.com',
      licenseNo: 'DL-5678901234',
      status: 'offline', 
      totalRides: 180, 
      earnings: 72000, 
      rating: 4.5,
      location: 'Offline',
      vehicle: 'Sedan - AP 33 XX 9012'
    },
    { 
      id: 4, 
      name: 'Venkatesh S', 
      phone: '9876543211', 
      email: 'venkat@example.com',
      licenseNo: 'DL-4321098765',
      status: 'available', 
      totalRides: 298, 
      earnings: 110000, 
      rating: 4.7,
      location: 'Kukatpally',
      vehicle: 'Hatchback - AP 34 XX 3456'
    },
    { 
      id: 5, 
      name: 'Ramesh Babu', 
      phone: '8765432108', 
      email: 'ramesh@example.com',
      licenseNo: 'DL-2345678901',
      status: 'busy', 
      totalRides: 175, 
      earnings: 65000, 
      rating: 4.4,
      location: 'Ameerpet',
      vehicle: 'Tempo - AP 35 XX 7890'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  // Function to filter drivers based on search term
  const filteredDrivers = drivers.filter(driver => 
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone.includes(searchTerm) ||
    driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Function to get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'busy':
        return <Badge className="bg-red-100 text-red-800">Busy</Badge>;
      case 'offline':
        return <Badge className="bg-gray-100 text-gray-800">Offline</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Handler for toggling driver status (would connect to an API in production)
  const toggleDriverStatus = (driverId: number) => {
    toast({
      title: "Status Updated",
      description: "Driver status has been updated successfully",
    });
    
    setDrivers(drivers.map(driver => {
      if (driver.id === driverId) {
        const newStatus = driver.status === 'available' ? 'offline' : 'available';
        return { ...driver, status: newStatus };
      }
      return driver;
    }));
  };

  // Total driver statistics
  const totalDrivers = drivers.length;
  const availableDrivers = drivers.filter(d => d.status === 'available').length;
  const busyDrivers = drivers.filter(d => d.status === 'busy').length;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Driver Management</h2>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Driver
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Busy Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{busyDrivers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>List of all registered drivers</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rides</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {driver.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {driver.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(driver.status)}</TableCell>
                  <TableCell>{driver.totalRides}</TableCell>
                  <TableCell>₹{driver.earnings.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="font-bold mr-1">{driver.rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" /> {driver.vehicle}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {driver.location}
                    </div>
                  </TableCell>
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
                          <Edit className="h-3.5 w-3.5 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MapPin className="h-3.5 w-3.5 mr-2" /> Track Location
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleDriverStatus(driver.id)}>
                          <ToggleLeft className="h-3.5 w-3.5 mr-2" /> 
                          {driver.status === 'available' ? 'Set as Offline' : 'Set as Available'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-3.5 w-3.5 mr-2" /> Manage Vehicle
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
