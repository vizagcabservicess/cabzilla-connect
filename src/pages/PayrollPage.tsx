import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PayrollEntryForm } from '@/components/admin/payroll/PayrollEntryForm';
import { PayrollEntry } from '@/types/api';
import { MoreVertical, Edit, Trash } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

export default function PayrollPage() {
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payrollToEdit, setPayrollToEdit] = useState<PayrollEntry | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | number>('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);

  useEffect(() => {
    const term = searchParams.get('search') || '';
    setSearchTerm(term);
    loadPayroll();
  }, [searchParams]);

  const loadPayroll = async () => {
    // Mock API call to fetch payroll entries
    const mockPayrollEntries: PayrollEntry[] = [
      {
        id: 1,
        driver_id: 101,
        driver_name: 'John Doe',
        month: 'January',
        year: 2024,
        base_salary: 30000,
        commission: 5000,
        bonus: 1000,
        deductions: 500,
        total_amount: 35500,
        status: 'paid',
        created_at: '2024-01-31',
        driverId: 101,
        baseSalary: 30000,
        incentives: 5000,
        totalAmount: 35500,
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
        incentives: 5000,
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
      },
      {
        id: 2,
        driver_id: 102,
        driver_name: 'Alice Smith',
        month: 'January',
        year: 2024,
        base_salary: 32000,
        commission: 6000,
        bonus: 1200,
        deductions: 600,
        total_amount: 38600,
        status: 'paid',
        created_at: '2024-01-31',
        driverId: 102,
        baseSalary: 32000,
        incentives: 6000,
        totalAmount: 38600,
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
        incentives: 6000,
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
      },
      {
        id: 3,
        driver_id: 103,
        driver_name: 'Bob Johnson',
        month: 'January',
        year: 2024,
        base_salary: 28000,
        commission: 4000,
        bonus: 800,
        deductions: 400,
        total_amount: 32400,
        status: 'pending',
        created_at: '2024-01-31',
        driverId: 103,
        baseSalary: 28000,
        incentives: 4000,
        totalAmount: 32400,
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
        incentives: 4000,
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
      },
      {
        id: 4,
        driver_id: 104,
        driver_name: 'Emily White',
        month: 'January',
        year: 2024,
        base_salary: 31000,
        commission: 5500,
        bonus: 1100,
        deductions: 550,
        total_amount: 37050,
        status: 'paid',
        created_at: '2024-01-31',
        driverId: 104,
        baseSalary: 31000,
        incentives: 5500,
        totalAmount: 37050,
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
        incentives: 5500,
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
      },
      {
        id: 5,
        driver_id: 105,
        driver_name: 'David Green',
        month: 'January',
        year: 2024,
        base_salary: 29000,
        commission: 4500,
        bonus: 900,
        deductions: 450,
        total_amount: 33950,
        status: 'pending',
        created_at: '2024-01-31',
        driverId: 105,
        baseSalary: 29000,
        incentives: 4500,
        totalAmount: 33950,
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
        incentives: 4500,
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
      },
    ];

    setPayrollEntries(mockPayrollEntries);
  };

  const handleSavePayrollEntry = async (entry: Partial<PayrollEntry>) => {
    // Mock API call to save payroll entry
    console.log('Saving payroll entry:', entry);
    toast.success('Payroll entry saved successfully');
    setIsModalOpen(false);
    setPayrollToEdit(null);
    loadPayroll();
  };

  const handleEditPayrollEntry = (entry: PayrollEntry) => {
    setPayrollToEdit(entry);
    setIsModalOpen(true);
  };

  const handleDeletePayrollEntry = async (id: number) => {
    // Mock API call to delete payroll entry
    console.log('Deleting payroll entry:', id);
    toast.success('Payroll entry deleted successfully');
    loadPayroll();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSearchParams({ search: term });
  };

  // Get current entries
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = payrollEntries.slice(indexOfFirstEntry, indexOfLastEntry);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <AdminLayout activeTab="payroll">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Payroll Management</h1>

        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <Input
            type="text"
            placeholder="Search payrolls..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="mb-2 md:mb-0"
          />
          <Dialog>
            <DialogTrigger asChild>
              <Button>Add Payroll Entry</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Payroll Entry</DialogTitle>
                <DialogDescription>
                  Make a new entry to the payroll list.
                </DialogDescription>
              </DialogHeader>
              {isModalOpen && (
                <PayrollEntryForm
                  entry={payrollToEdit}
                  onSave={handleSavePayrollEntry}
                  onCancel={() => {
                    setIsModalOpen(false);
                    setPayrollToEdit(null);
                  }}
                  onOpenChange={setIsModalOpen}
                  onPayrollAdded={loadPayroll}
                  payrollToEdit={payrollToEdit}
                  selectedDriverId={selectedDriverId}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableCaption>A list of your recent payroll entries.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Driver Name</TableHead>
                <TableHead>Pay Period</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Incentives</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.id}</TableCell>
                  <TableCell>{entry.driver_name}</TableCell>
                  <TableCell>{entry.payPeriodStart} - {entry.payPeriodEnd}</TableCell>
                  <TableCell>₹{entry.baseSalary}</TableCell>
                  <TableCell>₹{entry.incentives}</TableCell>
                  <TableCell>₹{entry.deductions}</TableCell>
                  <TableCell>₹{entry.totalAmount}</TableCell>
                  <TableCell>{entry.status}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditPayrollEntry(entry)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeletePayrollEntry(entry.id)}>
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-4">
          {Array.from({ length: Math.ceil(payrollEntries.length / entriesPerPage) }, (_, i) => i + 1).map(number => (
            <Button
              key={number}
              variant="outline"
              className={`mx-1 ${currentPage === number ? 'bg-gray-200' : ''}`}
              onClick={() => paginate(number)}
            >
              {number}
            </Button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
