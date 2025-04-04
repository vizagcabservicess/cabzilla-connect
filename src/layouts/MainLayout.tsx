
import React from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto py-4">
          <h1 className="text-2xl font-bold text-gray-800">Cab Booking System</h1>
        </div>
      </header>
      <main className="flex-grow container mx-auto py-6 px-4">
        <Outlet />
      </main>
      <footer className="bg-gray-100">
        <div className="container mx-auto py-4 text-center text-gray-600">
          &copy; {new Date().getFullYear()} Cab Booking System
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
