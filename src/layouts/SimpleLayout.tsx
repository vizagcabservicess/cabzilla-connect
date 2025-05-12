
import React from 'react';
import { Outlet } from 'react-router-dom';

const SimpleLayout = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Outlet />
    </div>
  );
};

export default SimpleLayout;
