import { EnhancedAdminSidebar } from "@/components/admin/EnhancedAdminSidebar";
import React, { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children, activeTab }: { children: React.ReactNode, activeTab: string }) {
  const [tab, setTab] = useState(activeTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);
  const toggleMobileSidebar = () => setIsMobileSidebarOpen((open) => !open);

  return (
    <div className="flex flex-col md:flex-row bg-background min-h-screen">
      {/* Mobile header with menu toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b shadow-sm sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-lg text-primary-foreground">
            VT
          </div>
          <span className="font-bold text-lg">Vizag Taxi Hub</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleMobileSidebar} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Mobile overlay when sidebar is open */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - slide-in drawer on mobile, fixed on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] overflow-y-auto transition-transform duration-200 ease-in-out md:translate-x-0 md:max-w-none md:z-30 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <EnhancedAdminSidebar activeTab={tab} setActiveTab={setTab} onClose={closeMobileSidebar} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 md:ml-64">
        <div className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </div>
        <footer className="w-full py-4 text-center text-muted-foreground bg-card border-t">
          © {new Date().getFullYear()} Vizag Taxi Hub
        </footer>
      </main>
    </div>
  );
} 
