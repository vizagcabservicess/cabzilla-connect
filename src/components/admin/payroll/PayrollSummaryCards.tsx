
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee, Users, CalendarDays } from 'lucide-react';

interface PayrollSummaryCardsProps {
  totalPaid: number;
  totalPending: number;
  totalDrivers: number;
  isLoading?: boolean;
}

export function PayrollSummaryCards({ totalPaid, totalPending, totalDrivers, isLoading = false }: PayrollSummaryCardsProps) {
  // Format currency function
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Card data
  const cards = [
    {
      title: "Total Salary Paid",
      value: formatCurrency(totalPaid),
      description: "Total disbursed amount",
      icon: <IndianRupee className="h-4 w-4 text-green-600" />,
      color: "bg-green-50 text-green-700 border-green-200",
    },
    {
      title: "Pending Payments",
      value: formatCurrency(totalPending),
      description: "Unpaid/partially paid salaries",
      icon: <IndianRupee className="h-4 w-4 text-amber-600" />,
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      title: "Total Drivers",
      value: totalDrivers.toString(),
      description: "Active drivers on payroll",
      icon: <Users className="h-4 w-4 text-blue-600" />,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-[140px]" />
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, i) => (
        <Card key={i} className={`border ${card.color}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </div>
            <CardDescription>{card.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
