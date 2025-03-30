
import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';

export const AdminHeader: React.FC = () => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500">Manage vehicles, fares, and bookings</p>
      </div>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link to="/">Back to Website</Link>
        </Button>
      </div>
    </div>
  );
};
