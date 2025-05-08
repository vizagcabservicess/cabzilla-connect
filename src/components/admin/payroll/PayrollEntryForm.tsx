
import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PayrollEntry, SalaryComponent } from '@/types/ledger';
import { payrollAPI } from '@/services/api/payrollAPI';

interface PayrollEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayrollAdded: () => void;
  payrollToEdit?: PayrollEntry;
  selectedDriverId?: string | number;
}

interface PayrollFormValues {
  driverId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  basicSalary: number;
  daysWorked: number;
  daysLeave: number;
  allowances: {
    type: string;
    amount: number;
  }[];
  deductions: {
    type: string;
    amount: number;
  }[];
  advances: {
    date: Date;
    amount: number;
    notes?: string;
  }[];
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentDate?: Date;
}

export function PayrollEntryForm({ 
  open, 
  onOpenChange, 
  onPayrollAdded,
  payrollToEdit,
  selectedDriverId
}: PayrollEntryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [drivers, setDrivers] = useState<{ id: string | number, name: string }[]>([
    { id: 'DRV001', name: 'Rajesh Kumar' },
    { id: 'DRV002', name: 'Suresh Singh' },
    { id: 'DRV003', name: 'Mahesh Reddy' },
  ]);
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  
  // Load salary components
  useEffect(() => {
    const loadComponents = async () => {
      const components = await payrollAPI.fetchSalaryComponents();
      setSalaryComponents(components);
    };
    
    loadComponents();
  }, []);
  
  // Setup form
  const form = useForm<PayrollFormValues>({
    defaultValues: {
      driverId: selectedDriverId?.toString() || '',
      payPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      payPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      basicSalary: 15000,
      daysWorked: 22,
      daysLeave: 8,
      allowances: [
        { type: 'batha', amount: 4000 },
        { type: 'fuel', amount: 3000 },
      ],
      deductions: [
        { type: 'pf', amount: 1800 },
      ],
      advances: [],
      paymentStatus: 'pending',
    }
  });
  
  // Populate form when editing
  useEffect(() => {
    if (payrollToEdit) {
      form.reset({
        driverId: payrollToEdit.driverId.toString(),
        payPeriodStart: parseISO(payrollToEdit.payPeriod.startDate),
        payPeriodEnd: parseISO(payrollToEdit.payPeriod.endDate),
        basicSalary: payrollToEdit.basicSalary,
        daysWorked: payrollToEdit.daysWorked,
        daysLeave: payrollToEdit.daysLeave,
        allowances: payrollToEdit.allowances,
        deductions: payrollToEdit.deductions,
        advances: payrollToEdit.advances.map(a => ({
          ...a,
          date: parseISO(a.date)
        })),
        paymentStatus: payrollToEdit.paymentStatus,
        paymentDate: payrollToEdit.paymentDate ? parseISO(payrollToEdit.paymentDate) : undefined,
      });
    } else if (selectedDriverId) {
      form.setValue('driverId', selectedDriverId.toString());
    }
  }, [payrollToEdit, form, selectedDriverId]);
  
  // Calculate totals
  const getTotalAllowances = () => {
    return form.watch('allowances').reduce((sum, item) => sum + item.amount, 0);
  };
  
  const getTotalDeductions = () => {
    return form.watch('deductions').reduce((sum, item) => sum + item.amount, 0);
  };
  
  const getTotalAdvances = () => {
    return form.watch('advances').reduce((sum, item) => sum + item.amount, 0);
  };
  
  const getNetSalary = () => {
    const basicSalary = form.watch('basicSalary') || 0;
    return basicSalary + getTotalAllowances() - getTotalDeductions() - getTotalAdvances();
  };
  
  // Handle form submission
  const onSubmit = async (data: PayrollFormValues) => {
    try {
      setIsLoading(true);
      
      const payrollData = {
        driverId: data.driverId,
        date: format(data.payPeriodEnd, 'yyyy-MM-dd'),
        description: `Salary for ${format(data.payPeriodStart, 'MMM yyyy')} - ${
          drivers.find(d => d.id.toString() === data.driverId)?.name || 'Driver'
        }`,
        amount: getNetSalary(),
        type: 'expense' as const,
        category: 'Salary',
        paymentMethod: 'Bank Transfer',
        status: data.paymentStatus === 'paid' ? 'reconciled' : 'pending',
        payPeriod: {
          startDate: format(data.payPeriodStart, 'yyyy-MM-dd'),
          endDate: format(data.payPeriodEnd, 'yyyy-MM-dd'),
        },
        basicSalary: data.basicSalary,
        allowances: data.allowances,
        deductions: data.deductions,
        advances: data.advances.map(a => ({
          ...a, 
          date: format(a.date, 'yyyy-MM-dd')
        })),
        daysWorked: data.daysWorked,
        daysLeave: data.daysLeave,
        netSalary: getNetSalary(),
        paymentStatus: data.paymentStatus,
        paymentDate: data.paymentDate ? format(data.paymentDate, 'yyyy-MM-dd') : undefined,
        payslipIssued: data.paymentStatus === 'paid',
      };
      
      if (payrollToEdit) {
        await payrollAPI.updatePayrollEntry(payrollToEdit.id, payrollData);
      } else {
        await payrollAPI.createPayrollEntry(payrollData);
      }
      
      onPayrollAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving payroll entry:", error);
      toast.error("Failed to save payroll entry");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {payrollToEdit ? "Edit Payroll Entry" : "Create Payroll Entry"}
          </DialogTitle>
          <DialogDescription>
            {payrollToEdit 
              ? "Edit salary details and payment information" 
              : "Enter salary details for the selected pay period"
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading || !!selectedDriverId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id.toString()}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="basicSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Basic Salary</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        placeholder="Basic salary amount" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Pay Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payPeriodStart"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Pay Period Start</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("2020-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="payPeriodEnd"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Pay Period End</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < form.watch('payPeriodStart')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Attendance Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="daysWorked"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days Worked</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        placeholder="Number of days worked" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="daysLeave"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days on Leave</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        placeholder="Number of leave days" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Summary and Payment */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium mb-2">Salary Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Basic Salary:</span>
                  <span>₹{form.watch('basicSalary')?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Allowances:</span>
                  <span>+ ₹{getTotalAllowances().toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deductions:</span>
                  <span>- ₹{getTotalDeductions().toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Advances:</span>
                  <span>- ₹{getTotalAdvances().toLocaleString('en-IN')}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Net Salary:</span>
                  <span>₹{getNetSalary().toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
            
            {/* Payment Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.watch('paymentStatus') === 'paid' && (
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : payrollToEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
