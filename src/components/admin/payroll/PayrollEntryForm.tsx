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
import { CalendarIcon, PlusCircle, MinusCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PayrollEntry, SalaryComponent } from '@/types/ledger';
import { payrollAPI } from '@/services/api/payrollAPI';
import { fleetAPI } from '@/services/api/fleetAPI';

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
  const [drivers, setDrivers] = useState<{ id: string | number, name: string }[]>([]);
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  
  // Load salary components
  useEffect(() => {
    const loadComponents = async () => {
      const components = await payrollAPI.fetchSalaryComponents();
      setSalaryComponents(components);
    };
    
    if (open) {
      loadComponents();
    }
  }, [open]);
  
  // Load drivers from API when form opens
  useEffect(() => {
    if (open) {
      fleetAPI.getDrivers().then(setDrivers).catch(() => setDrivers([]));
    }
  }, [open]);
  
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
  
  // Utility to filter valid rows
  const filterValidRows = (arr: any[]) => (arr || []).filter(a => a && a.type && !isNaN(Number(a.amount)) && a.amount !== null && a.amount !== '' && a.amount !== undefined);

  const getTotalAllowances = () => {
    const allowances = filterValidRows(form.watch('allowances'));
    return allowances.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  };

  const getTotalDeductions = () => {
    const deductions = filterValidRows(form.watch('deductions'));
    return deductions.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  };

  const getTotalAdvances = () => {
    const advances = (form.watch('advances') || []).filter(a => !isNaN(Number(a.amount)) && a.amount !== null && a.amount !== '' && a.amount !== undefined);
    return advances.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  };

  const getNetSalary = () => {
    const basicSalary = Number(form.watch('basicSalary')) || 0;
    const totalAllowances = getTotalAllowances();
    const totalDeductions = getTotalDeductions();
    const totalAdvances = getTotalAdvances();
    return basicSalary + totalAllowances - totalDeductions - totalAdvances || 0;
  };
  
  // Add/remove allowances, deductions, advances
  const addAllowance = () => {
    const currentAllowances = form.getValues('allowances');
    form.setValue('allowances', [...currentAllowances, { type: '', amount: 0 }]);
  };
  
  const removeAllowance = (index: number) => {
    const currentAllowances = form.getValues('allowances');
    form.setValue('allowances', currentAllowances.filter((_, i) => i !== index));
  };
  
  const addDeduction = () => {
    const currentDeductions = form.getValues('deductions');
    form.setValue('deductions', [...currentDeductions, { type: '', amount: 0 }]);
  };
  
  const removeDeduction = (index: number) => {
    const currentDeductions = form.getValues('deductions');
    form.setValue('deductions', currentDeductions.filter((_, i) => i !== index));
  };
  
  const addAdvance = () => {
    const currentAdvances = form.getValues('advances');
    form.setValue('advances', [...currentAdvances, { date: new Date(), amount: 0 }]);
  };
  
  const removeAdvance = (index: number) => {
    const currentAdvances = form.getValues('advances');
    form.setValue('advances', currentAdvances.filter((_, i) => i !== index));
  };
  
  // Validation: block submission if any allowance/deduction has empty type or invalid amount
  const hasInvalidRows = () => {
    const allowances = form.watch('allowances') || [];
    const deductions = form.watch('deductions') || [];
    return (
      allowances.some(a => !a.type || isNaN(Number(a.amount))) ||
      deductions.some(d => !d.type || isNaN(Number(d.amount)))
    );
  };
  
  // Form submission
  const onSubmit = async (values: PayrollFormValues) => {
    try {
      setIsLoading(true);
      // Filter out invalid allowances/deductions before sending to API
      const filteredAllowances = filterValidRows(values.allowances);
      const filteredDeductions = filterValidRows(values.deductions);
      // Format the data for API
      const payrollData = {
        driverId: values.driverId,
        payPeriod: {
          startDate: format(values.payPeriodStart, 'yyyy-MM-dd'),
          endDate: format(values.payPeriodEnd, 'yyyy-MM-dd'),
        },
        basicSalary: values.basicSalary,
        allowances: filteredAllowances,
        deductions: filteredDeductions,
        advances: (values.advances || []).filter(a => !isNaN(Number(a.amount)) && a.amount !== null && a.amount !== '' && a.amount !== undefined).map(a => ({
          ...a,
          date: format(a.date, 'yyyy-MM-dd')
        })),
        daysWorked: values.daysWorked,
        daysLeave: values.daysLeave,
        paymentStatus: values.paymentStatus,
        paymentDate: values.paymentDate ? format(values.paymentDate, 'yyyy-MM-dd') : undefined,
        // Calculate description based on period
        description: `Salary for ${format(values.payPeriodStart, 'MMM yyyy')} - ${drivers.find(d => d.id.toString() === values.driverId)?.name || 'Driver'}`,
        // Set default type and category
        type: 'expense' as const,
        category: 'Salary',
        // Calculate net amount
        amount: getNetSalary(),
        netSalary: getNetSalary(),
      };
      
      if (payrollToEdit) {
        // Update existing payroll
        await payrollAPI.updatePayrollEntry(payrollToEdit.id, payrollData);
      } else {
        // Create new payroll entry
        await payrollAPI.createPayrollEntry(payrollData as any);
      }
      
      onOpenChange(false);
      onPayrollAdded();
    } catch (error) {
      console.error("Error saving payroll:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payrollToEdit ? 'Edit Payroll Entry' : 'Add New Payroll Entry'}</DialogTitle>
          <DialogDescription>
            {payrollToEdit 
              ? 'Update this payroll record details' 
              : 'Create a new payroll entry for a driver'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Driver Selection */}
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      disabled={!!selectedDriverId || isLoading}
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
              
              {/* Basic Salary */}
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
                        onChange={e => field.onChange(parseFloat(e.target.value))} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Pay Period Start */}
              <FormField
                control={form.control}
                name="payPeriodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Period Start</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
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
                          disabled={isLoading}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Pay Period End */}
              <FormField
                control={form.control}
                name="payPeriodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Period End</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
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
                          disabled={isLoading}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Days Worked */}
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
                        onChange={e => field.onChange(parseInt(e.target.value))}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Days Leave */}
              <FormField
                control={form.control}
                name="daysLeave"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days Leave</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value))}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            {/* Allowances */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Allowances</h3>
                <Button type="button" variant="outline" size="sm" onClick={addAllowance} disabled={isLoading}>
                  <PlusCircle className="h-4 w-4 mr-1" /> Add Allowance
                </Button>
              </div>
              
              {form.watch('allowances').map((_, index) => (
                <div key={index} className="flex gap-2 items-center mb-2">
                  <FormField
                    control={form.control}
                    name={`allowances.${index}.type`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {salaryComponents
                              .filter(c => c.type === 'allowance' || c.type === 'bonus')
                              .map((component) => (
                                <SelectItem key={component.id} value={component.id.toString()}>
                                  {component.name}
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
                    name={`allowances.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Amount" 
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeAllowance(index)}
                    disabled={isLoading}
                  >
                    <MinusCircle className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              
              <div className="text-right text-sm font-medium mt-1">
                Total Allowances: ₹{getTotalAllowances().toLocaleString('en-IN')}
              </div>
            </div>
            
            <Separator />
            
            {/* Deductions */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Deductions</h3>
                <Button type="button" variant="outline" size="sm" onClick={addDeduction} disabled={isLoading}>
                  <PlusCircle className="h-4 w-4 mr-1" /> Add Deduction
                </Button>
              </div>
              
              {form.watch('deductions').map((_, index) => (
                <div key={index} className="flex gap-2 items-center mb-2">
                  <FormField
                    control={form.control}
                    name={`deductions.${index}.type`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {salaryComponents
                              .filter(c => c.type === 'deduction')
                              .map((component) => (
                                <SelectItem key={component.id} value={component.id.toString()}>
                                  {component.name}
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
                    name={`deductions.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Amount" 
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeDeduction(index)}
                    disabled={isLoading}
                  >
                    <MinusCircle className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              
              <div className="text-right text-sm font-medium mt-1">
                Total Deductions: ₹{getTotalDeductions().toLocaleString('en-IN')}
              </div>
            </div>
            
            <Separator />
            
            {/* Advances */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Salary Advances</h3>
                <Button type="button" variant="outline" size="sm" onClick={addAdvance} disabled={isLoading}>
                  <PlusCircle className="h-4 w-4 mr-1" /> Add Advance
                </Button>
              </div>
              
              {form.watch('advances').map((_, index) => (
                <div key={index} className="flex gap-2 items-center mb-2">
                  <FormField
                    control={form.control}
                    name={`advances.${index}.date`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isLoading}
                              >
                                {field.value ? (
                                  format(field.value, "MMM dd, yyyy")
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
                              disabled={isLoading}
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
                    name={`advances.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Amount" 
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeAdvance(index)}
                    disabled={isLoading}
                  >
                    <MinusCircle className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              
              <div className="text-right text-sm font-medium mt-1">
                Total Advances: ₹{getTotalAdvances().toLocaleString('en-IN')}
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Status */}
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partially Paid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Payment Date - Only shown if status is 'paid' */}
              {form.watch('paymentStatus') === 'paid' && (
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={isLoading}
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
                            disabled={isLoading}
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
            
            {/* Net salary calculation */}
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="font-medium text-right">
                Net Salary: <span className="text-lg">₹{getNetSalary().toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || hasInvalidRows()}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {payrollToEdit ? 'Update Payroll' : 'Create Payroll Entry'}
              </Button>
            </div>
            {hasInvalidRows() && (
              <div className="text-red-500 text-sm text-right mt-2">
                Please select a type and enter a valid amount for all allowances and deductions.
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
