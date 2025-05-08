
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { EntitySummary } from '@/services/api/ledgerAPI';

interface LedgerEntityViewProps {
  entitySummaries: EntitySummary[];
  entityType: 'vehicle' | 'driver' | 'customer' | 'project';
  onEntityTypeChange: (type: 'vehicle' | 'driver' | 'customer' | 'project') => void;
  isLoading?: boolean;
}

export function LedgerEntityView({ 
  entitySummaries, 
  entityType, 
  onEntityTypeChange, 
  isLoading = false 
}: LedgerEntityViewProps) {
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>
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

  // Calculate the entity title
  const getEntityTypeTitle = () => {
    switch (entityType) {
      case 'vehicle': return 'Vehicle-wise Ledger';
      case 'driver': return 'Driver-wise Ledger';
      case 'customer': return 'Customer-wise Ledger';
      case 'project': return 'Project-wise Ledger';
      default: return 'Entity Ledger';
    }
  };

  // Calculate totals
  const totalIncome = entitySummaries.reduce((sum, entity) => sum + entity.income, 0);
  const totalExpenses = entitySummaries.reduce((sum, entity) => sum + entity.expense, 0);
  const totalBalance = entitySummaries.reduce((sum, entity) => sum + entity.balance, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <CardTitle>{getEntityTypeTitle()}</CardTitle>
          <Select value={entityType} onValueChange={(value: 'vehicle' | 'driver' | 'customer' | 'project') => onEntityTypeChange(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vehicle">Vehicle</SelectItem>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="project">Project</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {entitySummaries.length === 0 ? (
          <div className="text-center p-6">
            <p className="text-muted-foreground">No {entityType} data available.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entitySummaries.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell>{entity.id}</TableCell>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(entity.income)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(entity.expense)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      entity.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(entity.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={2}>Totals</TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(totalIncome)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(totalExpenses)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${
                    totalBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(totalBalance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
