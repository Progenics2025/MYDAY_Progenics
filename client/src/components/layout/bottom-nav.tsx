import { BarChart3, Users, Clock, UserCircle } from "lucide-react";
import { useAuthState } from "@/lib/auth";

interface BottomNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function BottomNav({ activeSection, onSectionChange }: BottomNavProps) {
  const { user } = useAuthState();

  const getAllNavItems = () => [
    { id: "dashboard", label: "Home", icon: BarChart3, roles: ["admin", "manager", "employee"] },
    { id: "employees", label: "Team", icon: Users, roles: ["admin", "manager"] },
    { id: "attendance", label: "Attendance", icon: Clock, roles: ["admin", "manager", "employee"] },
    { id: "payroll", label: "Payroll", icon: undefined, roles: ["admin", "manager", "hr"] },
    { id: "expenses", label: "Expenses", icon: undefined, roles: ["admin", "manager", "employee"] },
    { id: "profile", label: "Profile", icon: UserCircle, roles: ["manager", "employee"] },
  ];

  // Filter nav items based on user role
  const mainNavItems = getAllNavItems().filter(item =>
    item.roles.includes(user?.role || "employee")
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-padding-bottom z-40">
      <nav className="flex justify-around items-center h-16 px-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon as any;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1 ${isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
            >
              {item.icon ? (
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
              ) : (
                <span className={`mb-1 ${isActive ? 'text-blue-600 text-base' : 'text-gray-600 text-base'}`}>₹</span>
              )}
              <span className={`text-xs font-medium truncate ${isActive ? 'text-blue-600' : 'text-gray-600'
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
