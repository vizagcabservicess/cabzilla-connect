
import React, { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from "sonner";
import { LedgerDateRangePicker } from '@/components/admin/ledger/LedgerDateRangePicker';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { PayrollEntry, PayrollFilter, PayrollSummary } from '@/types/ledger';
import { payrollAPI } from '@/services/api/payrollAPI';
import { PayrollSummaryCards } from '@/components/admin/payroll/PayrollSummaryCards';
import { PayrollTable } from '@/components/admin/payroll/PayrollTable';
import { PayrollEntryForm } from '@/components/admin/payroll/PayrollEntryForm';
import { DriverSelector } from '@/components/admin/payroll/DriverSelector';
import { PayrollCharts } from '@/components/admin/payroll/PayrollCharts';
import { DriverPayrollHistory } from '@/components/admin/payroll/DriverPayrollHistory';

export default function PayrollPage() {
  // Set default date range to current month
  const today = new Date();
  const defaultDateRange = {
    from: startOfMonth(today),
    to: endOfMonth(today)
  };
  
  // State variables
  const [activeView, setActiveView] = useState<string>("payroll");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDriverView, setShowDriverView] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | number | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [currentPayroll, setCurrentPayroll] = useState<PayrollEntry | undefined>();
  
  // Data state
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  
  // Fetch payroll data based on filters
  const fetchPayrollData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      const filters: PayrollFilter = {
        dateRange,
        driverId: showDriverView ? selectedDriverId : undefined,
        paymentStatus: undefined,
      };
      
      // Fetch payroll entries and summary in parallel
      const [entries, summary] = await Promise.all([
        payrollAPI.fetchPayrollEntries(filters),
        payrollAPI.getPayrollSummary(dateRange)
      ]);
      
      setPayrollEntries(entries);
      setPayrollSummary(summary);
    } catch (error) {
      console.error("Error fetching payroll data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange, showDriverView, selectedDriverId]);
  
  // Initial data load
  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);
  
  // Apply date range filter
  const handleApplyDateRange = () => {
    fetchPayrollData(true);
  };
  
  // Handle driver selection
  const handleDriverSelect = (driverId: string | number) => {
    setSelectedDriverId(driverId);
    setShowDriverView(true);
  };
  
  // Handle returning to all drivers view
  const handleResetDriverView = () => {
    setSelectedDriverId(undefined);
    setShowDriverView(false);
  };
  
  // Handle payroll edit
  const handleEditPayroll = (payroll: PayrollEntry) => {
    setCurrentPayroll(payroll);
    setFormOpen(true);
  };
  
  // Handle add new payroll entry
  const handleAddNew = () => {
    setCurrentPayroll(undefined);
    setFormOpen(true);
  };
  
  // Handle payroll entry added/updated
  const handlePayrollAdded = () => {
    fetchPayrollData(true);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeView} setActiveTab={setActiveView} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {showDriverView ? 'Driver Payroll Management' : 'Payroll Management'}
              </h1>
              <p className="text-gray-500">
                {showDriverView 
                  ? `Manage salary and attendance for selected driver` 
                  : 'Process driver salaries, advances, and attendance'
                }
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-end">
              <LedgerDateRangePicker 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onApply={handleApplyDateRange}
                disabled={isLoading}
              />
              {!showDriverView && (
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" /> New Payroll Entry
                </Button>
              )}
              {showDriverView && (
                <Button variant="outline" onClick={handleResetDriverView}>
                  View All Drivers
                </Button>
              )}
            </div>
          </div>
          
          {/* Driver Selector (when not in driver-specific view) */}
          {!showDriverView && payrollSummary && (
            <DriverSelector 
              drivers={payrollSummary.byDriver} 
              onSelectDriver={handleDriverSelect}
              isLoading={isLoading}
            />
          )}
          
          {/* Summary Cards */}
          {payrollSummary && !showDriverView && (
            <PayrollSummaryCards
              totalPaid={payrollSummary.totalPaid}
              totalPending={payrollSummary.totalPending}
              totalDrivers={payrollSummary.totalDrivers}
              isLoading={isLoading}
            />
          )}
          
          {/* Payroll Table */}
          <Card>
            <CardContent className="p-6">
              <PayrollTable 
                data={payrollEntries} 
                isLoading={isLoading || isRefreshing}
                onViewDetails={handleEditPayroll}
                onGeneratePayslip={(id) => payrollAPI.generatePayslip(id, 'pdf')}
                showDriverColumn={!showDriverView}
              />
            </CardContent>
          </Card>
          
          {/* Charts and Analytics */}
          {payrollSummary && !isLoading && payrollEntries.length > 0 && !showDriverView && (
            <PayrollCharts 
              summary={payrollSummary}
            />
          )}
          
          {/* Driver-specific payroll history */}
          {showDriverView && selectedDriverId && (
            <DriverPayrollHistory 
              driverId={selectedDriverId}
              isLoading={isLoading}
              onRecordAdvance={(amount, date, notes) => 
                payrollAPI.recordSalaryAdvance(selectedDriverId, amount, date, notes)
              }
              onRefresh={() => fetchPayrollData(true)}
            />
          )}
        </div>
      </main>
      
      {/* Payroll Entry Form Dialog */}
      <PayrollEntryForm 
        open={formOpen}
        onOpenChange={setFormOpen}
        onPayrollAdded={handlePayrollAdded}
        payrollToEdit={currentPayroll}
        selectedDriverId={selectedDriverId}
      />
    </div>
  );
}
