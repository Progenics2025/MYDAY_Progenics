import { Menu, Calendar, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { useAuthState } from '@/lib/auth';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export default function Header({ title, onMenuToggle }: HeaderProps) {
  const { user, employee } = useAuthState();
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-20 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            onClick={onMenuToggle}
            data-testid="button-menu-toggle"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
              {title === 'Dashboard'
                ? 'Welcome back, here\'s what\'s happening today.'
                : `Manage your ${title.toLowerCase()} efficiently.`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="hidden lg:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300" data-testid="text-current-date">{currentDate}</span>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <NotificationDropdown />

          <div className="pl-2">
            {employee?.profilePhotoUrl ? (
              <img
                src={employee.profilePhotoUrl || undefined}
                alt="profile"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-md hover:ring-indigo-500 transition-all duration-200 cursor-pointer"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-slate-800 hover:ring-indigo-500 transition-all duration-200 cursor-pointer">
                {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
