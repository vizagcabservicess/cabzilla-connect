
import React from 'react';
import { Outlet } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-slate-800 text-white shadow-sm">
        <div className="container mx-auto py-4">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
      </header>
      <main className="flex-grow container mx-auto py-6 px-4">
        <Outlet />
      </main>
      <footer className="bg-slate-800 text-white">
        <div className="container mx-auto py-4 text-center">
          &copy; {new Date().getFullYear()} Admin Panel
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
