
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VehicleTabsProps {
  overview?: string;
  specs?: {
    seatingCapacity?: string;
    fuelType?: string;
    transmission?: string;
    luggage?: string;
    airConditioning?: string;
  };
  inclusions?: string[];
  exclusions?: string[];
  features?: string[];
  tags?: string[];
}

const VehicleTabs: React.FC<VehicleTabsProps> = ({ 
  overview = "The Ertiga is a versatile MPV with a spacious interior and comfortable seating for six passengers. It's ideal for families, business trips, or small group tours. The vehicle offers excellent fuel efficiency and a smooth ride experience with full air conditioning to keep you comfortable throughout your journey.",
  specs = {
    seatingCapacity: "6 Passengers",
    fuelType: "Diesel",
    transmission: "Manual",
    luggage: "3 Medium Bags",
    airConditioning: "Full AC"
  },
  inclusions = [
    "Driver",
    "Fuel",
    "AC",
    "Tolls",
    "Parking",
    "Driver Food",
    "Entry Tickets"
  ],
  exclusions = [
    "Personal expenses",
    "Extra meals",
    "Additional sightseeing",
    "Shopping expenses"
  ],
  features = ['AC', 'Music System', 'Charging Point'],
  tags = []
}) => {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex w-full flex-nowrap overflow-x-auto gap-2 p-1 bg-gray-50 rounded-lg mb-4">
            <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="inclusions" className="whitespace-nowrap">Inclusions & Exclusions</TabsTrigger>
            <TabsTrigger value="features" className="whitespace-nowrap">Features</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            <div className="space-y-4">
              <p className="text-gray-700 leading-relaxed">{overview}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Push-back seats</span>
                </div>
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Good legroom</span>
                </div>
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">USB charging ports</span>
                </div>
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Roof A/C</span>
                </div>
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">UBB c3</span>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="inclusions" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Inclusions</h4>
                <div className="space-y-3">
                  {inclusions.map((item, index) => (
                    <div key={index} className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-3" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Exclusions</h4>
                <div className="space-y-3">
                  {exclusions.map((item, index) => (
                    <div key={index} className="flex items-center text-red-500">
                      <X className="h-4 w-4 mr-3" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="features" className="mt-6">
            <div className="space-y-6">
              {/* Vehicle Tags */}
              {tags && tags.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Vehicle Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string, idx: number) => (
                      <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Vehicle Features */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Available Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <Badge variant="outline" className="text-sm">
                        {feature}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VehicleTabs;
