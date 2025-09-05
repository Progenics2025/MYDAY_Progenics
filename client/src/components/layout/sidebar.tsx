import { Users, BarChart3, Clock, DollarSign, TrendingUp, LogOut, MapPin, Receipt, Calendar, FileText, UserCircle, Briefcase, Building2 } from "lucide-react";
import { useAuthState } from "@/lib/auth";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeSection, onSectionChange, isOpen, onClose }: SidebarProps) {
  const { user } = useAuthState();

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.reload();
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "employees", label: "Employees", icon: Users },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "payroll", label: "Payroll", icon: DollarSign },
    { id: "expenses", label: "Expenses", icon: Receipt },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "profile", label: "Profile", icon: UserCircle },
    { id: "reports", label: "Reports", icon: TrendingUp },
  ];

  return (
    <div className={`bg-card border-r border-border w-64 flex-shrink-0 sidebar-transition md:translate-x-0 ${isOpen ? '' : 'sidebar-hidden'} md:sidebar-visible fixed md:relative z-30 h-full`}>
      <div className="p-6 border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Briefcase className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">myDay</h1>
            <div className="flex items-center text-xs text-muted-foreground">
              <Building2 className="w-3 h-3 mr-1" />
              <span>Progenics Lab</span>
            </div>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onSectionChange(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    isActive 
                      ? 'bg-accent text-foreground' 
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <span className="text-secondary-foreground text-sm font-medium">
              {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground">{user?.role || 'Employee'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
