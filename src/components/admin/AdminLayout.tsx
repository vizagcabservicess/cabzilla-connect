import { AdminSidebar } from "@/components/admin/AdminSidebar";
import React, { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children, activeTab }: { children: React.ReactNode, activeTab: string }) {
  const [tab, setTab] = useState(activeTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex flex-col md:flex-row bg-gray-100 min-h-screen">
      {/* Mobile header with menu toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg text-white">
            VT
          </div>
          <span className="font-bold text-lg">Vizag Taxi Hub</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleMobileSidebar}>
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar - hidden on mobile by default, shown when toggled */}
      <div className={`${isMobileSidebarOpen ? 'block' : 'hidden'} md:block`}>
        <AdminSidebar activeTab={tab} setActiveTab={setTab} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">{children}</div>
        <footer className="w-full py-4 text-center text-gray-400 bg-gray-100 border-t">
          © {new Date().getFullYear()} Vizag Taxi Hub
        </footer>
      </main>
    </div>
  );
} 
