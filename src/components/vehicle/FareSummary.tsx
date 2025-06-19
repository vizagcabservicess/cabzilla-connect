import React from 'react';

interface FareSummaryProps {
  fare?: {
    price?: number;
    tour?: string;
    passengers?: number;
    bags?: { large?: number; small?: number };
  };
}

const FareSummary: React.FC<FareSummaryProps> = ({ fare }) => {
  if (!fare || typeof fare.price !== 'number') {
    return (
      <div className="bg-white rounded shadow p-6 w-full max-w-sm mx-auto mb-8 text-center text-gray-500">
        Fare information not available.
      </div>
    );
  }
  return (
    <div className="bg-white rounded shadow p-6 w-full max-w-sm mx-auto mb-8">
      <div className="mb-2 text-gray-700 font-semibold">Fare Summary</div>
      <div className="text-2xl font-bold text-blue-700 mb-2">
        € {fare.price.toLocaleString()} <span className="text-base font-normal text-gray-600">for {fare.tour || 'Tour'}</span>
      </div>
      <div className="mb-4">
        <div className="text-gray-700 text-sm">Passengers</div>
        <div className="font-medium text-gray-900">{fare.passengers || '-'} Passengers</div>
        <div className="text-gray-700 text-sm mt-1">
          {(fare.bags?.large ?? '-')} Large Bags, {(fare.bags?.small ?? '-')} Small Bags
        </div>
      </div>
      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition">Book Now</button>
    </div>
  );
};

export default FareSummary; 