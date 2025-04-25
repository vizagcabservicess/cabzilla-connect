
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CarTaxiFront, CircleDollarSign, Users } from 'lucide-react';

interface AdminStatsCardsProps {
  metrics: any;
  isLoading: boolean;
}

export function AdminStatsCards({ metrics, isLoading }: AdminStatsCardsProps) {
  const stats = [
    { 
      title: 'Total Bookings', 
      value: metrics?.totalBookings || 0,
      icon: <Calendar className="h-5 w-5 text-blue-600" />,
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'Total Revenue', 
      value: `₹${(metrics?.totalRevenue || 0).toLocaleString('en-IN')}`,
      icon: <CircleDollarSign className="h-5 w-5 text-green-600" />,
      bgColor: 'bg-green-50'
    },
    { 
      title: 'Active Drivers', 
      value: metrics?.availableDrivers || 0,
      icon: <Users className="h-5 w-5 text-purple-600" />,
      bgColor: 'bg-purple-50'
    },
    { 
      title: 'Available Cabs', 
      value: metrics?.availableCabs || 0,
      icon: <CarTaxiFront className="h-5 w-5 text-amber-600" />,
      bgColor: 'bg-amber-50'
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <h4 className="text-2xl font-bold mt-1">{stat.value}</h4>
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
