import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, PlusCircle, TrashIcon } from "lucide-react";
import { format } from 'date-fns';

// Fix the imports for components and type issues

interface PayrollEntryFormProps {
  onSubmit: (data: any) => void;
  initialData?: any;
  isLoading?: boolean;
}

// Define our allowance and deduction interfaces with required fields
interface Allowance {
  type: string;
  amount: number;
  includeInPayroll: boolean;
}

interface Deduction {
  type: string;
  amount: number;
  includeInPayroll: boolean;
}

// Form schema for payroll entry
const formSchema = z.object({
  // ... keep existing schema
});

export function PayrollEntryForm({ onSubmit, initialData, isLoading = false }: PayrollEntryFormProps) {
  // Form state
  const [newAllowances, setNewAllowances] = useState<Allowance[]>([]);
  const [newAllowanceType, setNewAllowanceType] = useState("");
  const [newAllowanceAmount, setNewAllowanceAmount] = useState("");
  
  const [newDeductions, setNewDeductions] = useState<Deduction[]>([]);
  const [newDeductionType, setNewDeductionType] = useState("");
  const [newDeductionAmount, setNewDeductionAmount] = useState("");
  
  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      employeeId: "",
      payPeriod: "monthly",
      payDate: new Date(),
      basicSalary: 0,
      hoursWorked: 0,
      hourlyRate: 0,
      // ... other default values
    },
  });
  
  // Calculate hours worked
  const calculateHoursWorked = (startDate: Date, endDate: Date) => {
    // Calculate days between dates
    const days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
    return days * 8; // Assuming 8-hour work day
  };
  
  // Handle adding a new allowance
  const handleAddAllowance = () => {
    if (!newAllowanceType || !newAllowanceAmount || parseFloat(newAllowanceAmount) <= 0) return;
    
    const newAllowance: Allowance = {
      type: newAllowanceType,
      amount: parseFloat(newAllowanceAmount),
      includeInPayroll: true
    };
    
    setNewAllowances([...newAllowances, newAllowance]);
    setNewAllowanceType("");
    setNewAllowanceAmount("");
  };
  
  // Handle removing an allowance
  const handleRemoveAllowance = (index: number) => {
    const updatedAllowances = [...newAllowances];
    updatedAllowances.splice(index, 1);
    setNewAllowances(updatedAllowances);
  };
  
  // Handle adding a new deduction
  const handleAddDeduction = () => {
    if (!newDeductionType || !newDeductionAmount || parseFloat(newDeductionAmount) <= 0) return;
    
    const newDeduction: Deduction = {
      type: newDeductionType,
      amount: parseFloat(newDeductionAmount),
      includeInPayroll: true
    };
    
    setNewDeductions([...newDeductions, newDeduction]);
    setNewDeductionType("");
    setNewDeductionAmount("");
  };
  
  // Handle removing a deduction
  const handleRemoveDeduction = (index: number) => {
    const updatedDeductions = [...newDeductions];
    updatedDeductions.splice(index, 1);
    setNewDeductions(updatedDeductions);
  };
  
  // Update hourly wage when basic salary changes
  const updateHourlyWage = () => {
    const basicSalary = parseFloat(form.getValues("basicSalary") as string);
    const payPeriod = form.getValues("payPeriod");
    
    if (isNaN(basicSalary) || basicSalary <= 0) return;
    
    let hourlyWage = 0;
    
    if (payPeriod === "monthly") {
      // Assuming 22 working days per month, 8 hours per day
      hourlyWage = basicSalary / (22 * 8);
    } else if (payPeriod === "weekly") {
      // Assuming 5 working days per week, 8 hours per day
      hourlyWage = basicSalary / (5 * 8);
    } else if (payPeriod === "daily") {
      // Assuming 8 hour work day
      hourlyWage = basicSalary / 8;
    }
    
    form.setValue("hourlyRate", hourlyWage);
  };
  
  // Calculate total earnings and deductions
  const calculateTotals = () => {
    let totalEarnings = 0;
    let totalDeductions = 0;
    
    // Basic salary
    const basicSalary = parseFloat(form.getValues("basicSalary") as string);
    if (!isNaN(basicSalary)) {
      totalEarnings += basicSalary;
    }
    
    // Overtime
    const overtimeHours = parseFloat(form.getValues("overtimeHours") as string);
    const overtimeRate = parseFloat(form.getValues("overtimeRate") as string);
    if (!isNaN(overtimeHours) && !isNaN(overtimeRate) && overtimeHours > 0 && overtimeRate > 0) {
      totalEarnings += overtimeHours * overtimeRate;
    }
    
    // Bonus
    const bonus = parseFloat(form.getValues("bonus") as string);
    if (!isNaN(bonus)) {
      totalEarnings += bonus;
    }
    
    // Allowances
    newAllowances.forEach(allowance => {
      if (allowance.includeInPayroll && !isNaN(allowance.amount)) {
        totalEarnings += allowance.amount;
      }
    });
    
    // Deductions
    newDeductions.forEach(deduction => {
      if (deduction.includeInPayroll && !isNaN(deduction.amount)) {
        totalDeductions += deduction.amount;
      }
    });
    
    // Tax
    const tax = parseFloat(form.getValues("tax") as string);
    if (!isNaN(tax)) {
      totalDeductions += tax;
    }
    
    // Update form values
    form.setValue("totalEarnings", totalEarnings);
    form.setValue("totalDeductions", totalDeductions);
    form.setValue("netPay", totalEarnings - totalDeductions);
  };
  
  // Handle form submission
  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    // Convert numeric string fields to numbers
    const formattedData = {
      ...data,
      basicSalary: parseFloat(data.basicSalary as unknown as string),
      hoursWorked: parseFloat(data.hoursWorked as unknown as string),
      hourlyRate: parseFloat(data.hourlyRate as unknown as string),
      overtimeHours: parseFloat(data.overtimeHours as unknown as string),
      overtimeRate: parseFloat(data.overtimeRate as unknown as string),
      bonus: parseFloat(data.bonus as unknown as string),
      tax: parseFloat(data.tax as unknown as string),
      totalEarnings: parseFloat(data.totalEarnings as unknown as string),
      totalDeductions: parseFloat(data.totalDeductions as unknown as string),
      netPay: parseFloat(data.netPay as unknown as string),
      allowances: newAllowances,
      deductions: newDeductions,
    };
    
    onSubmit(formattedData);
  };
  
  // Render form
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Employee Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ... keep existing code (form fields) ... */}
          </CardContent>
        </Card>
        
        {/* ... More sections of the form ... */}
        
        {/* Allowances */}
        <Card>
          <CardHeader>
            <CardTitle>Allowances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing allowances */}
            {newAllowances.map((allowance, index) => (
              <div key={`allowance-${index}`} className="flex items-center gap-4">
                <div className="flex-1">{allowance.type}</div>
                <div className="w-24">₹{allowance.amount.toFixed(2)}</div>
                <Checkbox 
                  checked={newAllowances[index].includeInPayroll} 
                  onCheckedChange={(checked) => {
                    const updatedAllowances = [...newAllowances];
                    updatedAllowances[index].includeInPayroll = checked as boolean;
                    setNewAllowances(updatedAllowances);
                    calculateTotals();
                  }} 
                />
                <Label htmlFor={`includeAllowance-${index}`} className="ml-0 mr-auto">Include</Label>
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleRemoveAllowance(index)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {/* Add new allowance */}
            <div className="flex flex-wrap gap-2 items-end mt-4">
              <div className="flex-1">
                <Label htmlFor="newAllowanceType">Type</Label>
                <Input 
                  id="newAllowanceType" 
                  placeholder="e.g., Travel Allowance" 
                  value={newAllowanceType}
                  onChange={(e) => setNewAllowanceType(e.target.value)}
                />
              </div>
              <div className="w-24">
                <Label htmlFor="newAllowanceAmount">Amount</Label>
                <Input 
                  id="newAllowanceAmount" 
                  placeholder="Amount" 
                  value={newAllowanceAmount}
                  onChange={(e) => setNewAllowanceAmount(e.target.value)}
                />
              </div>
              <Button 
                type="button" 
                onClick={handleAddAllowance}
                disabled={!newAllowanceType || !newAllowanceAmount || parseFloat(newAllowanceAmount) <= 0}
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Deductions */}
        <Card>
          <CardHeader>
            <CardTitle>Deductions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing deductions */}
            {newDeductions.map((deduction, index) => (
              <div key={`deduction-${index}`} className="flex items-center gap-4">
                <div className="flex-1">{deduction.type}</div>
                <div className="w-24">₹{deduction.amount.toFixed(2)}</div>
                <Checkbox 
                  checked={newDeductions[index].includeInPayroll} 
                  onCheckedChange={(checked) => {
                    const updatedDeductions = [...newDeductions];
                    updatedDeductions[index].includeInPayroll = checked as boolean;
                    setNewDeductions(updatedDeductions);
                    calculateTotals();
                  }} 
                />
                <Label htmlFor={`includeDeduction-${index}`} className="ml-0 mr-auto">Include</Label>
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleRemoveDeduction(index)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {/* Add new deduction */}
            <div className="flex flex-wrap gap-2 items-end mt-4">
              <div className="flex-1">
                <Label htmlFor="newDeductionType">Type</Label>
                <Input 
                  id="newDeductionType" 
                  placeholder="e.g., Health Insurance" 
                  value={newDeductionType}
                  onChange={(e) => setNewDeductionType(e.target.value)}
                />
              </div>
              <div className="w-24">
                <Label htmlFor="newDeductionAmount">Amount</Label>
                <Input 
                  id="newDeductionAmount" 
                  placeholder="Amount" 
                  value={newDeductionAmount}
                  onChange={(e) => setNewDeductionAmount(e.target.value)}
                />
              </div>
              <Button 
                type="button" 
                onClick={handleAddDeduction}
                disabled={!newDeductionType || !newDeductionAmount || parseFloat(newDeductionAmount) <= 0}
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ... keep existing code (form fields) ... */}
          </CardContent>
        </Card>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Payroll Entry"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
