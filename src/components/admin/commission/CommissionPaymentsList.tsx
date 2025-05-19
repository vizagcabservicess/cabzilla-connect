
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
import { CommissionPayment } from '@/types/cab';
import { Input } from '@/components/ui/input';

interface CommissionPaymentsListProps {
  vehicleId?: string;
  onPaymentUpdated?: () => void;
}

export function CommissionPaymentsList({ vehicleId, onPaymentUpdated }: CommissionPaymentsListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        limit,
        offset: (page - 1) * limit
      };
      
      if (vehicleId) {
        params.vehicleId = vehicleId;
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
      setPayments(response.payments);
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
        return <Badge variant="success" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-500 text-amber-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Commission Payments</CardTitle>
        <CardDescription>
          Manage and track commission payments for fleet vehicles
        </CardDescription>
        <div className="flex flex-wrap gap-2 mt-4">
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
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">No commission payments found</TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
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
