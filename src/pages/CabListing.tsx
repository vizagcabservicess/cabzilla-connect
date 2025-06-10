import React from 'react';
import { useSearchParams } from 'react-router-dom';

const CabListing = () => {
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';
  // Add more params as needed

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-2">Cab Search Results</h2>
        <div className="text-gray-700 mb-4">
          <div><span className="font-semibold">From:</span> {from}</div>
          <div><span className="font-semibold">To:</span> {to}</div>
          <div><span className="font-semibold">Date:</span> {date}</div>
        </div>
        <hr className="my-4" />
        <div className="text-gray-500 italic">(Cab results will be shown here...)</div>
      </div>
    </div>
  );
};

export default CabListing; 