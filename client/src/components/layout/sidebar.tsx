import { Users, BarChart3, Clock, DollarSign, TrendingUp, LogOut, MapPin, Calendar, FileText, UserCircle, Briefcase, Building2, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthState } from "@/lib/auth";
import { useState } from "react";
import LogoutModal from "@/components/modals/LogoutModal";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeSection, onSectionChange, isOpen, onClose }: SidebarProps) {
  const { user, employee, logout } = useAuthState();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Define menu items based on user role
  const getAllMenuItems = () => [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, roles: ["admin", "manager", "employee"] },
    { id: "employees", label: "Team", icon: Users, roles: ["admin", "hr", "manager"] },
    { id: "attendance", label: "Attendance", icon: Clock, roles: ["admin", "manager", "employee"] },
    { id: "field-tracking", label: "Field Tracking", icon: MapPin, roles: ["admin", "manager"] },
    { id: "payroll", label: "Payroll", icon: DollarSign, roles: ["admin", "hr"] },
    { id: "expenses", label: "Expenses", icon: ReceiptIcon, roles: ["admin", "manager", "employee"] },
    { id: "leave", label: "Leave", icon: Calendar, roles: ["admin", "manager", "employee"] },
    { id: "holiday", label: "Holidays", icon: Calendar, roles: ["admin", "manager", "employee"] },
    { id: "documents", label: "Documents", icon: FileText, roles: ["admin", "manager"] },
    { id: "reports", label: "Reports", icon: TrendingUp, roles: ["admin", "manager"] },
  ];

  // Helper for icons
  const ReceiptIcon = (props: any) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17V7" />
    </svg>
  )

  // Filter menu items based on user role and employee department
  const menuItems = getAllMenuItems().filter(item => {
    // Special-case Employees and Payroll: allow admin or HR managers
    if (item.id === 'payroll') {
      if (user?.role === 'admin') return true;
      if (user?.role === 'hr') return true;
      if (user?.role === 'manager' && employee?.department === 'HR') return true;
      return false;
    }
    return item.roles.includes((user?.role || 'employee'));
  });

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <>
      <div
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 transition-all duration-300 ease-in-out md:relative z-auto h-full flex flex-col shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3 w-full">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 flex-shrink-0">
              <Briefcase className="text-white w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent tracking-tight">myDay</h1>
                <div className="flex items-center text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  <Building2 className="w-3 h-3 mr-1" />
                  <span>Progenics</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon === ReceiptIcon ? ReceiptIcon : item.icon as any;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  if (window.innerWidth < 768) onClose();
                }}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full" />
                )}
                <div className={cn(
                  "p-1 rounded-lg transition-colors",
                  isActive ? "bg-transparent" : "group-hover:bg-slate-100 dark:group-hover:bg-slate-700"
                )}>
                  <Icon className={cn(
                    "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                  )} />
                </div>
                {!isCollapsed && (
                  <span className="text-sm truncate animate-in fade-in duration-300">{item.label}</span>
                )}
                {!isCollapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button
            onClick={() => {
              onSectionChange('profile');
              if (window.innerWidth < 768) onClose();
            }}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group hover:bg-slate-50 dark:hover:bg-slate-800",
              activeSection === 'profile' && "bg-slate-100 dark:bg-slate-800"
            )}
            title={isCollapsed ? "Profile" : undefined}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center shadow-sm text-white font-bold text-sm ring-2 ring-white dark:ring-slate-900">
              {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left animate-in fade-in duration-300">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{user?.role || 'Employee'}</p>
              </div>
            )}
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400",
              isCollapsed && "justify-center"
            )}
            title="Logout"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span className="text-sm font-medium animate-in fade-in duration-300">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle (Desktop only) */}
        <div className="hidden md:flex absolute -right-3 top-24">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform text-slate-500"
          >
            {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </div>
      </div>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
