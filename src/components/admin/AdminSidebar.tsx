
import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Car, 
  Calendar, 
  Users, 
  FileText, 
  CreditCard, 
  Receipt, 
  Fuel, 
  Wallet, 
  User,
  ChevronDown,
  BookOpen,
  Settings,
  Wrench
} from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle"; // This will now correctly point to our component
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminSidebarProps = {
  activeTab?: string;
  setActiveTab?: React.Dispatch<React.SetStateAction<string>>;
}

export const AdminSidebar = ({ activeTab = 'dashboard', setActiveTab }: AdminSidebarProps) => {
  const handleTabClick = (tab: string) => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', href: '/admin' },
    { id: 'payments', icon: <CreditCard size={20} />, label: 'Payments', href: '/admin/payments' },
    { id: 'expenses', icon: <Receipt size={20} />, label: 'Expenses', href: '/admin/expenses' },
    { id: 'ledger', icon: <Wallet size={20} />, label: 'Ledger', href: '/admin/ledger' },
  ];

  return (
    <div className="h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Admin Panel</h1>
          <ModeToggle />
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link 
            key={item.id}
            to={item.href}
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === item.id 
                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" 
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
            )}
            onClick={() => handleTabClick(item.id)}
          >
            <span className="mr-3">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <User size={16} className="text-gray-600 dark:text-gray-300" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-800 dark:text-white">Admin User</p>
          </div>
        </div>
      </div>
    </div>
  );
};
