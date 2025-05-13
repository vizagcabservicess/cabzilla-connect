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
  const [attendanceSummary, setAttendanceSummary] = useState<{ daysPresent: number; daysAbsent: number; halfDays: number }>({ daysPresent: 0, daysAbsent: 0, halfDays: 0 });
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [attendanceForm, setAttendanceForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'present',
    hoursWorked: '',
    overtimeHours: '',
    notes: ''
  });
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  
  // Load driver summary data
  const fetchDriverData = async () => {
    try {
      setIsLoadingSummary(true);
      setSummaryError(null);
      // Fetch driver summary and attendance in parallel
      const [summaryResponse, attendance] = await Promise.all([
        payrollAPI.getDriverPaySummary(driverId),
        payrollAPI.fetchAttendanceRecords(driverId)
      ]);
      // Debug log
      console.log('Driver summary API response:', summaryResponse);
      // Extract attendanceSummary from summaryResponse
      let attSummary = { daysPresent: 0, daysAbsent: 0, halfDays: 0 };
      if (summaryResponse && typeof summaryResponse === 'object' && 'attendanceSummary' in summaryResponse) {
        const apiSummary = summaryResponse.attendanceSummary as Partial<{ daysPresent: number; daysAbsent: number; halfDays: number }>;
        attSummary = {
          daysPresent: typeof apiSummary.daysPresent === 'number' ? apiSummary.daysPresent : 0,
          daysAbsent: typeof apiSummary.daysAbsent === 'number' ? apiSummary.daysAbsent : 0,
          halfDays: typeof apiSummary.halfDays === 'number' ? apiSummary.halfDays : 0,
        };
      } else {
        setSummaryError('No attendance summary found in API response.');
      }
      setAttendanceSummary(attSummary);
      setDriverSummary(summaryResponse);
      setAttendanceRecords(attendance);
    } catch (error) {
      setSummaryError('Failed to fetch driver summary.');
      console.error("Error fetching driver data:", error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
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
  
  // Handler to mark attendance
  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMarkingAttendance(true);
    try {
      await payrollAPI.updateAttendanceRecord({
        driverId,
        date: attendanceForm.date,
        status: attendanceForm.status as 'present' | 'absent' | 'half-day' | 'paid-leave' | 'unpaid-leave' | 'holiday',
        hoursWorked: attendanceForm.hoursWorked ? Number(attendanceForm.hoursWorked) : undefined,
        overtimeHours: attendanceForm.overtimeHours ? Number(attendanceForm.overtimeHours) : undefined,
        notes: attendanceForm.notes
      } as any);
      setAttendanceForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'present',
        hoursWorked: '',
        overtimeHours: '',
        notes: ''
      });
      // Refresh both summary and attendance
      await fetchDriverData();
    } catch (err) {
      console.error('Error marking attendance:', err);
    } finally {
      setIsMarkingAttendance(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number | undefined | null) => {
    return `₹${(amount ?? 0).toLocaleString('en-IN')}`;
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
  
  // Defensive: fallback for previousPayments and attendanceRecords
  const previousPayments = Array.isArray(driverSummary?.previousPayments) ? driverSummary.previousPayments : [];
  const attendanceList = Array.isArray(attendanceRecords) ? attendanceRecords : [];
  
  return (
    <div className="space-y-6">
      {/* Driver Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {summaryError && (
            <div className="text-red-500 mb-2">{summaryError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Salary */}
            <div className="flex items-start space-x-4">
              <div className="p-2 rounded-md bg-blue-50">
                <IndianRupee className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Basic Salary</p>
                <p className="text-lg font-semibold">{formatCurrency(driverSummary?.basicSalary)}</p>
              </div>
            </div>
            
            {/* Pending Amount */}
            <div className="flex items-start space-x-4">
              <div className="p-2 rounded-md bg-amber-50">
                <IndianRupee className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(driverSummary?.pendingAmount)}</p>
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
                  {attendanceSummary.daysPresent} days present
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
                        <TableHead>Payslip</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previousPayments.map((payment, index) => {
                        // Only show payslip button if payment.id exists and is string/number
                        const hasId = payment && (typeof (payment as any).id === 'string' || typeof (payment as any).id === 'number');
                        return (
                          <TableRow key={index}>
                            <TableCell>{payment.month}</TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>{payment.paymentDate}</TableCell>
                            <TableCell>
                              {hasId ? (
                                <Button size="sm" variant="outline" onClick={async () => {
                                  try {
                                    const url = await payrollAPI.generatePayslip((payment as any).id, 'pdf');
                                    window.open(url, '_blank');
                                  } catch (err) {
                                    console.error('Error generating payslip:', err);
                                  }
                                }}>Generate Payslip</Button>
                              ) : (
                                <span className="text-xs text-gray-400">N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Attendance Summary */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Attendance Summary</h4>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">Present</div>
                      <div className="font-medium">{attendanceSummary.daysPresent} days</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">Absent</div>
                      <div className="font-medium">{attendanceSummary.daysAbsent} days</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">Half Days</div>
                      <div className="font-medium">{attendanceSummary.halfDays} days</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="attendance">
              <div className="space-y-4">
                <h4 className="text-sm font-medium mb-2">Attendance Records</h4>
                {/* Attendance Marking Form */}
                <form onSubmit={handleAttendanceSubmit} className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <div>
                    <label className="text-xs font-medium">Date</label>
                    <Input type="date" value={attendanceForm.date} onChange={e => setAttendanceForm(f => ({ ...f, date: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Status</label>
                    <select className="w-full border rounded px-2 py-1" value={attendanceForm.status} onChange={e => setAttendanceForm(f => ({ ...f, status: e.target.value }))} required>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="paid-leave">Paid Leave</option>
                      <option value="unpaid-leave">Unpaid Leave</option>
                      <option value="half-day">Half Day</option>
                      <option value="holiday">Holiday</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Hours Worked</label>
                    <Input type="number" min="0" value={attendanceForm.hoursWorked} onChange={e => setAttendanceForm(f => ({ ...f, hoursWorked: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Overtime Hours</label>
                    <Input type="number" min="0" value={attendanceForm.overtimeHours} onChange={e => setAttendanceForm(f => ({ ...f, overtimeHours: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Notes</label>
                    <Input type="text" value={attendanceForm.notes} onChange={e => setAttendanceForm(f => ({ ...f, notes: e.target.value }))} />
                    <Button type="submit" size="sm" className="mt-1" disabled={isMarkingAttendance}>{isMarkingAttendance ? 'Saving...' : 'Mark Attendance'}</Button>
                  </div>
                </form>
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
                      {attendanceList
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
