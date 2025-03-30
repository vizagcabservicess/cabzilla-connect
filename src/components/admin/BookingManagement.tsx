
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Booking Management</h2>
      
      {loading ? (
        <div className="text-center p-8">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-md">
          <p className="text-gray-500">No bookings found</p>
          <Button className="mt-4" variant="outline">Refresh</Button>
        </div>
      ) : (
        <Table>
          <TableCaption>List of all bookings</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Booking ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Trip Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{booking.id}</TableCell>
                <TableCell>{booking.customerName}</TableCell>
                <TableCell>{booking.tripType}</TableCell>
                <TableCell>{booking.date}</TableCell>
                <TableCell>{booking.status}</TableCell>
                <TableCell>{booking.amount}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default BookingManagement;
