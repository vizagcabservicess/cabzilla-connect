import { AdminSidebar } from "@/components/admin/AdminSidebar";
import React, { useState } from "react";

export default function AdminLayout({ children, activeTab }: { children: React.ReactNode, activeTab: string }) {
  const [tab, setTab] = useState(activeTab);
  return (
    <div className="flex bg-gray-100">
      <AdminSidebar activeTab={tab} setActiveTab={setTab} />
      <main className="flex-1 flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="w-full py-4 text-center text-gray-400 bg-gray-100 border-t">
          © {new Date().getFullYear()} Vizag Taxi Hub
        </footer>
      </main>
    </div>
  );
} 