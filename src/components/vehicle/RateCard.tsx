
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RateCardProps {
  rates?: {
    tripType: string;
    baseFare: string;
    distanceIncluded: string;
    notes: string;
  }[];
}

const RateCard: React.FC<RateCardProps> = ({ 
  rates = [
    {
      tripType: "City Tour",
      baseFare: "₹12/km",
      distanceIncluded: "Min 80 km",
      notes: "AC Included, Driver, Parking extra"
    },
    {
      tripType: "Outstation",
      baseFare: "₹18/km",
      distanceIncluded: "Min 300 km",
      notes: "AC Included, Driver, Night charges apply"
    },
    {
      tripType: "Airport Transfer",
      baseFare: "₹15/km",
      distanceIncluded: "One way",
      notes: "AC Included, Driver, Tolls included"
    },
    {
      tripType: "Araku Tour",
      baseFare: "₹6,500",
      distanceIncluded: "Full day",
      notes: "AC, Driver, Fuel, Parking included"
    }
  ]
}) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Rate Card</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Trip Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Base Fare</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Distance Included</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{rate.tripType}</td>
                  <td className="py-3 px-4 text-blue-600 font-semibold">{rate.baseFare}</td>
                  <td className="py-3 px-4 text-gray-700">{rate.distanceIncluded}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{rate.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RateCard;
