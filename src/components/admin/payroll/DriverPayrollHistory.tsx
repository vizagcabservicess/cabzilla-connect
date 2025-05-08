
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee, CalendarDays, Clock, Calendar, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { DriverPaySummary, AttendanceRecord } from '@/types/ledger';
import { payrollAPI } from '@/services/api/payrollAPI';

interface DriverPayrollHistoryProps {
  driverId: string | number;
  isLoading?: boolean;
  onRecordAdvance: (amount: number, date: string, notes?: string) => Promise<void>;
  onRefresh: () => void;
}

export function DriverPayrollHistory({ 
  driverId, 
  isLoading = false,
  onRecordAdvance,
  onRefresh
}: DriverPayrollHistoryProps) {
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceNotes, setAdvanceNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [driverSummary, setDriverSummary] = useState<DriverPaySummary | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);
  
  // Load driver summary data
  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setIsLoadingSummary(true);
        
        // Fetch driver summary and attendance in parallel
        const [summary, attendance] = await Promise.all([
          payrollAPI.getDriverPaySummary(driverId),
          payrollAPI.fetchAttendanceRecords(driverId)
        ]);
        
        setDriverSummary(summary);
        setAttendanceRecords(attendance);
      } catch (error) {
        console.error("Error fetching driver data:", error);
      } finally {
        setIsLoadingSummary(false);
      }
    };
    
    fetchDriverData();
  }, [driverId]);
  
  // Handle recording salary advance
  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!advanceAmount || parseFloat(advanceAmount) <= 0) return;
    
    try {
      setIsSaving(true);
      await onRecordAdvance(
        parseFloat(advanceAmount),
        format(new Date(), 'yyyy-MM-dd'),
        advanceNotes
      );
      
      // Reset form
      setAdvanceAmount('');
      setAdvanceNotes('');
      
      // Refresh data
      onRefresh();
    } catch (error) {
      console.error("Error recording advance:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };
  
  // Get color for attendance status badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'half-day':
        return 'bg-amber-100 text-amber-800';
      case 'paid-leave':
        return 'bg-blue-100 text-blue-800';
      case 'unpaid-leave':
        return 'bg-red-100 text-red-800';
      case 'holiday':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Loading state
  if (isLoading || isLoadingSummary) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!driverSummary) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-gray-500">
            No data available for this driver
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Driver Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>{driverSummary.driverName} - Payroll Summary</CardTitle>
          <CardDescription>Driver ID: {driverSummary.driverId}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Salary */}
            <div className="flex items-start space-x-4">
              <div className="p-2 rounded-md bg-blue-50">
                <IndianRupee className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Basic Salary</p>
                <p className="text-lg font-semibold">{formatCurrency(driverSummary.basicSalary)}</p>
              </div>
            </div>
            
            {/* Pending Amount */}
            <div className="flex items-start space-x-4">
              <div className="p-2 rounded-md bg-amber-50">
                <IndianRupee className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(driverSummary.pendingAmount)}</p>
              </div>
            </div>
            
            {/* Attendance */}
            <div className="flex items-start space-x-4">
              <div className="p-2 rounded-md bg-green-50">
                <CalendarDays className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Attendance</p>
                <p className="text-lg font-semibold">
                  {driverSummary.attendanceSummary.daysPresent} days present
                </p>
              </div>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="summary">Pay Summary</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="advance">Record Advance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary">
              <div className="space-y-4">
                {/* Payment History */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Payment History</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverSummary.previousPayments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>{payment.month}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{payment.paymentDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Attendance Summary */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Attendance Summary</h4>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">Present</div>
                      <div className="font-medium">{driverSummary.attendanceSummary.daysPresent} days</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">Absent</div>
                      <div className="font-medium">{driverSummary.attendanceSummary.daysAbsent} days</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">Paid Leave</div>
                      <div className="font-medium">{driverSummary.attendanceSummary.paidLeaves} days</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">Unpaid Leave</div>
                      <div className="font-medium">{driverSummary.attendanceSummary.unpaidLeaves} days</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="attendance">
              <div className="space-y-4">
                <h4 className="text-sm font-medium mb-2">Attendance Records</h4>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{format(parseISO(record.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(record.status)}`}>
                                {record.status.replace('-', ' ').replace(/^\w/, c => c.toUpperCase())}
                              </span>
                            </TableCell>
                            <TableCell>
                              {record.hoursWorked ? `${record.hoursWorked}h` : '-'}
                              {record.overtimeHours ? ` (+${record.overtimeHours}h OT)` : ''}
                            </TableCell>
                            <TableCell>{record.notes || '-'}</TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advance">
              <form onSubmit={handleAdvanceSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Advance Amount</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <IndianRupee className="h-4 w-4 text-gray-500" />
                      </div>
                      <Input 
                        type="number" 
                        placeholder="Enter amount" 
                        className="pl-10" 
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Calendar className="h-4 w-4 text-gray-500" />
                      </div>
                      <Input 
                        type="text" 
                        value={format(new Date(), 'dd MMM yyyy')}
                        className="pl-10" 
                        disabled
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea 
                    placeholder="Reason for advance payment"
                    value={advanceNotes}
                    onChange={(e) => setAdvanceNotes(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    <Plus className="h-4 w-4 mr-2" /> 
                    {isSaving ? 'Recording...' : 'Record Advance'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
