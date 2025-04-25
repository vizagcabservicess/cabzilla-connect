
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Car, 
  CircleDollarSign, 
  Users 
} from 'lucide-react';

export function AdminStatsCards() {
  const stats = [
    { 
      title: 'Total Bookings', 
      value: '1,258', 
      change: '+12.5%',
      isPositive: true,
      icon: <Calendar className="h-5 w-5 text-blue-600" />,
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'Total Revenue', 
      value: '₹3,85,420', 
      change: '+8.2%',
      isPositive: true,
      icon: <CircleDollarSign className="h-5 w-5 text-green-600" />,
      bgColor: 'bg-green-50'
    },
    { 
      title: 'Active Drivers', 
      value: '48', 
      change: '-2.5%',
      isPositive: false,
      icon: <Users className="h-5 w-5 text-purple-600" />,
      bgColor: 'bg-purple-50'
    },
    { 
      title: 'Available Cabs', 
      value: '32', 
      change: '+5.0%',
      isPositive: true,
      icon: <Car className="h-5 w-5 text-amber-600" />,
      bgColor: 'bg-amber-50'
    },
  ];

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
            
            <div className="mt-4 flex items-center">
              <div className={`flex items-center text-sm ${
                stat.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.isPositive 
                  ? <ArrowUpRight className="h-4 w-4 mr-1" /> 
                  : <ArrowDownRight className="h-4 w-4 mr-1" />
                }
                {stat.change}
              </div>
              <span className="text-xs text-gray-500 ml-2">vs. last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
