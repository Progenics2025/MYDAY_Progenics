import { BarChart3, Users, Clock, DollarSign, UserCircle } from "lucide-react";

interface BottomNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function BottomNav({ activeSection, onSectionChange }: BottomNavProps) {
  const mainNavItems = [
    { id: "dashboard", label: "Home", icon: BarChart3 },
    { id: "employees", label: "Team", icon: Users },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "payroll", label: "Payroll", icon: DollarSign },
    { id: "profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-padding-bottom">
      <nav className="flex justify-around items-center h-16 px-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
              <span className={`text-xs font-medium truncate ${
                isActive ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
