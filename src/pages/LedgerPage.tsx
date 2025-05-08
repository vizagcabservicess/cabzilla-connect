
import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState<string>("ledger");
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    // In a real application, this would be an API call to fetch ledger data
    const fetchLedgerData = async () => {
      try {
        setIsLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Sample ledger data - in a real app this would come from an API
        const sampleLedgerData = [
          { id: 1, date: '2025-05-01', description: 'Fare collection - Airport trip', type: 'income', amount: 3200, category: 'Trip Revenue', paymentMethod: 'Online', reference: 'ORD-#5428', balance: 352000 },
          { id: 2, date: '2025-04-30', description: 'Fuel payment - VEH-001', type: 'expense', amount: 4850, category: 'Fuel', paymentMethod: 'Card', reference: 'INV-4532', balance: 348800 },
          { id: 3, date: '2025-04-30', description: 'Driver salary - Ravi Kumar', type: 'expense', amount: 12500, category: 'Salary', paymentMethod: 'Bank Transfer', reference: 'SAL-APR-21', balance: 336300 },
          { id: 4, date: '2025-04-29', description: 'Vehicle maintenance - VEH-003', type: 'expense', amount: 8500, category: 'Maintenance', paymentMethod: 'Card', reference: 'MECH-352', balance: 327800 },
          { id: 5, date: '2025-04-29', description: 'Fare collection - Outstation trip', type: 'income', amount: 12500, category: 'Trip Revenue', paymentMethod: 'Cash', reference: 'ORD-#5426', balance: 340300 },
          { id: 6, date: '2025-04-28', description: 'Office rent payment', type: 'expense', amount: 15000, category: 'Rent', paymentMethod: 'Bank Transfer', reference: 'RENT-APR', balance: 325300 },
          { id: 7, date: '2025-04-28', description: 'Insurance payment - Fleet', type: 'expense', amount: 24500, category: 'Insurance', paymentMethod: 'Bank Transfer', reference: 'INS-Q2-25', balance: 300800 },
        ];
        
        setLedgerData(sampleLedgerData);
        
        console.log("Ledger data loaded:", sampleLedgerData);
      } catch (error) {
        console.error("Error fetching ledger data:", error);
        toast({
          title: "Error",
          description: "Failed to load ledger data. Using sample data instead.",
          variant: "destructive",
        });
        
        // Fallback to empty dataset
        setLedgerData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLedgerData();
  }, [toast]);
  
  // Calculate financial metrics
  const totalIncome = ledgerData.filter(item => item.type === 'income').reduce((sum, record) => sum + record.amount, 0);
  const totalExpenses = ledgerData.filter(item => item.type === 'expense').reduce((sum, record) => sum + record.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  // Function to get styling for income/expense
  const getAmountStyle = (type: string): string => {
    return type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
  };

  const handleAddTransaction = (type: 'income' | 'expense') => {
    toast({
      title: "Feature Coming Soon",
      description: `The ability to add ${type} transactions will be available in the next update.`,
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Ledger</h1>
            <p className="text-gray-500">Track income, expenses and financial transactions</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleAddTransaction('income')}>Add Income</Button>
            <Button variant="outline" onClick={() => handleAddTransaction('expense')}>Add Expense</Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Income</p>
                <h3 className="text-2xl font-bold text-green-600">₹{totalIncome.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Expenses</p>
                <h3 className="text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Net Balance</p>
                <h3 className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{netBalance.toFixed(2)}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Transaction History</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Export</Button>
                <Button variant="outline" size="sm">Filter</Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount (₹)</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Balance (₹)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.date}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{record.description}</TableCell>
                        <TableCell className="capitalize">{record.type}</TableCell>
                        <TableCell>{record.category}</TableCell>
                        <TableCell className={getAmountStyle(record.type)}>
                          {record.type === 'expense' ? '-' : '+'}{record.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>{record.paymentMethod}</TableCell>
                        <TableCell>{record.reference}</TableCell>
                        <TableCell className="font-medium">{record.balance.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">Details</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
