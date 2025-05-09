import React, { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';
import { toast } from "sonner";
import { 
  CategorySummary, 
  EntitySummary, 
  LedgerEntry, 
  LedgerFilter, 
  LedgerSummary,
  PaymentMethodSummary, 
  VehicleEmi, 
  ledgerAPI 
} from '@/services/api/ledgerAPI';
import { LedgerSummaryCards } from '@/components/admin/ledger/LedgerSummaryCards';
import { LedgerDateRangePicker } from '@/components/admin/ledger/LedgerDateRangePicker';
import { LedgerExportActions } from '@/components/admin/ledger/LedgerExportActions';
import { LedgerTabs } from '@/components/admin/ledger/LedgerTabs';
import { LedgerTable } from '@/components/admin/ledger/LedgerTable';
import { LedgerCharts } from '@/components/admin/ledger/LedgerCharts';
import { LedgerVehicleEmis } from '@/components/admin/ledger/LedgerVehicleEmis';
import { LedgerEntityView } from '@/components/admin/ledger/LedgerEntityView';

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [activeView, setActiveView] = useState<string>("ledger");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [entityType, setEntityType] = useState<'vehicle' | 'driver' | 'customer' | 'project'>('vehicle');
  
  // State for different data types - initialize with empty arrays/null
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [paymentMethodSummaries, setPaymentMethodSummaries] = useState<PaymentMethodSummary[]>([]);
  const [vehicleEmis, setVehicleEmis] = useState<VehicleEmi[]>([]);
  const [entitySummaries, setEntitySummaries] = useState<EntitySummary[]>([]);

  // Convert the active tab to the corresponding filter type
  const getFilterTypeFromTab = (tab: string): LedgerFilter['type'] | 'all' => {
    switch (tab) {
      case 'payments': return 'income';
      case 'expenses': return 'expense';
      case 'emis': return 'emi';
      default: return 'all';
    }
  };
  
  // Fetch ledger data based on filters
  const fetchLedgerData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      const filterType = getFilterTypeFromTab(activeTab);
      const filters: LedgerFilter = {
        dateRange,
        type: filterType === 'all' ? undefined : filterType
      };
      
      // Fetch entries and summary in parallel
      const [entries, summary] = await Promise.all([
        ledgerAPI.fetchLedgerEntries(filters),
        ledgerAPI.fetchLedgerSummary(filters)
      ]);
      
      setLedgerEntries(entries || []);
      setLedgerSummary(summary || {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        cashAccepted: 0,
        inBankAccount: 0,
        pendingPayments: 0
      });
      
      // Fetch category and payment method summaries
      const [categories, paymentMethods] = await Promise.all([
        ledgerAPI.fetchCategorySummaries(filters),
        ledgerAPI.fetchPaymentMethodSummaries(filters)
      ]);
      
      setCategorySummaries(categories || []);
      setPaymentMethodSummaries(paymentMethods || []);
      
    } catch (error) {
      console.error("Error fetching ledger data:", error);
      toast.error("Failed to load ledger data. Please try again later.");
      // Set default empty values on error
      setLedgerEntries([]);
      setCategorySummaries([]);
      setPaymentMethodSummaries([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, dateRange]);
  
  // Fetch EMI data
  const fetchEmiData = useCallback(async () => {
    try {
      setIsLoading(true);
      const emis = await ledgerAPI.fetchVehicleEmis();
      setVehicleEmis(emis || []);
    } catch (error) {
      console.error("Error fetching EMI data:", error);
      toast.error("Failed to load EMI data. Please try again later.");
      // Set empty array on error
      setVehicleEmis([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Fetch entity data
  const fetchEntityData = useCallback(async () => {
    try {
      setIsLoading(true);
      const entities = await ledgerAPI.fetchEntitySummaries(entityType);
      setEntitySummaries(entities || []);
    } catch (error) {
      console.error("Error fetching entity data:", error);
      toast.error("Failed to load entity data. Please try again later.");
      // Set empty array on error
      setEntitySummaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Handle entity type change
  const handleEntityTypeChange = (type: 'vehicle' | 'driver' | 'customer' | 'project') => {
    setEntityType(type);
  };

  // Apply date range filter
  const handleApplyDateRange = () => {
    if (activeTab === 'emis') {
      fetchEmiData();
    } else if (activeTab === 'entity') {
      fetchEntityData();
    } else {
      fetchLedgerData(true);
    }
  };

  // Handle ledger entry updates
  const handleEntryUpdated = () => {
    fetchLedgerData(true);
  };

  // Handle ledger entry deletion
  const handleEntryDeleted = () => {
    fetchLedgerData(true);
  };

  // Define tabs configuration with safe count calculations
  const tabs = [
    { id: 'all', label: 'All Transactions', count: ledgerEntries?.length || 0 },
    { id: 'payments', label: 'Payments', count: ledgerEntries?.filter(e => e.type === 'income')?.length || 0 },
    { id: 'expenses', label: 'Expenses', count: ledgerEntries?.filter(e => e.type === 'expense')?.length || 0 },
    { id: 'emis', label: 'Vehicle EMIs', count: vehicleEmis?.length || 0 },
    { id: 'entity', label: 'Entity-Specific' }
  ];

  // Initial data load
  useEffect(() => {
    if (activeTab === 'emis') {
      fetchEmiData();
    } else if (activeTab === 'entity') {
      fetchEntityData();
    } else {
      fetchLedgerData();
    }
  }, [activeTab, fetchLedgerData, fetchEmiData, fetchEntityData]);
  
  // Refetch on entity type change
  useEffect(() => {
    if (activeTab === 'entity') {
      fetchEntityData();
    }
  }, [entityType, fetchEntityData, activeTab]);

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeView} setActiveTab={setActiveView} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Ledger</h1>
              <p className="text-gray-500">Track income, expenses and financial transactions</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-end">
              <LedgerDateRangePicker 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onApply={handleApplyDateRange}
                disabled={isLoading}
              />
              <LedgerExportActions
                dateRange={dateRange}
                activeTab={activeTab}
              />
            </div>
          </div>
          
          {/* Summary Cards */}
          {ledgerSummary && (
            <LedgerSummaryCards
              totalIncome={ledgerSummary.totalIncome}
              totalExpenses={ledgerSummary.totalExpenses}
              netBalance={ledgerSummary.netBalance}
              cashAccepted={ledgerSummary.cashAccepted}
              inBankAccount={ledgerSummary.inBankAccount}
              pendingPayments={ledgerSummary.pendingPayments}
              isLoading={isLoading}
            />
          )}
          
          {/* Tab Navigation */}
          <Card>
            <CardContent className="p-2">
              <LedgerTabs 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
                tabs={tabs}
              />
            </CardContent>
          </Card>
          
          {/* Dynamic Content based on active tab */}
          <div className="space-y-6">
            {/* All Transactions, Payments, Expenses */}
            {(activeTab === 'all' || activeTab === 'payments' || activeTab === 'expenses') && (
              <>
                <LedgerTable 
                  data={ledgerEntries} 
                  isLoading={isLoading} 
                  onEntryUpdated={handleEntryUpdated}
                  onEntryDeleted={handleEntryDeleted}
                />
                
                {/* Charts only show when we have data and after loading */}
                {!isLoading && ledgerEntries.length > 0 && (
                  <LedgerCharts 
                    categorySummaries={categorySummaries} 
                    paymentMethodSummaries={paymentMethodSummaries}
                    recentEntries={ledgerEntries}
                    isLoading={isLoading}
                  />
                )}
              </>
            )}
            
            {/* Vehicle EMIs Tab */}
            {activeTab === 'emis' && (
              <LedgerVehicleEmis 
                data={vehicleEmis} 
                isLoading={isLoading} 
                onUpdate={fetchEmiData}
              />
            )}
            
            {/* Entity-Specific Tab */}
            {activeTab === 'entity' && (
              <LedgerEntityView
                entitySummaries={entitySummaries}
                entityType={entityType}
                onEntityTypeChange={handleEntityTypeChange}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
