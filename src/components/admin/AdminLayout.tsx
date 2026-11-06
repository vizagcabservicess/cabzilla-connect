import { EnhancedAdminSidebar } from "@/components/admin/EnhancedAdminSidebar";
import React, { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children, activeTab }: { children: React.ReactNode, activeTab: string }) {
  const [tab, setTab] = useState(activeTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const holdPageStill = () => {
      root.style.setProperty('overflow', 'hidden', 'important');
      body.style.setProperty('overflow', 'hidden', 'important');
      body.style.setProperty('margin-right', '0px', 'important');
      body.style.setProperty('padding-right', '0px', 'important');
    };
    holdPageStill();
    const observer = new MutationObserver(holdPageStill);
    observer.observe(body, { attributes: true, attributeFilter: ['data-scroll-locked', 'class', 'style'] });
    return () => {
      observer.disconnect();
      body.removeAttribute('data-scroll-locked');
      root.style.removeProperty('overflow');
      body.style.removeProperty('overflow');
      body.style.removeProperty('overflow-x');
      body.style.removeProperty('overflow-y');
      body.style.removeProperty('margin-right');
      body.style.removeProperty('padding-right');
    };
  }, []);

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);
  const toggleMobileSidebar = () => setIsMobileSidebarOpen((open) => !open);

  return (
    <div data-admin-shell="" className="flex h-dvh w-full max-w-full flex-col overflow-hidden bg-background md:flex-row">
      <div className="md:hidden flex w-full items-center justify-between p-4 bg-card border-b shadow-sm sticky top-0 z-50">
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

      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <div className="hidden h-full w-64 shrink-0 md:block">
        <EnhancedAdminSidebar activeTab={tab} setActiveTab={setTab} />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-50 h-full w-64 max-w-[85vw] overflow-hidden transition-transform duration-200 ease-in-out md:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <EnhancedAdminSidebar activeTab={tab} setActiveTab={setTab} onClose={closeMobileSidebar} />
      </div>

      <main className="admin-content-scroll min-h-0 min-w-0 flex-1 overflow-y-scroll">
        <div className="overflow-x-hidden p-4 pb-8 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
} 
