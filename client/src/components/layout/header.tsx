import { Menu, Bell, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export default function Header({ title, onMenuToggle }: HeaderProps) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={onMenuToggle}
            data-testid="button-menu-toggle"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">
              {title === 'Dashboard' 
                ? 'Welcome back, monitor your team\'s performance'
                : `Manage your ${title.toLowerCase()}`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="relative text-muted-foreground hover:text-foreground"
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-xs"></span>
          </Button>
          <div className="flex items-center space-x-2 bg-accent px-3 py-1 rounded-md">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground" data-testid="text-current-date">{currentDate}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
