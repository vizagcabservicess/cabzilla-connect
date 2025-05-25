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
import { fleetAPI } from '@/services/api/fleetAPI';
import AdminLayout from "@/components/admin/AdminLayout";

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
  const [drivers, setDrivers] = useState<any[]>([]);
  
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
  
  // Fetch drivers for fallback display
  useEffect(() => {
    if (payrollEntries.length === 0) {
      fleetAPI.getDrivers().then(setDrivers).catch(() => setDrivers([]));
    }
  }, [payrollEntries]);
  
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

  // Find the summary for the selected driver
  const selectedDriverSummary = payrollSummary?.byDriver?.find(
    (d) => String(d.driverId) === String(selectedDriverId)
  );

  return (
    <AdminLayout activeTab="payroll">
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
        
        {/* Selected Driver Summary */}
        {showDriverView && selectedDriverSummary && (
          <div className="mb-6">
            <Card>
              <CardContent className="p-6 flex flex-col md:flex-row gap-6">
                <div>
                  <div className="text-gray-500">Driver</div>
                  <div className="font-bold">{selectedDriverSummary.driverName}</div>
                </div>
                <div>
                  <div className="text-gray-500">Total Paid</div>
                  <div className="font-bold">₹{selectedDriverSummary.amount.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-gray-500">Status</div>
                  <div className="font-bold">{selectedDriverSummary.status}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Payroll Table or Fallback */}
        <Card>
          <CardContent className="p-6">
            {payrollEntries.length > 0 ? (
              <PayrollTable 
                data={payrollEntries} 
                isLoading={isLoading || isRefreshing}
                onViewDetails={handleEditPayroll}
                onGeneratePayslip={(id) => payrollAPI.generatePayslip(id, 'pdf')}
                showDriverColumn={!showDriverView}
              />
            ) : (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Drivers</span>
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Payroll Entry
                  </Button>
                </div>
                {drivers.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {drivers.map(driver => (
                          <tr key={driver.id}>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{driver.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{driver.phone}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{driver.status}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Button size="sm" onClick={() => { setSelectedDriverId(driver.id); setFormOpen(true); }}>Add Payroll Entry</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">No drivers found.</div>
                )}
              </div>
            )}
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
      
      {/* Payroll Entry Form Dialog */}
      <PayrollEntryForm 
        open={formOpen}
        onOpenChange={setFormOpen}
        onPayrollAdded={handlePayrollAdded}
        payrollToEdit={currentPayroll}
        selectedDriverId={selectedDriverId}
      />
    </AdminLayout>
  );
}
