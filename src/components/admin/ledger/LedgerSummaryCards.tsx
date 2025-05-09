
import React from 'react';
import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";

interface LedgerSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  cashAccepted?: number;
  inBankAccount?: number;
  pendingPayments?: number;
  isLoading?: boolean;
}

export const LedgerSummaryCards: React.FC<LedgerSummaryProps> = ({
  totalIncome,
  totalExpenses,
  netBalance,
  cashAccepted,
  inBankAccount,
  pendingPayments,
  isLoading = false
}) => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-gray-300 rounded w-2/3"></div>
          </Card>
        ))}
      </div>
    );
  }

  // First row: Income, Expenses, Net
  const topRowCards = [
    { 
      title: "Total Income", 
      value: formatCurrency(totalIncome), 
      color: "text-green-600",
      icon: <ArrowDown className="h-4 w-4 text-green-500" />
    },
    { 
      title: "Total Expenses", 
      value: formatCurrency(totalExpenses), 
      color: "text-red-600",
      icon: <ArrowUp className="h-4 w-4 text-red-500" />
    },
    { 
      title: "Net Profit/Loss", 
      value: formatCurrency(netBalance), 
      color: netBalance >= 0 ? "text-green-600" : "text-red-600" 
    }
  ];

  // Second row: Cash, Bank, Pending (only if the data is provided)
  const showSecondRow = cashAccepted !== undefined && 
                       inBankAccount !== undefined && 
                       pendingPayments !== undefined;

  const bottomRowCards = showSecondRow ? [
    { 
      title: "Cash Accepted", 
      value: formatCurrency(cashAccepted || 0), 
      color: "text-green-600" 
    },
    { 
      title: "In Bank Account", 
      value: formatCurrency(inBankAccount || 0), 
      color: "text-blue-600" 
    },
    { 
      title: "Pending Payments", 
      value: formatCurrency(pendingPayments || 0), 
      color: "text-amber-600" 
    }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topRowCards.map((card, i) => (
          <Card key={i} className="p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center space-x-2 mb-1">
              {card.icon && card.icon}
              <p className="text-sm text-gray-500">{card.title}</p>
            </div>
            <h3 className={`text-2xl font-bold ${card.color}`}>{card.value}</h3>
          </Card>
        ))}
      </div>
      
      {showSecondRow && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {bottomRowCards.map((card, i) => (
            <Card key={i} className="p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <p className="text-sm text-gray-500 mb-1">{card.title}</p>
              <h3 className={`text-2xl font-bold ${card.color}`}>{card.value}</h3>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
