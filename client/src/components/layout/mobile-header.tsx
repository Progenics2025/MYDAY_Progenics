import { Menu, Bell, Settings, LogOut, Briefcase } from "lucide-react";
import LogoutConfirm from "@/components/LogoutConfirm";
import { useAuthState } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface MobileHeaderProps {
  onMenuClick: () => void;
  title: string;
}

export default function MobileHeader({ onMenuClick, title }: MobileHeaderProps) {
  const { user } = useAuthState();
  const { employee } = useAuthState();

  // Logout handled by centralized `logout` via LogoutConfirm

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                myDay
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              3
            </span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                {employee?.profilePhotoUrl ? (
                  <img src={employee.profilePhotoUrl} alt="profile" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                    </span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{getGreeting()}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.name || 'User'}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <LogoutConfirm
                trigger={
                  <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Title Section */}
      <div className="mt-3">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!</p>
      </div>
    </header>
  );
}
