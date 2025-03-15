
import { useState } from 'react';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Phone, Mail, CheckCircle, XCircle, 
  Plus, Edit, AlertTriangle 
} from "lucide-react";

export function DriverManagement() {
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
      location: 'Hyderabad Central'
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
      location: 'Gachibowli'
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
      location: 'Offline'
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
      location: 'Kukatpally'
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
      location: 'Ameerpet'
    }
  ]);

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Driver Management</h2>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add New Driver
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableCaption>List of all registered drivers</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Driver Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Rides</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
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
                    <MapPin className="h-3 w-3" /> {driver.location}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <MapPin className="h-3 w-3 mr-1" /> Track
                    </Button>
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
