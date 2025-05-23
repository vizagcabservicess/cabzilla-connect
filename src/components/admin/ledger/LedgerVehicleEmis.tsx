import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { VehicleEmi, ledgerAPI } from '@/services/api/ledgerAPI';
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface LedgerVehicleEmisProps {
  data: VehicleEmi[];
  isLoading?: boolean;
  onUpdate?: () => void;
}

export function LedgerVehicleEmis({ data, isLoading = false, onUpdate }: LedgerVehicleEmisProps) {
  const [processingIds, setProcessingIds] = useState<Set<string | number>>(new Set());

  // Ensure data is an array
  const safeData = Array.isArray(data) ? data : [];

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleMarkPaid = async (emi: VehicleEmi) => {
    try {
      setProcessingIds(prev => new Set(prev).add(emi.id));
      await ledgerAPI.updateEmiStatus(emi.id, 'paid');
      
      toast.success(`EMI marked as paid`, {
        description: `${emi.vehicleNumber} EMI of ${formatCurrency(emi.emiAmount)} has been marked as paid.`
      });
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error marking EMI as paid:', error);
      toast.error('Failed to update EMI status', {
        description: 'Please try again later.'
      });
    } finally {
      setProcessingIds(prev => {
        const updated = new Set(prev);
        updated.delete(emi.id);
        return updated;
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle EMIs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="h-12 border-b bg-gray-50"></div>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 border-b animate-pulse bg-gray-100"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safely filter the EMIs
  const overdueEmis = safeData.filter(emi => emi.status === 'overdue');
  const pendingEmis = safeData.filter(emi => emi.status === 'pending');
  const paidEmis = safeData.filter(emi => emi.status === 'paid');

  // Calculate totals safely
  const totalAmount = safeData.reduce((sum, emi) => sum + (emi.emiAmount || 0), 0);
  const pendingAmount = [...overdueEmis, ...pendingEmis].reduce((sum, emi) => sum + (emi.emiAmount || 0), 0);

  return (
    <Card className="space-y-6 overflow-x-hidden px-2 md:px-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Vehicle EMIs</CardTitle>
        <div className="text-sm text-gray-500">
          <span className="mr-4">Total: {formatCurrency(totalAmount)}</span>
          {pendingAmount > 0 && <span>Pending: {formatCurrency(pendingAmount)}</span>}
        </div>
      </CardHeader>
      <CardContent>
        {safeData.length === 0 ? (
          <div className="text-center p-6">
            <p className="text-muted-foreground">No EMIs found.</p>
          </div>
        ) : (
          <div className="relative">
            <ScrollArea className="h-[calc(60vh-20px)] w-full rounded-md border">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...overdueEmis, ...pendingEmis, ...paidEmis].map((emi) => (
                      <TableRow key={emi.id} className={emi.status === 'overdue' ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">{emi.vehicleNumber}</TableCell>
                        <TableCell>{formatDate(emi.dueDate)}</TableCell>
                        <TableCell>{emi.bankName}</TableCell>
                        <TableCell>{emi.loanRef}</TableCell>
                        <TableCell className="text-right">{formatCurrency(emi.emiAmount)}</TableCell>
                        <TableCell>{getStatusBadge(emi.status)}</TableCell>
                        <TableCell className="text-right">
                          {emi.status !== 'paid' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleMarkPaid(emi)}
                              disabled={processingIds.has(emi.id)}
                            >
                              {processingIds.has(emi.id) ? 'Processing...' : 'Mark Paid'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" className="h-3 bg-gray-100" />
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
