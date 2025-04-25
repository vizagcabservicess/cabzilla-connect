
import React from 'react';

export function AdminOrdersChart() {
  // In a real application, we would use a charting library like Recharts
  // For now we'll create a simple visual representation
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const ordersData = [35, 55, 41, 67, 22, 43];
  const maxValue = Math.max(...ordersData);
  
  // Helper to calculate bar height based on data value
  const getBarHeight = (value: number) => {
    return (value / maxValue) * 100;
  };
  
  // Generate some car illustrations for the visual
  const carIllustration = (
    <div className="absolute bottom-0 right-6">
      <div className="relative w-40 h-32">
        <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-50">
          {/* Simple car body */}
          <path d="M15,55 L25,30 L75,30 L85,55 Z" fill="#3b82f6" />
          {/* Car roof */}
          <path d="M30,30 L40,15 L60,15 L70,30 Z" fill="#2563eb" />
          {/* Wheels */}
          <circle cx="30" cy="55" r="10" fill="#111827" />
          <circle cx="70" cy="55" r="10" fill="#111827" />
          {/* Windows */}
          <path d="M40,30 L45,20 L55,20 L60,30 Z" fill="#bfdbfe" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="relative h-64">
      {carIllustration}
      
      {/* Chart Container */}
      <div className="flex items-end h-48 space-x-6">
        {months.map((month, i) => (
          <div key={month} className="flex-1 flex flex-col items-center">
            {/* Bar */}
            <div className="w-full relative">
              <div 
                className={`w-full bg-blue-600 bg-opacity-20 rounded-t-md`} 
                style={{ height: `${getBarHeight(ordersData[i])}%` }}
              >
                <div 
                  className="absolute bottom-0 w-full bg-blue-600 rounded-t-md"
                  style={{ height: `${getBarHeight(ordersData[i]) * 0.6}%` }}
                ></div>
              </div>
            </div>
            {/* Month Label */}
            <div className="mt-2 text-sm text-gray-500">{month}</div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex justify-start items-center space-x-6">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-600 mr-2"></div>
          <span className="text-xs text-gray-600">Orders</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-600 bg-opacity-20 mr-2"></div>
          <span className="text-xs text-gray-600">Profit</span>
        </div>
      </div>
    </div>
  );
}
