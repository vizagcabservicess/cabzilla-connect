import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { commissionAPI } from '@/services/api/commissionAPI';
import { CommissionPayment } from '@/types/api';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CommissionPaymentsListProps {
  vehicleId?: string;
  onPaymentUpdated?: () => void;
}

export function CommissionPaymentsList({ vehicleId: propVehicleId, onPaymentUpdated }: CommissionPaymentsListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');

  useEffect(() => {
    async function fetchVehicles() {
      // Fetch from the same endpoint as FleetVehicleAssignment
      try {
        const apiUrl = '/api/admin/fleet_vehicles.php/vehicles';
        const response = await fetch(apiUrl).then(res => res.json());
        const vehicles = response.vehicles || [];
        // Filter to only show true fleet vehicles (with vehicleNumber, name, and year)
        const filteredFleetVehicles = vehicles.filter((v) =>
          typeof v.vehicleNumber === 'string' && v.vehicleNumber.trim() !== '' &&
          typeof v.name === 'string' && v.name.trim() !== '' &&
          typeof v.year === 'number' && v.year > 1900
        );
        setVehicles(filteredFleetVehicles);
        if (filteredFleetVehicles.length > 0 && (!vehicleId || !filteredFleetVehicles.some(v => String(v.id) === vehicleId))) {
          setVehicleId(String(filteredFleetVehicles[0].id));
        }
      } catch (error) {
        setVehicles([]);
      }
    }
    fetchVehicles();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (propVehicleId) setVehicleId(String(propVehicleId));
  }, [propVehicleId]);

  useEffect(() => {
    if (vehicles.length > 0 && (!vehicleId || !vehicles.some(v => String(v.id) === vehicleId))) {
      setVehicleId(String(vehicles[0].id));
    }
  }, [vehicles, vehicleId]);

  const toCamelCasePayment = (payment: any): CommissionPayment => ({
    id: payment.id,
    bookingId: payment.booking_id,
    vehicleId: payment.vehicle_id,
    driverId: payment.driver_id,
    amount: Number(payment.total_amount),
    commissionAmount: Number(payment.commission_amount),
    commissionPercentage: Number(payment.commission_percentage),
    status: payment.status,
    paymentDate: payment.payment_date,
    notes: payment.notes,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
  });

  const loadPayments = async () => {
    console.log('loadPayments called with vehicleId:', vehicleId);
    setIsLoading(true);
    try {
      if (!vehicleId) {
        setPayments([]);
        setTotal(0);
        setIsLoading(false);
        return;
      }
      const params: any = {
        limit,
        offset: (page - 1) * limit
      };
      if (vehicleId) {
        params.vehicleId = Number(vehicleId);
      }
      if (status && status !== 'all') {
        params.status = status;
      }
      if (startDate) {
        params.startDate = format(startDate, 'yyyy-MM-dd');
      }
      if (endDate) {
        params.endDate = format(endDate, 'yyyy-MM-dd');
      }
      const response = await commissionAPI.getCommissionPayments(params);
      const mappedPayments = Array.isArray(response.payments)
        ? response.payments.map(toCamelCasePayment)
        : [];
      setPayments(mappedPayments);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Error loading commission payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [vehicleId, status, startDate, endDate, page]);

  const handleStatusChange = async (paymentId: string, newStatus: 'pending' | 'paid' | 'cancelled') => {
    try {
      await commissionAPI.updateCommissionPayment(paymentId, { status: newStatus });
      
      // Refresh the list
      loadPayments();
      
      if (onPaymentUpdated) {
        onPaymentUpdated();
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const filteredPayments = searchQuery 
    ? payments.filter(payment => 
        payment.bookingId?.toString().includes(searchQuery) || 
        payment.vehicleId?.toString().includes(searchQuery) ||
        payment.amount?.toString().includes(searchQuery))
    : payments;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="outline" className="bg-green-500 text-white border-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-500 text-amber-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / limit);

  const handleCreateCommissionPayment = async (paymentData) => {
    if (!vehicleId || vehicleId === '0' || !vehicles.some(v => String(v.id) === vehicleId)) {
      toast.error('Please select a valid vehicle before creating a commission payment.');
      return;
    }
    // ... existing code to create commission payment ...
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Commission Payments</CardTitle>
        <CardDescription>
          Manage and track commission payments for fleet vehicles
        </CardDescription>
        <div className="flex flex-wrap gap-2 mt-4">
          <div>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select Vehicle" />
              </SelectTrigger>
              <SelectContent>
                {(Array.isArray(vehicles) ? vehicles : []).map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.vehicle_number || v.vehicleNumber} - {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Input 
              placeholder="Search by booking ID or amount"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div>
            <Select value={status || 'all'} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd/MM/yyyy') : 'Start Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd/MM/yyyy') : 'End Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button variant="outline" onClick={() => {
            setStartDate(undefined);
            setEndDate(undefined);
            setStatus(undefined);
            setSearchQuery('');
          }}>
            Clear Filters
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">Loading...</TableCell>
                </TableRow>
              ) : (Array.isArray(filteredPayments) ? filteredPayments : []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">No commission payments found</TableCell>
                </TableRow>
              ) : (
                (Array.isArray(filteredPayments) ? filteredPayments : []).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.bookingId}</TableCell>
                    <TableCell>{payment.vehicleId}</TableCell>
                    <TableCell>₹{payment.amount?.toFixed(2)}</TableCell>
                    <TableCell>₹{payment.commissionAmount?.toFixed(2)}</TableCell>
                    <TableCell>{payment.commissionPercentage?.toFixed(1)}%</TableCell>
                    <TableCell>{getStatusBadge(payment.status || 'pending')}</TableCell>
                    <TableCell>
                      {payment.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleStatusChange(payment.id, 'paid')}>
                            Mark Paid
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(payment.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </div>
                      )}
                      {payment.status === 'paid' && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(payment.id, 'pending')}>
                          Mark Pending
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
