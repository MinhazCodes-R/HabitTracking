import { Home, Calendar, BarChart3, User } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export function BottomNav() {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="max-w-md mx-auto flex items-center justify-around px-6 py-4">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-1 min-w-[64px]"
            >
              <Icon 
                className={`w-6 h-6 ${isActive ? 'text-white' : 'text-muted-foreground'}`} 
              />
              <span 
                className={`text-xs ${isActive ? 'text-white' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
